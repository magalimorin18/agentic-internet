"use client";

import { useState } from "react";
import AgentIdentity from "../components/AgentIdentity";
import ClaimsSection from "../components/ClaimsSection";

type AgentInitResult = {
  message: string;
  summary?: string;
  url?: string;
  relatedArticles?: Array<{ url: string; summary: string }>;
  error?: string;
};

function getUrlFromStorage(): string {
  if (typeof window === "undefined") return "Unknown";

  // First, try to get URL from the dedicated sessionStorage key
  const storedUrl = sessionStorage.getItem("agentUrl");
  if (storedUrl) {
    return storedUrl;
  }

  // Fallback: try to get from agentInitResult
  const stored = sessionStorage.getItem("agentInitResult");
  if (stored) {
    try {
      const initResult = JSON.parse(stored) as AgentInitResult;
      if (initResult.url) {
        return initResult.url;
      }
    } catch (error) {
      console.error("Error parsing stored agent init result:", error);
    }
  }

  return "Unknown";
}

export default function AgentPage() {
  // Initialize state directly from sessionStorage using function initializer
  const [url] = useState<string>(getUrlFromStorage);

  return (
    <main className="p-12 max-w-3xl mx-auto">
      <h2 className="text-3xl font-semibold mb-4">Document Agent</h2>

      <AgentIdentity url={url} />

      <ClaimsSection url={url} />
    </main>
  );
}
