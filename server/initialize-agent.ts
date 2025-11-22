import { Client } from "@hashgraph/sdk";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { AgentMode, HederaLangchainToolkit } from "hedera-agent-kit";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { BufferMemory } from "langchain/memory";

/**
 * Fetches content from a URL and extracts text from HTML
 */
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Simple HTML to text extraction
    // Remove script and style tags and their content
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

    // Limit content length to avoid token limits (keep first 10000 characters)
    if (text.length > 10000) {
      text = text.substring(0, 10000) + "... [content truncated]";
    }

    return text || "Unable to extract text content from the URL.";
  } catch (error) {
    console.error("Error fetching URL content:", error);
    throw new Error(
      `Failed to fetch content from URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function initializeAgent(userAccountId: string, url: string) {
  if (!userAccountId) throw new Error("userAccountId must be set");
  if (!url) throw new Error("url must be set");

  console.log("Initializing agent with URL:", url);

  // Fetch and extract content from the URL
  console.log("Fetching content from URL...");
  const urlContent = await fetchUrlContent(url);
  console.log(`Fetched ${urlContent.length} characters of content`);

  // Initialise OpenAI LLM
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  const agentClient = Client.forTestnet();

  // Prepare Hedera toolkit (load all tools by default)
  const hederaAgentToolkit = new HederaLangchainToolkit({
    client: agentClient,
    configuration: {
      tools: [], // use an empty array if you wantto load all tools
      context: {
        mode: AgentMode.RETURN_BYTES,
        accountId: userAccountId,
      },
    },
  });

  // Load the structured chat prompt template with URL context
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant that has been initialized with content from the following URL: ${url}

The content from this URL has been loaded into your memory. You can reference and discuss this content in your responses.`,
    ],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  // Fetch tools from toolkit
  // cast to any to avoid excessively deep type instantiation caused by zod@3.25
  const tools = hederaAgentToolkit.getTools();

  // Create the underlying agent
  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  // In-memory conversation history
  const memory = new BufferMemory({
    memoryKey: "chat_history",
    inputKey: "input",
    outputKey: "output",
    returnMessages: true,
  });

  // Initialize memory with the URL content
  // Save the content as an initial human message so it's in the conversation history
  await memory.saveContext(
    {
      input: `I have been initialized with content from the following URL: ${url}\n\nContent:\n${urlContent}`,
    },
    {
      output:
        "I understand. I have loaded the content from the URL into my memory and can now reference it in our conversation.",
    }
  );

  // Wrap everything in an executor that will maintain memory
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    memory,
    returnIntermediateSteps: true,
  });

  return agentExecutor;
}
