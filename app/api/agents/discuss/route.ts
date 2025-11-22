import { initializeAgent } from "@/server/initialize-agent";
import { NextRequest } from "next/server";
import type { AgentDiscussion, A2AMessage, AgentIdentity } from "@/types/a2a";

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
    const { url, claim, claimId } = body;

    if (!url || !claim) {
      return Response.json(
        {
          discussion: {} as AgentDiscussion,
          error: "URL and claim are required",
        },
        { status: 400 }
      );
    }

    // Initialize primary agent (the original agent)
    const primaryAgentId = "agent_primary";
    const primaryAgent = generateAgentIdentity(
      primaryAgentId,
      "Primary Agent",
      "Document Analyzer"
    );

    // Initialize peer agent (second opinion)
    const peerAgentId = "agent_peer";
    const peerAgent = generateAgentIdentity(
      peerAgentId,
      "Peer Reviewer",
      "Independent Validator"
    );

    const primaryExecutor = await initializeAgent(userAccountId, url);
    const peerExecutor = await initializeAgent(userAccountId, url);

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
          confidence: 0.75, // This could be extracted from the response
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

    // Determine final agreement status
    let finalStatus: "agreed" | "disagreed" | "partial" = "partial";
    if (isAgreed) finalStatus = "agreed";
    else if (isDisagreed) finalStatus = "disagreed";

    // Add agreement/disagreement message
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

    messages.push(
      createA2AMessage(
        peerAgentId,
        primaryAgentId,
        "settlement",
        settlementResponse.output ?? "Settlement proposal generated.",
        claimId,
        {
          // In production, this would contain actual Hedera transaction hash
          settlementHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        }
      )
    );

    // Build discussion object
    const discussion: AgentDiscussion = {
      claimId: claimId || "unknown",
      claim,
      agents: [primaryAgent, peerAgent],
      messages,
      finalAgreement: {
        status: finalStatus,
        confidence: 0.75,
        settlementHash: messages[messages.length - 1].metadata?.settlementHash,
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
