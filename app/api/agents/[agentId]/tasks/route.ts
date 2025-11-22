/**
 * A2A Protocol Agent Tasks Endpoint
 * Handles JSON-RPC 2.0 requests for agent-to-agent communication
 */

import { NextRequest } from "next/server";
import { initializeAgent } from "@/server/initialize-agent";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  createJsonRpcSuccessResponse,
  createJsonRpcErrorResponse,
  A2AErrorCode,
  A2ATask,
  StartTaskParams,
  SendMessageParams,
} from "@/lib/a2a-protocol";
import { tasks, agentExecutors } from "@/lib/a2a-task-storage";

export const runtime = "nodejs";

/**
 * POST /api/agents/[agentId]/tasks - Handle JSON-RPC 2.0 requests
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = (await req.json()) as JsonRpcRequest;

    // Validate JSON-RPC 2.0 request
    if (body.jsonrpc !== "2.0" || !body.method) {
      return Response.json(
        createJsonRpcErrorResponse(
          body.id,
          A2AErrorCode.InvalidRequest,
          "Invalid JSON-RPC 2.0 request"
        )
      );
    }

    // Route to appropriate method handler
    let response: JsonRpcResponse;

    switch (body.method) {
      case "StartTask":
        response = await handleStartTask(
          agentId,
          body.id,
          body.params as StartTaskParams
        );
        break;
      case "SendMessage":
        response = await handleSendMessage(
          agentId,
          body.id,
          body.params as SendMessageParams
        );
        break;
      case "GetTaskStatus":
        response = await handleGetTaskStatus(
          agentId,
          body.id,
          body.params as { taskId: string }
        );
        break;
      case "CancelTask":
        response = await handleCancelTask(
          agentId,
          body.id,
          body.params as { taskId: string }
        );
        break;
      default:
        response = createJsonRpcErrorResponse(
          body.id,
          A2AErrorCode.MethodNotFound,
          `Method ${body.method} not found`
        );
    }

    return Response.json(response);
  } catch (error) {
    console.error("Error handling A2A request:", error);
    return Response.json(
      createJsonRpcErrorResponse(
        null,
        A2AErrorCode.InternalError,
        error instanceof Error ? error.message : "Internal server error"
      )
    );
  }
}

/**
 * Handle StartTask method
 */
async function handleStartTask(
  agentId: string,
  requestId: string | number | null,
  params: StartTaskParams
): Promise<JsonRpcResponse> {
  if (!params || !params.taskType || !params.input) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.InvalidParams,
      "Missing required parameters: taskType, input"
    );
  }

  const taskId = `task_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}`;
  const now = new Date().toISOString();

  // Get source URL from task metadata or agent initialization
  const sourceUrl = (params.metadata?.sourceUrl as string) || undefined;
  const userAccountId = process.env.HEDERA_ACCOUNT_ID || "0.0.7305752";

  // Initialize agent executor if not already initialized
  if (!agentExecutors.has(agentId) && sourceUrl) {
    try {
      const executor = await initializeAgent(userAccountId, sourceUrl);
      agentExecutors.set(agentId, executor);
    } catch (error) {
      console.error(`Error initializing agent ${agentId}:`, error);
    }
  }

  const executor = agentExecutors.get(agentId);

  // Create task
  const task: A2ATask = {
    taskId,
    status: "running",
    createdAt: now,
    updatedAt: now,
  };

  tasks.set(taskId, task);

  // Execute task based on task type
  try {
    let result: string;

    if (
      params.taskType === "claim_review" ||
      params.taskType === "claim_validation"
    ) {
      // Extract claim from input
      const claim =
        typeof params.input.content === "string"
          ? params.input.content
          : ((params.input.content as Record<string, unknown>)
              ?.claim as string) || "";

      if (!executor) {
        throw new Error("Agent executor not initialized");
      }

      const prompt = `Review this claim: "${claim}"

Provide a BRIEF assessment (2-3 sentences max):
- Agree or disagree?
- Confidence level (0-1)?
- Key evidence (one sentence)?

Keep it concise and direct.`;

      const response = await executor.invoke({ input: prompt });
      result = response.output ?? "Unable to provide review.";
    } else if (params.taskType === "settlement_proposal") {
      const claim =
        typeof params.input.content === "string"
          ? params.input.content
          : ((params.input.content as Record<string, unknown>)
              ?.claim as string) || "";

      if (!executor) {
        throw new Error("Agent executor not initialized");
      }

      const prompt = `Create a BRIEF settlement statement (one sentence) for: "${claim}"

This will be recorded on Hedera. Be concise.`;

      const response = await executor.invoke({ input: prompt });
      result = response.output ?? "Settlement proposal generated.";
    } else {
      // Generic task execution
      if (!executor) {
        throw new Error("Agent executor not initialized");
      }

      const input =
        typeof params.input.content === "string"
          ? params.input.content
          : JSON.stringify(params.input.content);

      const response = await executor.invoke({ input });
      result = response.output ?? "";
    }

    // Update task with result
    task.status = "completed";
    task.updatedAt = new Date().toISOString();
    task.result = {
      artifacts: [
        {
          artifactId: `artifact_${Date.now()}`,
          type: "text",
          content: result,
        },
      ],
    };

    tasks.set(taskId, task);

    return createJsonRpcSuccessResponse(requestId, {
      taskId,
      status: task.status,
    });
  } catch (error) {
    task.status = "failed";
    task.updatedAt = new Date().toISOString();
    task.error = {
      code: "TASK_EXECUTION_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
    tasks.set(taskId, task);

    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.InternalError,
      error instanceof Error ? error.message : "Task execution failed"
    );
  }
}

/**
 * Handle SendMessage method
 */
async function handleSendMessage(
  agentId: string,
  requestId: string | number | null,
  params: SendMessageParams
): Promise<JsonRpcResponse> {
  if (!params || !params.taskId || !params.message) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.InvalidParams,
      "Missing required parameters: taskId, message"
    );
  }

  const task = tasks.get(params.taskId);
  if (!task) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.TaskNotFound,
      `Task ${params.taskId} not found`
    );
  }

  // Create message
  const message = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    from: agentId,
    to: (params.message.metadata?.to as string) || "unknown",
    timestamp: new Date().toISOString(),
    modality: params.message.modality,
    content: params.message.content,
    metadata: params.message.metadata,
  };

  // Add message to task result
  if (!task.result) {
    task.result = {};
  }
  if (!task.result.messages) {
    task.result.messages = [];
  }
  task.result.messages.push(message);
  task.updatedAt = new Date().toISOString();

  tasks.set(params.taskId, task);

  return createJsonRpcSuccessResponse(requestId, {
    messageId: message.messageId,
  });
}

/**
 * Handle GetTaskStatus method
 */
async function handleGetTaskStatus(
  agentId: string,
  requestId: string | number | null,
  params: { taskId: string }
): Promise<JsonRpcResponse> {
  if (!params || !params.taskId) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.InvalidParams,
      "Missing required parameter: taskId"
    );
  }

  const task = tasks.get(params.taskId);
  if (!task) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.TaskNotFound,
      `Task ${params.taskId} not found`
    );
  }

  return createJsonRpcSuccessResponse(requestId, {
    taskId: task.taskId,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    result: task.result,
    error: task.error,
  });
}

/**
 * Handle CancelTask method
 */
async function handleCancelTask(
  agentId: string,
  requestId: string | number | null,
  params: { taskId: string }
): Promise<JsonRpcResponse> {
  if (!params || !params.taskId) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.InvalidParams,
      "Missing required parameter: taskId"
    );
  }

  const task = tasks.get(params.taskId);
  if (!task) {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.TaskNotFound,
      `Task ${params.taskId} not found`
    );
  }

  if (task.status === "completed" || task.status === "failed") {
    return createJsonRpcErrorResponse(
      requestId,
      A2AErrorCode.InvalidParams,
      `Cannot cancel task in ${task.status} status`
    );
  }

  task.status = "cancelled";
  task.updatedAt = new Date().toISOString();
  tasks.set(params.taskId, task);

  return createJsonRpcSuccessResponse(requestId, {
    taskId: task.taskId,
    status: task.status,
  });
}
