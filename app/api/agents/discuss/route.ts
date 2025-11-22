import { initializeAgent } from "@/server/initialize-agent";
import { NextRequest } from "next/server";
import type { AgentDiscussion, A2AMessage, AgentIdentity } from "@/types/a2a";
import { createHederaSettlement } from "@/lib/hedera-settlement";

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
    const userAccountId = "0.0.7305752";

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
    // Use the first related article if available, otherwise fall back to main URL
    let peerAgentUrl = url;
    if (
      relatedArticles &&
      Array.isArray(relatedArticles) &&
      relatedArticles.length > 0
    ) {
      // Use the first related article URL
      peerAgentUrl = relatedArticles[0].url || url;
    }

    // Initialize primary agent (the original agent) with main URL
    const primaryAgentId = "agent_primary";
    const primaryAgent = generateAgentIdentity(
      primaryAgentId,
      "Primary Agent",
      "Document Analyzer"
    );
    primaryAgent.sourceUrl = url;

    // Initialize peer agent (second opinion) with related article URL
    const peerAgentId = "agent_peer";
    const peerAgent = generateAgentIdentity(
      peerAgentId,
      "Peer Reviewer",
      "Independent Validator"
    );
    peerAgent.sourceUrl = peerAgentUrl;

    const primaryExecutor = await initializeAgent(userAccountId, url);
    const peerExecutor = await initializeAgent(userAccountId, peerAgentUrl);

    const messages: A2AMessage[] = [];

    // Step 1: Primary agent queries peer about the claim
    const queryPrompt = `Review this claim: "${claim}"

Provide a BRIEF assessment (2-3 sentences max):
- Agree or disagree?
- Confidence level (0-1)?
- Key evidence (one sentence)?

Keep it concise and direct.`;

    const peerResponse = await peerExecutor.invoke({
      input: queryPrompt,
    });

    const peerReview = peerResponse.output ?? "Unable to provide review.";

    // Extract confidence from peer review
    const peerConfidence = extractConfidence(peerReview);

    // Create A2A messages
    messages.push(
      createA2AMessage(
        primaryAgentId,
        peerAgentId,
        "query",
        `Can you review this claim: "${claim}"?`,
        claimId
      )
    );

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

    // Step 2: Analyze agreement level
    const agreementPrompt = `Claim: "${claim}"

Peer Review: ${peerReview}

Respond with ONE WORD: "agreed", "disagreed", or "partial". Then ONE SENTENCE explaining why.`;

    const agreementResponse = await primaryExecutor.invoke({
      input: agreementPrompt,
    });

    const agreementText = agreementResponse.output ?? "partial";
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

    // Step 3: Generate settlement proposal (for Hedera)
    const settlementPrompt = `Create a BRIEF settlement statement (one sentence) for: "${claim}"

This will be recorded on Hedera. Be concise.`;

    const settlementResponse = await peerExecutor.invoke({
      input: settlementPrompt,
    });

    const settlementStatement =
      settlementResponse.output ?? "Settlement proposal generated.";

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
