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
 * Checks if a URL is likely to be a video or non-readable content
 */
function isVideoOrNonReadable(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Video platforms
  const videoDomains = [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "dailymotion.com",
    "twitch.tv",
    "tiktok.com",
    "instagram.com/reel",
    "facebook.com/watch",
    "netflix.com",
    "hulu.com",
    "amazon.com/prime",
  ];

  // Check if URL contains video domain
  if (videoDomains.some((domain) => lowerUrl.includes(domain))) {
    return true;
  }

  // Check for video file extensions
  const videoExtensions = [
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".webm",
    ".mkv",
  ];
  if (videoExtensions.some((ext) => lowerUrl.includes(ext))) {
    return true;
  }

  // Check for video-related paths
  const videoPaths = ["/video/", "/watch", "/v/", "/embed/", "/player/"];
  if (videoPaths.some((path) => lowerUrl.includes(path))) {
    return true;
  }

  return false;
}

/**
 * Checks if content from a URL is readable (not a video or binary file)
 */
async function isReadableContent(url: string): Promise<boolean> {
  try {
    // First check URL patterns
    if (isVideoOrNonReadable(url)) {
      return false;
    }

    // Make a HEAD request to check content type
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return false;
    }

    const contentType =
      response.headers.get("content-type")?.toLowerCase() || "";

    // Exclude video, audio, and binary content types
    const excludedTypes = [
      "video/",
      "audio/",
      "application/octet-stream",
      "application/pdf", // PDFs are harder to parse, exclude for now
      "application/zip",
      "application/x-",
    ];

    if (excludedTypes.some((type) => contentType.includes(type))) {
      return false;
    }

    // Prefer HTML/text content
    const preferredTypes = ["text/html", "text/plain", "application/json"];
    return (
      preferredTypes.some((type) => contentType.includes(type)) ||
      contentType === ""
    );
  } catch (error) {
    console.warn(`Could not verify content type for ${url}:`, error);
    // If we can't verify, check URL pattern and allow if it doesn't look like video
    return !isVideoOrNonReadable(url);
  }
}

/**
 * Performs a Google search and returns the top results, filtering out videos and non-readable content
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
    // Add exclusion terms to the query to filter out videos
    // Using Google's search operators: -fileType:video excludes video files
    const enhancedQuery = `${query} -fileType:video -site:youtube.com -site:vimeo.com -site:dailymotion.com`;

    // Request more results than needed to account for filtering
    const numToRequest = Math.min(numResults * 3, 10); // Request up to 3x results, max 10

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      enhancedQuery
    )}&num=${numToRequest}`;

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

    // Filter out videos and non-readable content
    // First, do quick URL-based filtering
    const urlFilteredItems = data.items.filter((item) => {
      if (isVideoOrNonReadable(item.link)) {
        console.log(`Filtered out video/non-readable URL: ${item.link}`);
        return false;
      }
      return true;
    });

    // Then verify content types in parallel (faster)
    const readabilityChecks = await Promise.all(
      urlFilteredItems.map((item) => isReadableContent(item.link))
    );

    // Filter based on readability checks
    const filteredResults: GoogleSearchResult[] = [];
    for (let i = 0; i < urlFilteredItems.length; i++) {
      if (readabilityChecks[i]) {
        filteredResults.push({
          title: urlFilteredItems[i].title,
          link: urlFilteredItems[i].link,
          snippet: urlFilteredItems[i].snippet,
        });

        // Stop once we have enough results
        if (filteredResults.length >= numResults) {
          break;
        }
      } else {
        console.log(
          `Filtered out non-readable content: ${urlFilteredItems[i].link}`
        );
      }
    }

    return filteredResults;
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
