import { NextRequest } from "next/server";
import type { AgentDiscussion, A2AMessage, AgentIdentity } from "@/types/a2a";
import { createHederaSettlement } from "@/lib/hedera-settlement";
import { sendA2ARequest, StartTaskParams, A2ATask } from "@/lib/a2a-protocol";

export const runtime = "nodejs";

/**
 * Generates a simple agent identity
 */
function generateAgentIdentity(
  id: string,
  name: string,
  role: string
): AgentIdentity {
  return {
    id,
    did: `did:agentic:${id}`,
    publicKey: `0x${Math.random().toString(16).substring(2, 18)}`,
    name,
    role,
  };
}

function extractConfidence(text: string): number | undefined {
  const patterns: Array<{ pattern: RegExp; isPercentage: boolean }> = [
    { pattern: /confidence[:\s]+([0-9]*\.?[0-9]+)/i, isPercentage: false },
    { pattern: /([0-9]*\.?[0-9]+)\s*\/\s*1\b/, isPercentage: false },
    { pattern: /([0-9]*\.?[0-9]+)%/, isPercentage: true },
    { pattern: /\b(0\.[0-9]+)\b/, isPercentage: false },
    { pattern: /\b(1\.0)\b/, isPercentage: false },
  ];

  for (const { pattern, isPercentage } of patterns) {
    const match = text.match(pattern);
    if (match) {
      let value = parseFloat(match[1]);
      // If it's a percentage pattern, convert to decimal
      if (isPercentage) {
        value = value / 100;
      }
      // Ensure it's between 0 and 1
      if (value >= 0 && value <= 1) {
        return Math.round(value * 100) / 100; // Round to 2 decimal places
      }
    }
  }

  return undefined;
}

/**
 * Creates an A2A message
 */
function createA2AMessage(
  from: string,
  to: string,
  type: A2AMessage["type"],
  content: string,
  claimId?: string,
  metadata?: A2AMessage["metadata"]
): A2AMessage {
  return {
    from,
    to,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    claimId,
    type,
    content,
    metadata,
  };
}

/**
 * Waits for a task to complete and returns the result
 */
async function waitForTaskCompletion(
  agentUrl: string,
  taskId: string,
  maxAttempts: number = 15
): Promise<string | null> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const statusResponse = await sendA2ARequest(agentUrl, "GetTaskStatus", {
      taskId,
    });

    if (statusResponse.error) {
      return null;
    }

    const task = statusResponse.result as A2ATask;
    if (task.status === "completed" && task.result?.artifacts?.[0]) {
      return task.result.artifacts[0].content as string;
    } else if (task.status === "failed") {
      return null;
    }

    attempts++;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Get request body
    const body = await req.json();
    const { url, claim, claimId, relatedArticles } = body;

    if (!url || !claim) {
      return Response.json(
        {
          discussion: {} as AgentDiscussion,
          error: "URL and claim are required",
        },
        { status: 400 }
      );
    }

    // Create a streaming response using Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (type: string, data: unknown) => {
          const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Get base URL for agent endpoints
          const baseUrl = `${req.nextUrl.origin}/api/agents`;

          // Initialize primary agent (the original agent) with main URL
          const primaryAgentId = `agent_primary_${Date.now()}`;
          const primaryAgentUrl = `${baseUrl}/${primaryAgentId}`;
          const primaryAgent = generateAgentIdentity(
            primaryAgentId,
            "Primary Agent",
            "Document Analyzer"
          );
          primaryAgent.sourceUrl = url;

          // Initialize peer agents from all related articles
          const peerAgents: AgentIdentity[] = [];
          const peerAgentEndpoints: Array<{
            agent: AgentIdentity;
            url: string;
          }> = [];

          const relatedArticlesList =
            relatedArticles && Array.isArray(relatedArticles)
              ? relatedArticles
              : [];

          // Create a peer agent for each related article (up to 5)
          for (let i = 0; i < Math.min(relatedArticlesList.length, 5); i++) {
            const article = relatedArticlesList[i];
            const articleUrl = article.url || url;
            const peerAgentId = `agent_peer_${i + 1}_${Date.now()}`;
            const peerAgentEndpointUrl = `${baseUrl}/${peerAgentId}`;
            const peerAgent = generateAgentIdentity(
              peerAgentId,
              `Peer Reviewer ${i + 1}`,
              "Independent Validator"
            );
            peerAgent.sourceUrl = articleUrl;
            peerAgents.push(peerAgent);
            peerAgentEndpoints.push({
              agent: peerAgent,
              url: peerAgentEndpointUrl,
            });
          }

          // If no related articles, create one peer agent with the main URL
          if (peerAgents.length === 0) {
            const peerAgentId = `agent_peer_${Date.now()}`;
            const peerAgentEndpointUrl = `${baseUrl}/${peerAgentId}`;
            const peerAgent = generateAgentIdentity(
              peerAgentId,
              "Peer Reviewer",
              "Independent Validator"
            );
            peerAgent.sourceUrl = url;
            peerAgents.push(peerAgent);
            peerAgentEndpoints.push({
              agent: peerAgent,
              url: peerAgentEndpointUrl,
            });
          }

          const allAgents = [primaryAgent, ...peerAgents];

          // Send initial discussion setup
          sendEvent("init", {
            claimId: claimId || "unknown",
            claim,
            agents: allAgents,
          });

          // Initialize all agents by fetching their agent cards
          sendEvent("status", { message: "Initializing agents..." });
          await fetch(
            `${primaryAgentUrl}?sourceUrl=${encodeURIComponent(url)}`
          );
          await Promise.all(
            peerAgentEndpoints.map(({ agent, url: endpointUrl }) =>
              fetch(
                `${endpointUrl}?sourceUrl=${encodeURIComponent(
                  agent.sourceUrl || url
                )}`
              )
            )
          );

          const messages: A2AMessage[] = [];

          // Step 1: Conduct separate discussions between primary and each peer agent
          sendEvent("status", {
            message: `Starting separate discussions with ${peerAgents.length} peer agent(s)...`,
          });

          interface DiscussionResult {
            agentId: string;
            confidence: number;
            messages: A2AMessage[];
          }

          // Run separate discussions in parallel
          const discussionResults: DiscussionResult[] = await Promise.all(
            peerAgentEndpoints.map(async ({ agent, url: endpointUrl }) => {
              const discussionMessages: A2AMessage[] = [];
              let finalConfidence = 0.5; // Default confidence

              // Initial query from primary
              const queryMessage = `Can you review this claim: "${claim}"?`;
              const queryMsg = createA2AMessage(
                primaryAgentId,
                agent.id,
                "query",
                queryMessage,
                claimId
              );
              discussionMessages.push(queryMsg);
              messages.push(queryMsg);
              sendEvent("message", queryMsg);

              // Peer agent's initial review
              const reviewTaskParams: StartTaskParams = {
                taskType: "claim_review",
                input: {
                  modality: "text",
                  content: claim,
                },
                metadata: {
                  sourceUrl: agent.sourceUrl || url,
                  claimId,
                },
              };

              const reviewTaskResponse = await sendA2ARequest(
                endpointUrl,
                "StartTask",
                reviewTaskParams
              );

              if (reviewTaskResponse.error) {
                return {
                  agentId: agent.id,
                  confidence: 0.5,
                  messages: discussionMessages,
                };
              }

              interface TaskStartResult {
                taskId: string;
                status: string;
              }

              const reviewTaskId = (
                reviewTaskResponse.result as TaskStartResult
              )?.taskId;
              if (!reviewTaskId) {
                return {
                  agentId: agent.id,
                  confidence: 0.5,
                  messages: discussionMessages,
                };
              }

              const initialReview = await waitForTaskCompletion(
                endpointUrl,
                reviewTaskId
              );
              let currentConfidence = initialReview
                ? extractConfidence(initialReview) || 0.5
                : 0.5;

              if (initialReview) {
                const reviewMsg = createA2AMessage(
                  agent.id,
                  primaryAgentId,
                  "response",
                  initialReview,
                  claimId,
                  {
                    confidence: currentConfidence,
                  }
                );
                discussionMessages.push(reviewMsg);
                messages.push(reviewMsg);
                sendEvent("message", reviewMsg);
              }

              // Primary agent asks follow-up question based on this specific review
              const followUpPrompt = `Claim: "${claim}"

Peer Review:
${initialReview || "No review provided"}

Prepare 1-2 VERY BRIEF questions (1 sentence each max). Focus on key points.`;

              const followUpTaskParams: StartTaskParams = {
                taskType: "claim_validation",
                input: {
                  modality: "text",
                  content: followUpPrompt,
                },
                metadata: {
                  sourceUrl: url,
                  claimId,
                },
              };

              const followUpTaskResponse = await sendA2ARequest(
                primaryAgentUrl,
                "StartTask",
                followUpTaskParams
              );

              let followUpQuestions = "";
              if (!followUpTaskResponse.error) {
                const followUpTaskId = (
                  followUpTaskResponse.result as TaskStartResult
                )?.taskId;
                if (followUpTaskId) {
                  const result = await waitForTaskCompletion(
                    primaryAgentUrl,
                    followUpTaskId
                  );
                  if (result) {
                    followUpQuestions = result;
                  }
                }
              }

              // Send follow-up question to this peer
              if (followUpQuestions) {
                const followUpMsg = createA2AMessage(
                  primaryAgentId,
                  agent.id,
                  "proposal",
                  followUpQuestions,
                  claimId
                );
                discussionMessages.push(followUpMsg);
                messages.push(followUpMsg);
                sendEvent("message", followUpMsg);

                // Peer responds to follow-up
                const debatePrompt = `Claim: "${claim}"

Primary agent's questions:
${followUpQuestions}

Respond in 1 sentence max. Be direct and concise.`;

                const debateTaskParams: StartTaskParams = {
                  taskType: "claim_review",
                  input: {
                    modality: "text",
                    content: debatePrompt,
                  },
                  metadata: {
                    sourceUrl: agent.sourceUrl || url,
                    claimId,
                  },
                };

                const debateTaskResponse = await sendA2ARequest(
                  endpointUrl,
                  "StartTask",
                  debateTaskParams
                );

                if (!debateTaskResponse.error) {
                  const debateTaskId = (
                    debateTaskResponse.result as TaskStartResult
                  )?.taskId;
                  if (debateTaskId) {
                    const debateResponse = await waitForTaskCompletion(
                      endpointUrl,
                      debateTaskId
                    );
                    const debateConfidence = debateResponse
                      ? extractConfidence(debateResponse) || currentConfidence
                      : currentConfidence;
                    currentConfidence = debateConfidence;

                    if (debateResponse) {
                      const debateMsg = createA2AMessage(
                        agent.id,
                        primaryAgentId,
                        "response",
                        debateResponse,
                        claimId,
                        {
                          confidence: debateConfidence,
                        }
                      );
                      discussionMessages.push(debateMsg);
                      messages.push(debateMsg);
                      sendEvent("message", debateMsg);
                    }
                  }
                }
              }

              // Final conclusion for this discussion
              const conclusionPrompt = `Claim: "${claim}"

Discussion summary:
- Initial review: ${initialReview || "N/A"}
${
  followUpQuestions
    ? `- Follow-up: ${followUpQuestions}\n- Response: ${
        discussionMessages.find(
          (m) =>
            m.from === agent.id &&
            m.type === "response" &&
            m.content !== initialReview
        )?.content || "N/A"
      }`
    : ""
}

Provide final assessment (1 sentence max) with confidence (0-1).`;

              const conclusionTaskParams: StartTaskParams = {
                taskType: "claim_validation",
                input: {
                  modality: "text",
                  content: conclusionPrompt,
                },
                metadata: {
                  sourceUrl: url,
                  claimId,
                },
              };

              const conclusionTaskResponse = await sendA2ARequest(
                primaryAgentUrl,
                "StartTask",
                conclusionTaskParams
              );

              if (!conclusionTaskResponse.error) {
                const conclusionTaskId = (
                  conclusionTaskResponse.result as TaskStartResult
                )?.taskId;
                if (conclusionTaskId) {
                  const conclusion = await waitForTaskCompletion(
                    primaryAgentUrl,
                    conclusionTaskId
                  );
                  const conclusionConfidence = conclusion
                    ? extractConfidence(conclusion) || currentConfidence
                    : currentConfidence;
                  finalConfidence = conclusionConfidence;

                  if (conclusion) {
                    const conclusionMsg = createA2AMessage(
                      primaryAgentId,
                      agent.id,
                      "agreement",
                      conclusion,
                      claimId,
                      {
                        confidence: conclusionConfidence,
                      }
                    );
                    discussionMessages.push(conclusionMsg);
                    messages.push(conclusionMsg);
                    sendEvent("message", conclusionMsg);
                  }
                }
              }

              return {
                agentId: agent.id,
                confidence: finalConfidence,
                messages: discussionMessages,
              };
            })
          );

          // Step 2: Calculate final confidence as mean of all individual discussion confidences
          sendEvent("status", {
            message: "Calculating final confidence from all discussions...",
          });

          // Calculate mean confidence from all separate discussions
          const confidences = discussionResults.map((r) => r.confidence);
          const averageConfidence =
            confidences.length > 0
              ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
              : 0.5;

          // Determine overall agreement status based on average confidence
          let agreementText = "partial";
          if (averageConfidence >= 0.7) {
            agreementText = "agreed";
          } else if (averageConfidence <= 0.3) {
            agreementText = "disagreed";
          } else {
            agreementText = "partial";
          }

          const isAgreed = agreementText.toLowerCase().includes("agreed");
          const isDisagreed = agreementText.toLowerCase().includes("disagreed");

          let finalStatus: "agreed" | "disagreed" | "partial" = "partial";
          if (isAgreed) finalStatus = "agreed";
          else if (isDisagreed) finalStatus = "disagreed";

          // Send final synthesis message with mean confidence
          const synthesisText = `Final assessment: ${agreementText}. Mean confidence from ${
            discussionResults.length
          } discussion(s): ${(averageConfidence * 100).toFixed(0)}%`;
          const synthesisMsg = createA2AMessage(
            primaryAgentId,
            "all",
            isAgreed ? "agreement" : isDisagreed ? "disagreement" : "proposal",
            synthesisText,
            claimId,
            {
              agreementLevel: isAgreed
                ? "strong"
                : isDisagreed
                ? "none"
                : "moderate",
              confidence: averageConfidence,
            }
          );
          messages.push(synthesisMsg);
          sendEvent("message", synthesisMsg);

          // Step 3: Generate settlement proposal (for Hedera)
          sendEvent("status", { message: "Generating settlement proposal..." });

          // Use the first peer agent for settlement
          const settlementAgent = peerAgentEndpoints[0];
          const settlementTaskParams: StartTaskParams = {
            taskType: "settlement_proposal",
            input: {
              modality: "text",
              content: claim,
            },
            metadata: {
              sourceUrl: settlementAgent.agent.sourceUrl || url,
              claimId,
            },
          };

          const settlementTaskResponse = await sendA2ARequest(
            settlementAgent.url,
            "StartTask",
            settlementTaskParams
          );

          let settlementStatement = "Settlement proposal generated.";
          if (!settlementTaskResponse.error) {
            interface TaskStartResult {
              taskId: string;
              status: string;
            }
            const settlementTaskId = (
              settlementTaskResponse.result as TaskStartResult
            )?.taskId;
            if (settlementTaskId) {
              const result = await waitForTaskCompletion(
                settlementAgent.url,
                settlementTaskId
              );
              if (result) {
                settlementStatement = result;
              }
            }
          }

          sendEvent("status", { message: "Recording settlement on Hedera..." });

          const allAgentIds = [primaryAgentId, ...peerAgents.map((a) => a.id)];
          const settlementResult = await createHederaSettlement({
            claimId: claimId || "unknown",
            agents: allAgentIds,
            agreement: finalStatus,
            timestamp: Date.now(),
            settlementStatement,
          });

          if (settlementResult.success) {
            console.log(
              `Hedera settlement created successfully: ${settlementResult.transactionHash}`,
              settlementResult
            );
          } else {
            console.error(
              `Hedera settlement failed: ${settlementResult.error}`
            );
          }

          const settlementMsg = createA2AMessage(
            settlementAgent.agent.id,
            primaryAgentId,
            "settlement",
            settlementStatement,
            claimId,
            {
              ...(settlementResult.success && {
                settlementHash:
                  settlementResult.transactionHash ||
                  settlementResult.transactionId,
                topicId: settlementResult.topicId,
                transactionId: settlementResult.transactionId,
              }),
              ...(!settlementResult.success && {
                settlementError: settlementResult.error,
              }),
            }
          );
          messages.push(settlementMsg);
          sendEvent("message", settlementMsg);

          // Final confidence is the mean of all individual discussion confidences
          const finalConfidence = averageConfidence;

          // Send final agreement
          const finalAgreement = {
            status: finalStatus,
            confidence: finalConfidence,
            settlementHash: settlementMsg.metadata?.settlementHash,
            settlementError: settlementMsg.metadata?.settlementError,
          };

          sendEvent("final", finalAgreement);
          controller.close();
        } catch (error) {
          console.error("Error in agent discussion:", error);
          sendEvent("error", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error setting up agent discussion:", error);
    return Response.json(
      {
        discussion: {} as AgentDiscussion,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
