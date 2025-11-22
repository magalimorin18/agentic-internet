"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentDiscussion, A2AMessage } from "@/types/a2a";
import type { AgentCard } from "@/lib/a2a-agent-card";

type PeerDiscussionModalProps = {
  claim: { id: string; claim: string; score?: number };
  url?: string;
  onClose: () => void;
};

export default function PeerDiscussionModal({
  claim,
  url,
  onClose,
}: PeerDiscussionModalProps) {
  const [discussion, setDiscussion] = useState<AgentDiscussion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentCard, setSelectedAgentCard] = useState<{
    agentId: string;
    card: AgentCard | null;
  } | null>(null);
  const [loadingAgentCard, setLoadingAgentCard] = useState(false);

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

    // Send all related articles for multi-agent discussion
    const articlesToSend = relatedArticles || [];

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
  }, [url, claim]);

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
    // If we have discussion with agents, use their index for consistent coloring
    if (discussion?.agents) {
      const agentIndex = discussion.agents.findIndex((a) => a.id === agentId);
      if (agentIndex !== -1) {
        // Primary agent (index 0) always gets blue
        if (agentIndex === 0) {
          return {
            bg: "bg-blue-50",
            border: "border-blue-400",
            text: "text-blue-800",
            badge: "bg-blue-200 text-blue-900",
          };
        }

        // Color palette for peer agents (starting from index 1)
        const peerColors = [
          {
            bg: "bg-purple-50",
            border: "border-purple-400",
            text: "text-purple-800",
            badge: "bg-purple-200 text-purple-900",
          },
          {
            bg: "bg-green-50",
            border: "border-green-400",
            text: "text-green-800",
            badge: "bg-green-200 text-green-900",
          },
          {
            bg: "bg-orange-50",
            border: "border-orange-400",
            text: "text-orange-800",
            badge: "bg-orange-200 text-orange-900",
          },
          {
            bg: "bg-pink-50",
            border: "border-pink-400",
            text: "text-pink-800",
            badge: "bg-pink-200 text-pink-900",
          },
          {
            bg: "bg-teal-50",
            border: "border-teal-400",
            text: "text-teal-800",
            badge: "bg-teal-200 text-teal-900",
          },
          {
            bg: "bg-indigo-50",
            border: "border-indigo-400",
            text: "text-indigo-800",
            badge: "bg-indigo-200 text-indigo-900",
          },
        ];

        // Use agent index - 1 for peer agents (since index 0 is primary)
        const peerIndex = agentIndex - 1;
        return peerColors[peerIndex % peerColors.length] || peerColors[0];
      }
    }

    // Fallback: Primary agent gets blue, others get purple
    if (agentId === "agent_primary" || agentId.includes("primary")) {
      return {
        bg: "bg-blue-50",
        border: "border-blue-400",
        text: "text-blue-800",
        badge: "bg-blue-200 text-blue-900",
      };
    }

    // Default purple for peer agents
    return {
      bg: "bg-purple-50",
      border: "border-purple-400",
      text: "text-purple-800",
      badge: "bg-purple-200 text-purple-900",
    };
  }

  const fetchAgentCard = useCallback(
    async (agentId: string) => {
      setLoadingAgentCard(true);
      try {
        // Get the source URL from the agent in the discussion
        const agent = discussion?.agents.find((a) => a.id === agentId);
        const sourceUrl = agent?.sourceUrl;

        const url = `/api/agents/${agentId}${
          sourceUrl ? `?sourceUrl=${encodeURIComponent(sourceUrl)}` : ""
        }`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch agent card");
        }

        const card = (await response.json()) as AgentCard;
        setSelectedAgentCard({ agentId, card });
      } catch (err) {
        console.error("Error fetching agent card:", err);
        setSelectedAgentCard({ agentId, card: null });
      } finally {
        setLoadingAgentCard(false);
      }
    },
    [discussion]
  );

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
                  <div
                    key={agent.id}
                    className={`p-2 rounded-lg ${colors.bg} mb-2 last:mb-0`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-sm ${colors.text}`}
                          >
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
                      <button
                        onClick={() => fetchAgentCard(agent.id)}
                        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                        disabled={loadingAgentCard}
                      >
                        {loadingAgentCard &&
                        selectedAgentCard?.agentId === agent.id
                          ? "Loading..."
                          : "View Agent Card"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Debate:</strong> {claim.claim}
              </p>
            </div>

            {/* Parallel Discussions */}
            {(() => {
              // Get primary agent ID
              const primaryAgent = discussion.agents.find((a) =>
                a.id.includes("primary")
              );
              const primaryAgentId =
                primaryAgent?.id || discussion.agents[0]?.id;

              // Get all peer agents (non-primary)
              const peerAgents = discussion.agents.filter(
                (a) => !a.id.includes("primary")
              );

              // Group messages by conversation thread (primary <-> each peer)
              const conversationThreads = peerAgents.map((peerAgent) => {
                const threadMessages = discussion.messages.filter(
                  (msg) =>
                    (msg.from === primaryAgentId && msg.to === peerAgent.id) ||
                    (msg.from === peerAgent.id && msg.to === primaryAgentId) ||
                    (msg.from === peerAgent.id && msg.to === "all")
                );

                // Sort by timestamp
                return {
                  peerAgent,
                  messages: threadMessages.sort(
                    (a, b) => a.timestamp - b.timestamp
                  ),
                };
              });

              // Also include messages to "all" or general messages from primary
              const generalMessages = discussion.messages.filter(
                (msg) =>
                  !conversationThreads.some((thread) =>
                    thread.messages.some((m) => m.messageId === msg.messageId)
                  )
              );

              return (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Parallel Discussions
                  </h4>

                  {/* Display threads in a grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {conversationThreads.map((thread) => {
                      const peerColors = getAgentColor(thread.peerAgent.id);
                      const primaryColors = getAgentColor(primaryAgentId);

                      return (
                        <div
                          key={thread.peerAgent.id}
                          className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                        >
                          <div
                            className={`mb-2 p-2 rounded ${peerColors.bg} border ${peerColors.border}`}
                          >
                            <p
                              className={`text-xs font-semibold ${peerColors.text}`}
                            >
                              {thread.peerAgent.name}
                            </p>
                          </div>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {thread.messages.length > 0 ? (
                              thread.messages.map((message) => {
                                const isFromPrimary =
                                  message.from === primaryAgentId;
                                const colors = isFromPrimary
                                  ? primaryColors
                                  : peerColors;
                                const agent = discussion.agents.find(
                                  (a) => a.id === message.from
                                );
                                const agentName = agent?.name || message.from;

                                return (
                                  <div
                                    key={message.messageId}
                                    className={`p-2 rounded-lg border-l-4 ${colors.border} ${colors.bg}`}
                                  >
                                    <p
                                      className={`text-xs ${colors.text} leading-relaxed whitespace-pre-wrap`}
                                    >
                                      <span className="font-semibold">
                                        {agentName}:
                                      </span>{" "}
                                      {message.content}
                                    </p>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-gray-500 italic">
                                No messages yet...
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* General messages (to "all" or synthesis messages) */}
                  {generalMessages.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-xs font-semibold text-gray-600 mb-2">
                        General Discussion
                      </h5>
                      <div className="space-y-2">
                        {generalMessages.map((message) => {
                          const colors = getAgentColor(message.from);
                          const agent = discussion.agents.find(
                            (a) => a.id === message.from
                          );
                          const agentName = agent?.name || message.from;

                          return (
                            <div
                              key={message.messageId}
                              className={`p-3 rounded-lg border-l-4 ${colors.border} ${colors.bg}`}
                            >
                              <p
                                className={`text-sm ${colors.text} leading-relaxed whitespace-pre-wrap`}
                              >
                                <span className="font-semibold">
                                  {agentName}:
                                </span>{" "}
                                {message.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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

      {/* Agent Card Modal */}
      {selectedAgentCard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[90vh] shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Agent Card</h3>
              <button
                onClick={() => setSelectedAgentCard(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedAgentCard.card ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg mb-2">
                    {selectedAgentCard.card.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {selectedAgentCard.card.description}
                  </p>
                  <div className="text-xs text-gray-500">
                    Version: {selectedAgentCard.card.version}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-semibold mb-2">Capabilities</h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">
                        Supported Modalities:{" "}
                      </span>
                      <span className="text-gray-600">
                        {selectedAgentCard.card.capabilities.supportedModalities.join(
                          ", "
                        )}
                      </span>
                    </div>
                    {selectedAgentCard.card.capabilities.supportedTasks && (
                      <div>
                        <span className="font-medium">Supported Tasks: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAgentCard.card.capabilities.supportedTasks.map(
                            (task) => (
                              <span
                                key={task}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                              >
                                {task}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {selectedAgentCard.card.capabilities.maxConcurrentTasks && (
                      <div>
                        <span className="font-medium">
                          Max Concurrent Tasks:{" "}
                        </span>
                        <span className="text-gray-600">
                          {
                            selectedAgentCard.card.capabilities
                              .maxConcurrentTasks
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="font-semibold mb-2">Endpoints</h5>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Base URL: </span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {selectedAgentCard.card.endpoints.baseUrl}
                      </code>
                    </div>
                    {selectedAgentCard.card.endpoints.tasks && (
                      <div>
                        <span className="font-medium">Tasks: </span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedAgentCard.card.endpoints.tasks}
                        </code>
                      </div>
                    )}
                    {selectedAgentCard.card.endpoints.health && (
                      <div>
                        <span className="font-medium">Health: </span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedAgentCard.card.endpoints.health}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAgentCard.card.authentication &&
                  selectedAgentCard.card.authentication.length > 0 && (
                    <div className="border-t pt-4">
                      <h5 className="font-semibold mb-2">Authentication</h5>
                      <div className="space-y-2 text-sm">
                        {selectedAgentCard.card.authentication.map(
                          (auth, idx) => (
                            <div key={idx}>
                              <span className="font-medium">Type: </span>
                              <span className="text-gray-600">{auth.type}</span>
                              {auth.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {auth.description}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {loadingAgentCard
                    ? "Loading agent card..."
                    : "Failed to load agent card"}
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedAgentCard(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
