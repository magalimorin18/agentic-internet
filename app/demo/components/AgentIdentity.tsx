"use client";

import { useState } from "react";

type RelatedArticle = {
  url: string;
  summary: string;
};

type AgentInitResult = {
  message: string;
  summary?: string;
  url?: string;
  relatedArticles?: RelatedArticle[];
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
        <strong>Source:</strong>{" "}
        {url && (url.startsWith("http://") || url.startsWith("https://")) ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {url}
          </a>
        ) : (
          url
        )}
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
          {initResult.relatedArticles &&
            initResult.relatedArticles.length > 0 && (
              <div className="mt-4">
                <strong>Related Articles:</strong>
                <div className="mt-2 space-y-3">
                  {initResult.relatedArticles.map((article, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white rounded-lg border border-gray-200"
                    >
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium block mb-1"
                      >
                        {article.url}
                      </a>
                      <p className="text-xs text-gray-600">{article.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
