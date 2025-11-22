import { initializeAgent } from "@/server/initialize-agent";
import { NextRequest } from "next/server";
import { searchGoogle } from "@/lib/google-search";

export const runtime = "nodejs";

type RelatedArticle = {
  url: string;
  summary: string;
};

type ResponseData = {
  message: string;
  summary?: string;
  url?: string;
  relatedArticles?: RelatedArticle[];
  error?: string;
};

export async function POST(req: NextRequest) {
  try {
    const userAccountId = process.env.HEDERA_ACCOUNT_ID || "0.0.7305752";

    // Get URL and number of peer reviewers from request body
    const body = await req.json();
    const url = body.url;
    const numPeerReviewers = body.numPeerReviewers || 2; // Default to 2 if not provided

    if (!url) {
      return Response.json(
        { message: "URL is required", error: "Missing URL parameter" },
        { status: 400 }
      );
    }

    // Validate numPeerReviewers
    const numReviewers = parseInt(String(numPeerReviewers), 10);
    if (isNaN(numReviewers) || numReviewers < 1) {
      return Response.json(
        {
          message: "Invalid number of peer reviewers",
          error: "numPeerReviewers must be a positive integer",
        },
        { status: 400 }
      );
    }

    const agentExecutor = await initializeAgent(userAccountId, url);

    // Step 1: Get summary of the initial article
    const agentResponse = await agentExecutor.invoke({
      input:
        "Please provide a summary of the content from the URL you were initialized with. What is the main information available? The summary should be short, one paragraph only",
    });

    const summary = agentResponse.output ?? "No summary available";

    // Step 2: Ask agent to generate search terms for finding related articles
    const searchTermsPrompt = `Based on the article summary you just provided, generate a Google search query (2-5 keywords) that would help find ${numReviewers} related articles on the same topic.

The search query should be specific enough to find relevant articles but broad enough to find multiple results.

Respond with ONLY the search query, nothing else. Example: "passwordless authentication blockchain security"`;

    const searchTermsResponse = await agentExecutor.invoke({
      input: searchTermsPrompt,
    });

    // Extract search query from agent response
    let searchQuery = searchTermsResponse.output?.trim() || "";

    // Clean up the search query (remove quotes, extra text, etc.)
    searchQuery = searchQuery
      .replace(/^["']|["']$/g, "") // Remove surrounding quotes
      .replace(/^search query:?\s*/i, "") // Remove "search query:" prefix
      .replace(/^query:?\s*/i, "") // Remove "query:" prefix
      .trim();

    // If no search query, use a fallback based on the summary
    if (!searchQuery || searchQuery.length < 3) {
      // Extract key terms from summary (simple approach)
      const words = summary
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 4)
        .slice(0, 3)
        .join(" ");
      searchQuery = words || "related articles";
    }

    console.log("Searching Google with query:", searchQuery);

    // Step 3: Perform Google search
    const relatedArticles: RelatedArticle[] = [];

    try {
      const searchResults = await searchGoogle(searchQuery, numReviewers);

      if (searchResults.length > 0) {
        // Fetch summaries for each article
        for (const result of searchResults) {
          try {
            // Use the snippet from Google as the summary
            const articleSummary = result.snippet;

            relatedArticles.push({
              url: result.link,
              summary: articleSummary || "No summary available.",
            });
          } catch (error) {
            console.error(`Error processing article ${result.link}:`, error);
            // Still add the article with the Google snippet
            relatedArticles.push({
              url: result.link,
              summary: result.snippet || "No summary available.",
            });
          }
        }
      } else {
        console.warn(
          "No Google search results found. This might be due to missing API keys."
        );
      }
    } catch (searchError) {
      console.error("Error performing Google search:", searchError);
      // Continue without related articles if search fails
    }

    const response: ResponseData = {
      message: "Agent initialized successfully",
      summary,
      url: url,
      relatedArticles: relatedArticles.length > 0 ? relatedArticles : undefined,
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
