"use client";

import { useState, useEffect } from "react";
import type { AgentDiscussion, A2AMessage } from "@/types/a2a";

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

  useEffect(() => {
    if (claim && url) {
      fetchDiscussion();
    }
  }, [claim, url]);

  async function fetchDiscussion() {
    if (!url || url === "Unknown") {
      setError("URL is required for agent discussion");
      return;
    }

    setIsLoading(true);
    setError(null);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start agent discussion");
      }

      setDiscussion(data.discussion);
    } catch (err) {
      console.error("Error fetching discussion:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start agent discussion"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function getMessageTypeColor(type: A2AMessage["type"]): string {
    switch (type) {
      case "agreement":
        return "bg-green-100 text-green-800";
      case "disagreement":
        return "bg-red-100 text-red-800";
      case "settlement":
        return "bg-blue-100 text-blue-800";
      case "query":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-50 text-gray-700";
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
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

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Claim:</strong> {claim.claim}
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Initializing agents and starting discussion...</p>
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
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">Participants:</p>
              <div className="flex gap-4">
                {discussion.agents.map((agent) => (
                  <div key={agent.id} className="text-sm">
                    <span className="font-semibold">{agent.name}</span>
                    {agent.role && (
                      <span className="text-gray-600"> ({agent.role})</span>
                    )}
                    {agent.did && (
                      <p className="text-xs text-gray-500 mt-1">{agent.did}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 mb-4">
              <p className="text-sm font-semibold text-gray-700">Conversation:</p>
              {discussion.messages.map((message: A2AMessage) => {
                const agent = discussion.agents.find((a) => a.id === message.from);
                return (
                  <div
                    key={message.messageId}
                    className="p-3 border rounded-lg bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {agent?.name || message.from}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getMessageTypeColor(
                            message.type
                          )}`}
                        >
                          {message.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {message.metadata?.confidence && (
                      <p className="text-xs text-gray-500 mt-2">
                        Confidence: {message.metadata.confidence}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Final Agreement */}
            {discussion.finalAgreement && (
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="font-semibold mb-2">Final Agreement:</p>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-3 py-1 rounded font-semibold ${
                      discussion.finalAgreement.status === "agreed"
                        ? "bg-green-200 text-green-800"
                        : discussion.finalAgreement.status === "disagreed"
                        ? "bg-red-200 text-red-800"
                        : "bg-yellow-200 text-yellow-800"
                    }`}
                  >
                    {discussion.finalAgreement.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    Confidence: {discussion.finalAgreement.confidence}
                  </span>
                </div>
                {discussion.finalAgreement.settlementHash && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Hedera Settlement:</p>
                    <code className="text-xs bg-white p-2 rounded border block break-all">
                      {discussion.finalAgreement.settlementHash}
                    </code>
                  </div>
                )}
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
