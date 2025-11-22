/**
 * A2A Protocol Types and Utilities
 * Based on A2A Protocol Specification: https://a2a-protocol.org/
 */

import { AgentCard } from "./a2a-agent-card";

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * A2A Task Status
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/**
 * A2A Task
 */
export interface A2ATask {
  taskId: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  result?: TaskResult;
  error?: TaskError;
}

export interface TaskResult {
  artifacts?: Artifact[];
  messages?: A2AMessage[];
}

export interface TaskError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * A2A Artifact
 */
export interface Artifact {
  artifactId: string;
  type: "text" | "file" | "json";
  content: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * A2A Message (Protocol-compliant)
 */
export interface A2AMessage {
  messageId: string;
  from: string;
  to: string;
  timestamp: string;
  modality: "text" | "file" | "json";
  content: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * StartTask Parameters
 */
export interface StartTaskParams {
  taskType: string;
  input: {
    modality: "text" | "file" | "json";
    content: string | Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

/**
 * SendMessage Parameters
 */
export interface SendMessageParams {
  taskId: string;
  message: {
    modality: "text" | "file" | "json";
    content: string | Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

/**
 * QuerySkill Parameters
 */
export interface QuerySkillParams {
  skill: string;
  input?: {
    modality: "text" | "file" | "json";
    content: string | Record<string, unknown>;
  };
}

/**
 * Creates a JSON-RPC 2.0 request
 */
export function createJsonRpcRequest(
  method: string,
  params?: unknown,
  id: string | number | null = null
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: id ?? Date.now(),
    method,
    params,
  };
}

/**
 * Creates a JSON-RPC 2.0 success response
 */
export function createJsonRpcSuccessResponse(
  id: string | number | null,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * Creates a JSON-RPC 2.0 error response
 */
export function createJsonRpcErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * A2A Protocol Error Codes
 */
export enum A2AErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  TaskNotFound = -32001,
  TaskAlreadyExists = -32002,
  Unauthorized = -32003,
  Forbidden = -32004,
}

/**
 * Sends an A2A protocol request to an agent
 */
export async function sendA2ARequest(
  agentUrl: string,
  method: string,
  params?: unknown
): Promise<JsonRpcResponse> {
  const request = createJsonRpcRequest(method, params);

  try {
    const response = await fetch(`${agentUrl}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as JsonRpcResponse;
  } catch (error) {
    return createJsonRpcErrorResponse(
      request.id,
      A2AErrorCode.InternalError,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Gets an agent's Agent Card
 */
export async function getAgentCard(agentUrl: string): Promise<AgentCard | null> {
  try {
    const response = await fetch(`${agentUrl}/agent-card`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AgentCard;
  } catch (error) {
    console.error("Error fetching agent card:", error);
    return null;
  }
}

