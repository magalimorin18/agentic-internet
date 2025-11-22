"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentDiscussion, A2AMessage } from "@/types/a2a";

type PeerDiscussionModalProps = {
  claim: { id: string; claim: string; score?: number };
  url?: string;
  relatedArticleUrl?: string; // Specific related article URL to use for peer agent
  onClose: () => void;
};

export default function PeerDiscussionModal({
  claim,
  url,
  relatedArticleUrl,
  onClose,
}: PeerDiscussionModalProps) {
  const [discussion, setDiscussion] = useState<AgentDiscussion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscussion = useCallback(async () => {
    if (!url || url === "Unknown") {
      setError("URL is required for agent discussion");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Get related articles from sessionStorage
    let relatedArticles: Array<{ url: string; summary: string }> | undefined;
    try {
      const stored = sessionStorage.getItem("agentInitResult");
      if (stored) {
        const initResult = JSON.parse(stored);
        relatedArticles = initResult.relatedArticles;
      }
    } catch (error) {
      console.error("Error reading related articles:", error);
    }

    // If a specific related article URL is provided, use only that one
    // Otherwise, use all related articles (API will pick the first one)
    const articlesToSend = relatedArticleUrl
      ? [{ url: relatedArticleUrl, summary: "" }]
      : relatedArticles || [];

    try {
      const response = await fetch("/api/agents/discuss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          claim: claim.claim,
          claimId: claim.id,
          relatedArticles: articlesToSend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start agent discussion");
      }

      // Initialize discussion state
      let currentDiscussion: AgentDiscussion | null = null;
      const messages: A2AMessage[] = [];

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response stream");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.substring(7);
          } else if (line.startsWith("data: ")) {
            data = line.substring(6);
          } else if (line === "" && data) {
            // Process the event
            try {
              const eventData = JSON.parse(data);

              if (eventType === "init") {
                currentDiscussion = {
                  claimId: eventData.claimId,
                  claim: eventData.claim,
                  agents: eventData.agents,
                  messages: [],
                };
                setDiscussion(currentDiscussion);
              } else if (eventType === "message") {
                messages.push(eventData);
                if (currentDiscussion) {
                  currentDiscussion.messages = [...messages];
                  setDiscussion({ ...currentDiscussion });
                }
              } else if (eventType === "status") {
                // Optional: show status updates
                console.log("Status:", eventData.message);
              } else if (eventType === "final") {
                if (currentDiscussion) {
                  currentDiscussion.finalAgreement = eventData;
                  setDiscussion({ ...currentDiscussion });
                }
              } else if (eventType === "error") {
                throw new Error(eventData.error || "Unknown error");
              }
            } catch (parseError) {
              console.error("Error parsing event data:", parseError);
            }

            // Reset for next event
            data = "";
            eventType = "message";
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching discussion:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start agent discussion"
      );
      setIsLoading(false);
    }
  }, [url, claim, relatedArticleUrl]);

  useEffect(() => {
    if (claim && url) {
      fetchDiscussion();
    }
  }, [claim, url, fetchDiscussion]);

  function getAgentColor(agentId: string): {
    bg: string;
    border: string;
    text: string;
    badge: string;
  } {
    // Primary agent gets blue colors
    if (agentId === "agent_primary" || agentId.includes("primary")) {
      return {
        bg: "bg-blue-50",
        border: "border-blue-400",
        text: "text-blue-800",
        badge: "bg-blue-200 text-blue-900",
      };
    }
    // Peer agent gets purple colors
    return {
      bg: "bg-purple-50",
      border: "border-purple-400",
      text: "text-purple-800",
      badge: "bg-purple-200 text-purple-900",
    };
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-3xl max-h-[90vh] shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">A2A Agent Discussion</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              Initializing agents and starting discussion...
            </p>
            <div className="mt-4 animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg mb-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
            <button
              onClick={fetchDiscussion}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {discussion && (
          <>
            {/* Agent Identities */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {discussion.agents.map((agent) => {
                const colors = getAgentColor(agent.id);
                return (
                  <div key={agent.id} className={`p-2 rounded-lg ${colors.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${colors.text}`}>
                        {agent.name}
                      </span>
                    </div>
                    {agent.sourceUrl && (
                      <div className="mt-1 text-xs">
                        <span className="text-gray-600">Source: </span>
                        <a
                          href={agent.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {agent.sourceUrl}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Claim:</strong> {claim.claim}
              </p>
            </div>

            {/* Messages */}
            <div className="space-y-3 mb-4">
              {discussion.messages.map((message: A2AMessage) => {
                const colors = getAgentColor(message.from);

                return (
                  <div
                    key={message.messageId}
                    className={`p-3 rounded-lg border-l-4 ${colors.border} ${colors.bg}`}
                  >
                    <p
                      className={`text-sm ${colors.text} leading-relaxed whitespace-pre-wrap`}
                    >
                      {message.content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Final Agreement */}
            {discussion.finalAgreement && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-600">
                    Result:
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      discussion.finalAgreement.status === "agreed"
                        ? "bg-green-200 text-green-800"
                        : discussion.finalAgreement.status === "disagreed"
                        ? "bg-red-200 text-red-800"
                        : "bg-yellow-200 text-yellow-800"
                    }`}
                  >
                    {discussion.finalAgreement.status.toUpperCase()}
                  </span>
                  {discussion.finalAgreement.confidence !== undefined && (
                    <>
                      <span className="text-xs font-semibold text-gray-600 ml-2">
                        Confidence:
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        {(discussion.finalAgreement.confidence * 100).toFixed(
                          0
                        )}
                        %
                      </span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden ml-2">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{
                            width: `${
                              discussion.finalAgreement.confidence * 100
                            }%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
                {discussion.finalAgreement.settlementHash ? (
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Hedera Settlement Hash:
                    </p>

                    <a
                      href={`https://hashscan.io/testnet/transaction/${discussion.finalAgreement.settlementHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all block"
                    >
                      {discussion.finalAgreement.settlementHash}
                    </a>
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      ✓ Verified on Hedera Network
                    </p>
                  </div>
                ) : discussion.finalAgreement.settlementError ? (
                  <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                    <p className="text-xs font-semibold text-red-700 mb-1">
                      Settlement Generation Failed:
                    </p>
                    <p className="text-xs text-red-600 mb-2">
                      Unable to generate Hedera settlement. The settlement could
                      not be recorded on-chain.
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Error: {discussion.finalAgreement.settlementError}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Please check your Hedera credentials configuration. See
                      the setup guide for more information.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2 bg-black text-white rounded-lg"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
