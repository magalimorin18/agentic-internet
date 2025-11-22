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
    // Hardcoded URL for testing
    const url =
      "https://medium.com/@53.morin.magali/tired-of-remembering-passwords-youll-never-need-them-again-1ae6097ffdd6";

    // Initialize the agent with the URL
    const agentExecutor = await initializeAgent(userAccountId, url);
    console.log("🚀Agent initialized with URL:", url);
    console.log("🚀agentExecutor", agentExecutor);

    // Ask the agent to summarize what it knows about the URL
    const agentResponse = await agentExecutor.invoke({
      input:
        "Please provide a summary of the content from the URL you were initialized with. What is the main information available?",
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
