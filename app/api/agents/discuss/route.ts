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
  maxAttempts: number = 10
): Promise<string | null> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 500));
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

          // Step 1: Primary agent queries all peer agents about the claim
          sendEvent("status", {
            message: `Querying ${peerAgents.length} peer agent(s) about the claim...`,
          });

          const queryMessage = `Can you review this claim: "${claim}"?`;

          // Send query to all peer agents
          for (const peerAgent of peerAgents) {
            const queryMsg = createA2AMessage(
              primaryAgentId,
              peerAgent.id,
              "query",
              queryMessage,
              claimId
            );
            messages.push(queryMsg);
            sendEvent("message", queryMsg);
          }

          // Start review tasks for all peer agents in parallel
          interface PeerReviewResult {
            agentId: string;
            review: string;
            confidence?: number;
          }

          const reviewResults: PeerReviewResult[] = [];

          await Promise.all(
            peerAgentEndpoints.map(async ({ agent, url: endpointUrl }) => {
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
                reviewResults.push({
                  agentId: agent.id,
                  review: "Unable to provide review.",
                });
                return;
              }

              interface TaskStartResult {
                taskId: string;
                status: string;
              }

              const taskId = (reviewTaskResponse.result as TaskStartResult)
                ?.taskId;
              if (!taskId) {
                reviewResults.push({
                  agentId: agent.id,
                  review: "Unable to provide review.",
                });
                return;
              }

              const review = await waitForTaskCompletion(endpointUrl, taskId);
              const confidence = review ? extractConfidence(review) : undefined;

              reviewResults.push({
                agentId: agent.id,
                review: review || "Unable to provide review.",
                confidence,
              });

              // Send response message
              const responseMsg = createA2AMessage(
                agent.id,
                primaryAgentId,
                "response",
                review || "Unable to provide review.",
                claimId,
                {
                  confidence,
                }
              );
              messages.push(responseMsg);
              sendEvent("message", responseMsg);
            })
          );

          // Step 2: Primary agent responds to reviews and asks follow-up questions
          sendEvent("status", {
            message:
              "Primary agent is analyzing peer reviews and preparing follow-up questions...",
          });

          const allReviews = reviewResults.map((r) => r.review).join("\n\n");
          const confidences = reviewResults
            .map((r) => r.confidence)
            .filter((c): c is number => c !== undefined);

          // Primary agent prepares follow-up questions based on reviews
          const followUpPrompt = `Claim: "${claim}"

Peer Reviews:
${allReviews}

Based on these reviews, prepare 1-2 VERY BRIEF follow-up questions or points for debate. Focus on areas where there might be disagreement. Be extremely concise (1 sentence per question max).`;

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
            interface TaskStartResult {
              taskId: string;
              status: string;
            }
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

          // Send follow-up questions to all peer agents
          if (followUpQuestions) {
            sendEvent("status", {
              message:
                "Primary agent is raising follow-up questions for debate...",
            });

            for (const peerAgent of peerAgents) {
              const followUpMsg = createA2AMessage(
                primaryAgentId,
                peerAgent.id,
                "proposal",
                followUpQuestions,
                claimId
              );
              messages.push(followUpMsg);
              sendEvent("message", followUpMsg);
            }

            // Step 3: Peer agents respond to follow-up questions
            sendEvent("status", {
              message: "Peer agents are responding to follow-up questions...",
            });

            const debateResults: Array<{
              agentId: string;
              response: string;
              confidence?: number;
            }> = [];

            await Promise.all(
              peerAgentEndpoints.map(async ({ agent, url: endpointUrl }) => {
                const debatePrompt = `Claim: "${claim}"

Your initial review was already provided. Now, the primary agent has raised these follow-up questions:

${followUpQuestions}

Please respond VERY BRIEFLY (1 sentence max). You can:
- Clarify your position
- Provide key evidence
- Challenge or support viewpoints

Be extremely concise.`;

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

                if (debateTaskResponse.error) {
                  return;
                }

                interface TaskStartResult {
                  taskId: string;
                  status: string;
                }
                const taskId = (debateTaskResponse.result as TaskStartResult)
                  ?.taskId;
                if (!taskId) {
                  return;
                }

                const response = await waitForTaskCompletion(
                  endpointUrl,
                  taskId
                );
                const confidence = response
                  ? extractConfidence(response)
                  : undefined;

                if (response) {
                  debateResults.push({
                    agentId: agent.id,
                    response,
                    confidence,
                  });

                  // Update confidence if provided
                  const existingResult = reviewResults.find(
                    (r) => r.agentId === agent.id
                  );
                  if (existingResult && confidence !== undefined) {
                    existingResult.confidence = confidence;
                  }

                  // Send debate response message
                  const debateMsg = createA2AMessage(
                    agent.id,
                    primaryAgentId,
                    "response",
                    response,
                    claimId,
                    {
                      confidence,
                    }
                  );
                  messages.push(debateMsg);
                  sendEvent("message", debateMsg);
                }
              })
            );

            // Step 4: Optional - Peer agents can also respond to each other
            if (debateResults.length > 1) {
              sendEvent("status", {
                message: "Agents are considering each other's viewpoints...",
              });

              // Let each peer agent see other peers' responses and provide final thoughts
              for (let i = 0; i < peerAgentEndpoints.length; i++) {
                const { agent, url: endpointUrl } = peerAgentEndpoints[i];
                const otherResponses = debateResults
                  .filter((r) => r.agentId !== agent.id)
                  .map((r) => {
                    const peerName =
                      peerAgents.find((a) => a.id === r.agentId)?.name ||
                      "Peer";
                    return `${peerName}: ${r.response}`;
                  })
                  .join("\n\n");

                if (otherResponses) {
                  const crossDebatePrompt = `Claim: "${claim}"

Other peer agents have responded:
${otherResponses}

Provide a VERY brief final thought (1 sentence max) considering these viewpoints. You can agree, disagree, or add nuance.`;

                  const crossDebateTaskParams: StartTaskParams = {
                    taskType: "claim_review",
                    input: {
                      modality: "text",
                      content: crossDebatePrompt,
                    },
                    metadata: {
                      sourceUrl: agent.sourceUrl || url,
                      claimId,
                    },
                  };

                  const crossDebateResponse = await sendA2ARequest(
                    endpointUrl,
                    "StartTask",
                    crossDebateTaskParams
                  );

                  if (!crossDebateResponse.error) {
                    interface TaskStartResult {
                      taskId: string;
                      status: string;
                    }
                    const taskId = (
                      crossDebateResponse.result as TaskStartResult
                    )?.taskId;
                    if (taskId) {
                      const result = await waitForTaskCompletion(
                        endpointUrl,
                        taskId
                      );
                      if (result) {
                        const finalThoughtMsg = createA2AMessage(
                          agent.id,
                          "all",
                          "proposal",
                          result,
                          claimId
                        );
                        messages.push(finalThoughtMsg);
                        sendEvent("message", finalThoughtMsg);
                      }
                    }
                  }
                }
              }
            }
          }

          // Step 5: Final synthesis after debate
          sendEvent("status", {
            message:
              "Synthesizing all discussions and reaching final agreement...",
          });

          // Collect all reviews and debate responses
          const allDebateResponses = messages
            .filter((m) => m.type === "response" && m.from !== primaryAgentId)
            .map((m) => m.content)
            .join("\n\n");

          // Calculate average confidence from all responses
          const allConfidences = messages
            .filter((m) => m.metadata?.confidence !== undefined)
            .map((m) => m.metadata!.confidence as number);

          const averageConfidence =
            allConfidences.length > 0
              ? allConfidences.reduce((sum, c) => sum + c, 0) /
                allConfidences.length
              : confidences.length > 0
              ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
              : 0.5;

          const synthesisPrompt = `Claim: "${claim}"

Initial Peer Reviews:
${allReviews}

${followUpQuestions ? `Follow-up Discussion:\n${allDebateResponses}\n\n` : ""}

Based on the complete discussion above, provide a VERY BRIEF final synthesis:
- Overall agreement level: "agreed", "disagreed", or "partial"
- Brief explanation (1-2 sentences max)
- Final confidence (0-1)

Be extremely concise.`;

          const synthesisTaskParams: StartTaskParams = {
            taskType: "claim_validation",
            input: {
              modality: "text",
              content: synthesisPrompt,
            },
            metadata: {
              sourceUrl: url,
              claimId,
            },
          };

          const synthesisTaskResponse = await sendA2ARequest(
            primaryAgentUrl,
            "StartTask",
            synthesisTaskParams
          );

          let agreementText = "partial";
          if (!synthesisTaskResponse.error) {
            interface TaskStartResult {
              taskId: string;
              status: string;
            }
            const synthesisTaskId = (
              synthesisTaskResponse.result as TaskStartResult
            )?.taskId;
            if (synthesisTaskId) {
              const result = await waitForTaskCompletion(
                primaryAgentUrl,
                synthesisTaskId
              );
              if (result) {
                agreementText = result;
              }
            }
          }

          const isAgreed = agreementText.toLowerCase().includes("agreed");
          const isDisagreed = agreementText.toLowerCase().includes("disagreed");

          let finalStatus: "agreed" | "disagreed" | "partial" = "partial";
          if (isAgreed) finalStatus = "agreed";
          else if (isDisagreed) finalStatus = "disagreed";

          // Send final synthesis message
          const synthesisMsg = createA2AMessage(
            primaryAgentId,
            "all",
            isAgreed ? "agreement" : isDisagreed ? "disagreement" : "proposal",
            agreementText,
            claimId,
            {
              agreementLevel: isAgreed
                ? "strong"
                : isDisagreed
                ? "none"
                : "moderate",
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

          // Calculate final confidence (average of all peer confidences)
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
