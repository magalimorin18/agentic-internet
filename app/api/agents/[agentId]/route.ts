/**
 * A2A Protocol Agent Server Endpoint
 * Handles JSON-RPC 2.0 requests for agent-to-agent communication
 */

import { NextRequest } from "next/server";
import {
  createDocumentAnalysisAgentCard,
  createPeerReviewAgentCard,
} from "@/lib/a2a-agent-card";

export const runtime = "nodejs";

/**
 * GET /api/agents/[agentId] - Get Agent Card
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const url = req.nextUrl.searchParams.get("sourceUrl") || undefined;

  // Determine agent type based on ID
  const isPeerAgent = agentId.includes("peer");
  const baseUrl = `${req.nextUrl.origin}/api/agents/${agentId}`;

  const agentCard = isPeerAgent
    ? createPeerReviewAgentCard(baseUrl, agentId, url)
    : createDocumentAnalysisAgentCard(baseUrl, agentId, url);

  return Response.json(agentCard);
}

// POST requests are handled by /api/agents/[agentId]/tasks/route.ts
