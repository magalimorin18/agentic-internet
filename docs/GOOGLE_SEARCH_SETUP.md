# Google Search API Setup

To enable real Google search results for related articles, you need to set up Google Custom Search API.

## Steps:

### 1. Create a Google Custom Search Engine

1. Go to https://programmablesearchengine.google.com/
2. Click "Add" to create a new search engine
3. In "Sites to search", enter `*` to search the entire web
4. Give it a name (e.g., "Agentic Internet Search")
5. Click "Create"
6. Note your **Search Engine ID** (CX) - you'll need this

### 2. Get Google API Key

1. Go to https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" > "API Key"
3. Copy your API key
4. (Optional) Restrict the API key to "Custom Search API" for security

### 3. Add to Environment Variables

Add these to your `.env.local` file:

```env
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

### 4. Enable Custom Search API

1. Go to https://console.cloud.google.com/apis/library
2. Search for "Custom Search API"
3. Click on it and click "Enable"

## Free Tier

- Google Custom Search API provides **100 free queries per day**
- After that, it's $5 per 1,000 queries

## Testing

Once configured, when you initialize an agent, it will:

1. Generate a summary of the article
2. Create a search query based on the summary
3. Search Google for 2 related articles
4. Return real URLs and summaries

If the API keys are not configured, the system will continue to work but won't return related articles.
