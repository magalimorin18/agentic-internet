/**
 * A2A Protocol Agent Card
 * Based on A2A Protocol Specification: https://a2a-protocol.org/
 */

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapabilities;
  endpoints: AgentEndpoints;
  authentication?: AuthenticationScheme[];
}

export interface AgentCapabilities {
  supportedModalities: Modality[];
  supportedTasks?: string[];
  maxConcurrentTasks?: number;
}

export type Modality = "text" | "file" | "json";

export interface AgentEndpoints {
  baseUrl: string;
  health?: string;
  tasks?: string;
}

export interface AuthenticationScheme {
  type: "api_key" | "oauth" | "oidc" | "none";
  name?: string;
  description?: string;
}

/**
 * Creates an Agent Card for a document analysis agent
 */
export function createDocumentAnalysisAgentCard(
  baseUrl: string,
  agentId: string,
  sourceUrl?: string
): AgentCard {
  return {
    name: `Document Analysis Agent - ${agentId}`,
    description: sourceUrl
      ? `Analyzes and validates claims from documents. Initialized with: ${sourceUrl}`
      : "Analyzes and validates claims from documents",
    version: "1.0.0",
    capabilities: {
      supportedModalities: ["text", "json"],
      supportedTasks: [
        "claim_analysis",
        "claim_validation",
        "peer_review",
        "settlement_negotiation",
      ],
      maxConcurrentTasks: 5,
    },
    endpoints: {
      baseUrl,
      health: `${baseUrl}/health`,
      tasks: `${baseUrl}/tasks`,
    },
    authentication: [
      {
        type: "none",
        description: "No authentication required for demo",
      },
    ],
  };
}

/**
 * Creates an Agent Card for a peer review agent
 */
export function createPeerReviewAgentCard(
  baseUrl: string,
  agentId: string,
  sourceUrl?: string
): AgentCard {
  return {
    name: `Peer Review Agent - ${agentId}`,
    description: sourceUrl
      ? `Provides independent peer review of claims. Initialized with: ${sourceUrl}`
      : "Provides independent peer review of claims",
    version: "1.0.0",
    capabilities: {
      supportedModalities: ["text", "json"],
      supportedTasks: ["claim_review", "claim_validation", "settlement_proposal"],
      maxConcurrentTasks: 5,
    },
    endpoints: {
      baseUrl,
      health: `${baseUrl}/health`,
      tasks: `${baseUrl}/tasks`,
    },
    authentication: [
      {
        type: "none",
        description: "No authentication required for demo",
      },
    ],
  };
}

