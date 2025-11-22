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

    // Select a related article URL for the peer agent
    const peerArticleUrl =
      relatedArticles &&
      Array.isArray(relatedArticles) &&
      relatedArticles.length > 0
        ? relatedArticles[0].url || url
        : url;

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

    // Initialize peer agent (second opinion) with related article URL
    const peerAgentId = `agent_peer_${Date.now()}`;
    const peerAgentEndpointUrl = `${baseUrl}/${peerAgentId}`;
    const peerAgent = generateAgentIdentity(
      peerAgentId,
      "Peer Reviewer",
      "Independent Validator"
    );
    peerAgent.sourceUrl = peerArticleUrl;

    // Initialize agents by fetching their agent cards (this triggers initialization)
    await fetch(`${primaryAgentUrl}?sourceUrl=${encodeURIComponent(url)}`);
    await fetch(
      `${peerAgentEndpointUrl}?sourceUrl=${encodeURIComponent(peerArticleUrl)}`
    );

    const messages: A2AMessage[] = [];

    // Step 1: Primary agent queries peer about the claim using A2A protocol
    const queryMessage = `Can you review this claim: "${claim}"?`;

    messages.push(
      createA2AMessage(
        primaryAgentId,
        peerAgentId,
        "query",
        queryMessage,
        claimId
      )
    );

    // Use A2A protocol to start a task on peer agent
    const reviewTaskParams: StartTaskParams = {
      taskType: "claim_review",
      input: {
        modality: "text",
        content: claim,
      },
      metadata: {
        sourceUrl: peerArticleUrl,
        claimId,
      },
    };

    const reviewTaskResponse = await sendA2ARequest(
      peerAgentEndpointUrl,
      "StartTask",
      reviewTaskParams
    );

    if (reviewTaskResponse.error) {
      throw new Error(
        `Failed to start review task: ${reviewTaskResponse.error.message}`
      );
    }

    interface TaskStartResult {
      taskId: string;
      status: string;
    }

    const reviewTaskId = (reviewTaskResponse.result as TaskStartResult)?.taskId;
    if (!reviewTaskId) {
      throw new Error("Failed to get review task ID");
    }

    // Wait for task to complete and get result
    let peerReview = "Unable to provide review.";
    let attempts = 0;
    while (attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
      const statusResponse = await sendA2ARequest(
        peerAgentEndpointUrl,
        "GetTaskStatus",
        {
          taskId: reviewTaskId,
        }
      );

      if (statusResponse.error) {
        break;
      }

      const task = statusResponse.result as A2ATask;
      if (task.status === "completed" && task.result?.artifacts?.[0]) {
        peerReview = task.result.artifacts[0].content as string;
        break;
      } else if (task.status === "failed") {
        break;
      }

      attempts++;
    }

    // Extract confidence from peer review
    const peerConfidence = extractConfidence(peerReview);

    messages.push(
      createA2AMessage(
        peerAgentId,
        primaryAgentId,
        "response",
        peerReview,
        claimId,
        {
          confidence: peerConfidence,
        }
      )
    );

    // Step 2: Analyze agreement level using A2A protocol
    const agreementPrompt = `Claim: "${claim}"

Peer Review: ${peerReview}

Respond with ONE WORD: "agreed", "disagreed", or "partial". Then ONE SENTENCE explaining why.`;

    const agreementTaskParams: StartTaskParams = {
      taskType: "claim_validation",
      input: {
        modality: "text",
        content: agreementPrompt,
      },
      metadata: {
        sourceUrl: url,
        claimId,
      },
    };

    const agreementTaskResponse = await sendA2ARequest(
      primaryAgentUrl,
      "StartTask",
      agreementTaskParams
    );

    let agreementText = "partial";
    if (!agreementTaskResponse.error) {
      const agreementTaskId = (agreementTaskResponse.result as TaskStartResult)
        ?.taskId;
      if (agreementTaskId) {
        let attempts = 0;
        while (attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const statusResponse = await sendA2ARequest(
            primaryAgentUrl,
            "GetTaskStatus",
            { taskId: agreementTaskId }
          );

          if (statusResponse.error) {
            break;
          }

          const task = statusResponse.result as A2ATask;
          if (task.status === "completed" && task.result?.artifacts?.[0]) {
            agreementText = task.result.artifacts[0].content as string;
            break;
          } else if (task.status === "failed") {
            break;
          }

          attempts++;
        }
      }
    }

    const isAgreed = agreementText.toLowerCase().includes("agreed");
    const isDisagreed = agreementText.toLowerCase().includes("disagreed");

    let finalStatus: "agreed" | "disagreed" | "partial" = "partial";
    if (isAgreed) finalStatus = "agreed";
    else if (isDisagreed) finalStatus = "disagreed";

    messages.push(
      createA2AMessage(
        primaryAgentId,
        peerAgentId,
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
      )
    );

    // Step 3: Generate settlement proposal (for Hedera) using A2A protocol
    const settlementTaskParams: StartTaskParams = {
      taskType: "settlement_proposal",
      input: {
        modality: "text",
        content: claim,
      },
      metadata: {
        sourceUrl: peerArticleUrl,
        claimId,
      },
    };

    const settlementTaskResponse = await sendA2ARequest(
      peerAgentEndpointUrl,
      "StartTask",
      settlementTaskParams
    );

    let settlementStatement = "Settlement proposal generated.";
    if (!settlementTaskResponse.error) {
      const settlementTaskId = (
        settlementTaskResponse.result as TaskStartResult
      )?.taskId;
      if (settlementTaskId) {
        let attempts = 0;
        while (attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const statusResponse = await sendA2ARequest(
            peerAgentEndpointUrl,
            "GetTaskStatus",
            { taskId: settlementTaskId }
          );

          if (statusResponse.error) {
            break;
          }

          const task = statusResponse.result as A2ATask;
          if (task.status === "completed" && task.result?.artifacts?.[0]) {
            settlementStatement = task.result.artifacts[0].content as string;
            break;
          } else if (task.status === "failed") {
            break;
          }

          attempts++;
        }
      }
    }

    const settlementResult = await createHederaSettlement({
      claimId: claimId || "unknown",
      agents: [primaryAgentId, peerAgentId],
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
      console.error(`Hedera settlement failed: ${settlementResult.error}`);
    }

    messages.push(
      createA2AMessage(
        peerAgentId,
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
          // Include error if settlement failed
          ...(!settlementResult.success && {
            settlementError: settlementResult.error,
          }),
        }
      )
    );

    const settlementMessage = messages[messages.length - 1];

    // Calculate final confidence from peer review or default to 0.5
    // Look for confidence in the peer response message
    const peerResponseMessage = messages.find(
      (msg) => msg.type === "response" && msg.from === peerAgentId
    );
    const finalConfidence =
      peerResponseMessage?.metadata?.confidence ??
      extractConfidence(peerReview) ??
      0.5;

    // Build discussion object
    const discussion: AgentDiscussion = {
      claimId: claimId || "unknown",
      claim,
      agents: [primaryAgent, peerAgent],
      messages,
      finalAgreement: {
        status: finalStatus,
        confidence: finalConfidence,
        settlementHash: settlementMessage.metadata?.settlementHash,
        settlementError: settlementMessage.metadata?.settlementError,
      },
    };

    return Response.json({ discussion });
  } catch (error) {
    console.error("Error in agent discussion:", error);
    return Response.json(
      {
        discussion: {} as AgentDiscussion,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
