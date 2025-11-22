import { initializeAgent } from "@/server/initialize-agent";
import { NextRequest } from "next/server";
import type { AgentDiscussion, A2AMessage, AgentIdentity } from "@/types/a2a";

export const runtime = "nodejs";

type ResponseData = {
  discussion: AgentDiscussion;
  error?: string;
};

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
    const queryPrompt = `A peer agent is asking you to review the following claim extracted from the document: "${claim}"

Please analyze this claim based on the content in your memory. Provide your assessment:
1. Do you agree or disagree with this claim?
2. What is your confidence level (0-1)?
3. What evidence supports or contradicts this claim?

Format your response as a clear, professional peer review.`;

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
    const agreementPrompt = `Based on the peer review, determine if there is agreement on the claim: "${claim}"

Peer Review: ${peerReview}

Respond with one word: "agreed", "disagreed", or "partial". Then provide a brief explanation.`;

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
    const settlementPrompt = `Generate a settlement proposal for the claim: "${claim}"

Based on the discussion, create a brief settlement statement that could be recorded on Hedera blockchain.`;

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
