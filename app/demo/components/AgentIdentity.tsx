"use client";

import { useState } from "react";

type AgentInitResult = {
  message: string;
  summary?: string;
  url?: string;
  error?: string;
};

function getStoredInitResult(): AgentInitResult | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem("agentInitResult");
  if (stored) {
    try {
      return JSON.parse(stored) as AgentInitResult;
    } catch (error) {
      console.error("Error parsing stored agent init result:", error);
      return null;
    }
  }
  return null;
}

export default function AgentIdentity({ url }: { url: string }) {
  const [initResult] = useState<AgentInitResult | null>(() =>
    getStoredInitResult()
  );

  return (
    <div className="p-4 border rounded-xl mb-6 bg-gray-50">
      <h3 className="font-semibold text-lg mb-2">Agent Identity</h3>
      <p className="mb-2">
        <strong>Source:</strong> {url}
      </p>
      {initResult && (
        <>
          <p className="mb-2">
            <strong>Status:</strong> {initResult.message}
          </p>
          {initResult.summary && (
            <div className="mt-3">
              <strong>Summary:</strong>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                {initResult.summary}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
