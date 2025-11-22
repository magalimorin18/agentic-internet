/**
 * Google Search utility using Google Custom Search API
 *
 * To use this, you need to:
 * 1. Create a Google Custom Search Engine at https://programmablesearchengine.google.com/
 * 2. Get your API key from https://console.cloud.google.com/apis/credentials
 * 3. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in your .env file
 */

type GoogleSearchResult = {
  title: string;
  link: string;
  snippet: string;
};

type GoogleSearchResponse = {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
};

/**
 * Performs a Google search and returns the top results
 */
export async function searchGoogle(
  query: string,
  numResults: number = 2
): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // If API keys are not configured, return empty results
  if (!apiKey || !searchEngineId) {
    console.warn(
      "Google Search API keys not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in your .env file"
    );
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      query
    )}&num=${numResults}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Google Search API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as GoogleSearchResponse;

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }));
  } catch (error) {
    console.error("Error performing Google search:", error);
    throw error;
  }
}

/**
 * Fetches content from a URL and extracts a summary
 */
export async function fetchArticleSummary(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return "Unable to fetch article content.";
    }

    const html = await response.text();

    // Simple HTML to text extraction
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    // Extract text from common content tags
    const contentMatch = text.match(
      /<article[^>]*>([\s\S]*?)<\/article>|<main[^>]*>([\s\S]*?)<\/main>|<body[^>]*>([\s\S]*?)<\/body>/i
    );

    if (contentMatch) {
      text = contentMatch[0];
    }

    // Remove HTML tags but preserve text content
    text = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Return first 300 characters as summary
    if (text.length > 300) {
      text = text.substring(0, 300) + "...";
    }

    return text || "No content available.";
  } catch (error) {
    console.error("Error fetching article summary:", error);
    return "Unable to fetch article content.";
  }
}
