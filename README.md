# The Agentic Internet

The Agentic Internet demonstrates how static research paper can behave like autonomous AI agents: extracting claims, assigning confidence scores, engaging in peer discussions and recording settlements on the Hedera blockchain.

## Overview

These agents can:

- **Extract debatable claims** from research papers
- **Engage in peer review** with other research papers agents
- **Debate and reach consensus** on claim validity
- **Record settlements** immutably on the Hedera blockchain
- **Display confidence scores** based on collective agent agreement

Bridging AI and Blockchain: The seamless integration of AI agents with blockchain technology (Hedera) in a practical, working application demonstrates how these technologies can complement each other.

Target Audience: Researchers, academics, fact-checkers.

## Key Features

### 1. **Document Agent Creation**

- Convert any URL (research paper, article, blog post) into an AI agent
- Agents are initialized with the full content from the URL
- Each agent maintains its own memory and context

### 2. **Intelligent Claim Extraction**

- Automatically identifies **interesting, debatable, or controversial claims** from documents
- Returns structured JSON with claim text

### 3. **Multi-Agent Peer Review System**

- **Configurable peer reviewers**: Users can specify how many peer agents to include
- **Automatic related article discovery**: Uses Google Search to find related research papers
- **Parallel independent discussions**: Primary agent has separate, isolated discussions with each peer reviewer
- **Real-time streaming**: Watch agent discussions unfold in real-time via Server-Sent Events (SSE)

### 4. **Agent-to-Agent (A2A) Protocol Compliance**

- Fully aligned with the [official A2A protocol](https://github.com/a2aproject/A2A)
- JSON-RPC 2.0 communication format
- Agent Cards for discovery and capability description
- Task-based interaction model (StartTask, GetTaskStatus, CancelTask)
- Standardized message types (query, response, proposal, agreement, disagreement, settlement)

### 5. **Separate Discussion Threads**

- Each peer reviewer has an **independent discussion** with the primary agent
- Each discussion concludes with its own confidence score
- **Final confidence is calculated as the mean** of all individual discussion confidences

### 7. **Hedera Blockchain Settlement**

- **Immutable record**: Agent agreements are recorded on Hedera Consensus Service (HCS)
- **On-chain verification**: Settlement hashes link to HashScan for verification

### 8. **Confidence Scoring**

- Each discussion produces a confidence score between 0 and 1
- Confidence scores are extracted from agent responses
- Final confidence is the arithmetic mean of all discussion confidences

### 9. **Optimized Performance**

- **Fast polling**: 300ms intervals for task completion checks
- **Efficient task management**: In-memory task storage with status tracking

## 🏗️ Architecture

### Technology Stack

- **AI/LLM**: OpenAI GPT-4o-mini via LangChain
- **Blockchain**: Hedera Hashgraph (Testnet)
- **Protocol**: A2A (Agent-to-Agent) Protocol

## 🚀 Getting Started

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd agentic-internet
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file:

   ```bash
   # Required: OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key_here

   # Optional: Hedera Settlement (see docs/HEDERA_SETUP.md)
   HEDERA_ACCOUNT_ID=0.0.1234567
   HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...
   HEDERA_SETTLEMENT_TOPIC_ID=0.0.9876543

   # Optional: Google Search API (see docs/GOOGLE_SEARCH_SETUP.md)
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Step 1: Create an Agent

1. Go to `/demo`
2. **Enter a URL**: Paste the URL of a research paper, article, or blog post
3. **Specify peer reviewers**: Enter the number of peer agent reviewers you want (default: 2)
4. Click **"Create Agent"**

The system will:

- Fetch and analyze the document
- Generate a summary
- Search for related articles
- Create peer review agents from related articles

### Step 2: Extract Claims

1. Once the agent is initialized, click **"Get Claims"**
2. The system extracts interesting, debatable claims from the document
3. Claims are displayed in a table with unique IDs

### Step 3: Initiate Agent Discussion

1. Click **"ASK AGENTS"** next to any claim
2. Watch as:
   - The primary agent starts separate discussions with each peer reviewer
   - Agents debate the claim through multiple rounds
   - Each discussion concludes with a confidence score
   - The final mean confidence is calculated

### Step 4: Review Results

- **Parallel discussions**: View each agent discussion in separate columns
- **Confidence scores**: See individual and mean confidence levels
- **Settlement hash**: Click to verify on Hedera HashScan
- **Agent cards**: View detailed agent capabilities

## 📡 API Reference

### POST `/api/init`

Initialize an agent with a document URL and find related articles.

**Request:**

```json
{
  "url": "https://example.com/article",
  "numPeerReviewers": 2
}
```

**Response:**

```json
{
  "message": "Agent initialized successfully",
  "summary": "Article summary...",
  "relatedArticles": [
    {
      "url": "https://related-article.com",
      "summary": "Related article summary..."
    }
  ]
}
```

### POST `/api/claims`

Extract debatable claims from a document.

**Request:**

```json
{
  "url": "https://example.com/article"
}
```

**Response:**

```json
{
  "claims": [
    {
      "id": "claim_123",
      "claim": "The claim text here..."
    }
  ]
}
```

### POST `/api/agents/discuss`

Initiate a multi-agent discussion about a claim.

**Request:**

```json
{
  "url": "https://example.com/article",
  "claim": "The claim to debate",
  "claimId": "claim_123",
  "relatedArticles": [
    {
      "url": "https://related-article.com",
      "summary": "Summary..."
    }
  ]
}
```

**Response:** Server-Sent Events (SSE) stream with:

- `init`: Initial discussion setup
- `status`: Status updates
- `message`: Agent messages
- `final`: Final agreement and confidence
- `error`: Error messages

### GET `/api/agents/[agentId]`

Get an Agent Card for discovery.

**Query Parameters:**

- `sourceUrl`: Optional source URL for the agent

**Response:**

```json
{
  "name": "Document Analysis Agent - agent_123",
  "description": "Analyzes and validates claims...",
  "version": "1.0.0",
  "capabilities": {
    "supportedModalities": ["text", "json"],
    "supportedTasks": ["claim_analysis", "claim_validation"],
    "maxConcurrentTasks": 5
  },
  "endpoints": {
    "baseUrl": "http://localhost:3000/api/agents/agent_123",
    "tasks": "http://localhost:3000/api/agents/agent_123/tasks"
  }
}
```

### POST `/api/agents/[agentId]/tasks`

A2A protocol task management endpoint.

**Request:** JSON-RPC 2.0 format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "StartTask",
  "params": {
    "taskType": "claim_review",
    "input": {
      "modality": "text",
      "content": "Claim text here"
    }
  }
}
```

## 🔍 Technical Details

### A2A Protocol Implementation

The application fully implements the A2A protocol:

- **Agent Cards**: JSON-formatted agent descriptions
- **JSON-RPC 2.0**: Standardized request/response format
- **Task Management**: StartTask, GetTaskStatus, CancelTask methods
- **Message Types**: query, response, proposal, agreement, disagreement, settlement

### Discussion Flow

1. **Initial Review**: Each peer agent reviews the claim independently
2. **Follow-up Questions**: Primary agent asks targeted questions based on each review
3. **Debate Response**: Peer agents respond to follow-up questions
4. **Conclusion**: Primary agent synthesizes each discussion and assigns confidence
5. **Final Calculation**: Mean confidence is calculated from all discussions
6. **Settlement**: Agreement is recorded on Hedera (if configured)

### Confidence Extraction

Confidence scores are extracted from agent responses using regex patterns

### Hedera Settlement

Settlements are recorded using Hedera Consensus Service (HCS):

- Creates or uses an existing HCS topic
- Submits JSON payload with claim ID, agents, agreement status, timestamp
- Returns transaction hash for verification
- Links to HashScan for on-chain verification

## 📚 Documentation

- [Hedera Settlement Setup](docs/HEDERA_SETUP.md)
- [Hedera Settlement Hash Explanation](docs/HEDERA_SETTLEMENT_HASH.md)
- [Google Search Setup](docs/GOOGLE_SEARCH_SETUP.md)
