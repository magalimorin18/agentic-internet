/**
 * A2A (Agent-to-Agent) Message Types
 *
 * This file defines types for agent communication that are compatible with both:
 * - The official A2A Protocol (https://github.com/a2aproject/A2A)
 * - Our application's frontend display requirements
 *
 * Agent communication now uses the A2A Protocol with JSON-RPC 2.0 over HTTP(S),
 * but these types provide a simplified interface for the frontend.
 */

export type A2AMessageType =
  | "query"
  | "response"
  | "proposal"
  | "agreement"
  | "disagreement"
  | "settlement";

export interface A2AMessage {
  from: string; // Agent ID/DID
  to: string; // Target Agent ID/DID
  messageId: string; // Unique message identifier
  timestamp: number; // Unix timestamp
  claimId?: string; // Related claim ID
  type: A2AMessageType;
  content: string; // Message content
  metadata?: {
    confidence?: number;
    evidence?: string[];
    settlementHash?: string; // Hedera transaction hash
    agreementLevel?: "strong" | "moderate" | "weak" | "none";
    topicId?: string;
    transactionId?: string;
    settlementError?: string;
  };
}

export interface AgentIdentity {
  id: string;
  did?: string;
  publicKey?: string;
  name: string;
  role?: string; // e.g., "Primary Agent", "Peer Reviewer", "Skeptical Agent"
  sourceUrl?: string; // URL of the article this agent is based on
}

export interface AgentDiscussion {
  claimId: string;
  claim: string;
  agents: AgentIdentity[];
  messages: A2AMessage[];
  finalAgreement?: {
    status: "agreed" | "disagreed" | "partial";
    confidence: number;
    settlementHash?: string;
    settlementError?: string;
  };
}
