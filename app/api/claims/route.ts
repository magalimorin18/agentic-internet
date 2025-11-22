import { initializeAgent } from "@/server/initialize-agent";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type Claim = {
  id: string;
  claim: string;
  score?: number;
};

type ResponseData = {
  claims: Claim[];
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
        { claims: [], error: "URL is required" },
        { status: 400 }
      );
    }

    // Initialize the agent (this will load the URL content into memory)
    const agentExecutor = await initializeAgent(userAccountId, url);

    // Query the agent to extract claims
    const prompt =
      "Crawls and extracts structured claims from your memory and return them in simple light sentences. Format your response as a JSON array of objects, where each object has a 'claim' field with the claim text. Example: [{\"claim\": \"First claim here\"}, {\"claim\": \"Second claim here\"}]";

    const agentResponse = await agentExecutor.invoke({
      input: prompt,
    });

    // Parse the agent's response to extract claims
    let claims: Claim[] = [];
    const output = agentResponse.output ?? "";

    try {
      // Try to parse JSON from the response
      // The agent might return JSON wrapped in markdown code blocks
      let jsonStr = output.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      // Try to extract JSON array from the response
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          claims = parsed.map((item, index) => ({
            id: String(index + 1),
            claim: item.claim || item.text || String(item),
            score: item.score,
          }));
        }
      } else {
        // Fallback: if no JSON found, try to extract claims from plain text
        // Split by newlines or numbered lists
        const lines = output
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.match(/^[\[\]{}]/));

        claims = lines
          .slice(0, 20) // Limit to 20 claims
          .map((line, index) => ({
            id: String(index + 1),
            claim: line.replace(/^\d+[\.\)]\s*/, ""), // Remove numbering
            score: undefined,
          }));
      }
    } catch (parseError) {
      console.error("Error parsing claims from agent response:", parseError);
      // Fallback: return the raw output as a single claim
      if (output.trim()) {
        claims = [
          {
            id: "1",
            claim: output.trim(),
          },
        ];
      }
    }

    const response: ResponseData = {
      claims,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error extracting claims:", error);
    const errorResponse: ResponseData = {
      claims: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}

