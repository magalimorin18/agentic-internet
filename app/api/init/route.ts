import { initializeAgent } from "@/server/initialize-agent";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type ResponseData = {
  message: string;
  summary?: string;
  url?: string;
  error?: string;
};

export async function POST(req: NextRequest) {
  try {
    const userAccountId = "0.0.7305752";

    // Get URL from request body
    const body = await req.json();
    const url = body.url;

    if (!url) {
      return Response.json(
        { message: "URL is required", error: "Missing URL parameter" },
        { status: 400 }
      );
    }

    const agentExecutor = await initializeAgent(userAccountId, url);

    const agentResponse = await agentExecutor.invoke({
      input:
        "Please provide a summary of the content from the URL you were initialized with. What is the main information available? The summary should be short, one paragraph only",
    });

    const response: ResponseData = {
      message: "Agent initialized successfully",
      summary: agentResponse.output ?? "No summary available",
      url: url,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error initializing agent:", error);
    const errorResponse: ResponseData = {
      message: "Failed to initialize agent",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}
