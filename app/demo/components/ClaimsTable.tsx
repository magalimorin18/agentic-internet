"use client";

import { useState } from "react";
import PeerDiscussionModal from "./PeerDiscussionModal";

type Claim = {
  id: string;
  claim: string;
  score?: number;
};

type RelatedArticle = {
  url: string;
  summary: string;
};

type ClaimsTableProps = {
  claims?: Claim[];
  url?: string;
};

export default function ClaimsTable({
  claims: initialClaims,
  url,
}: ClaimsTableProps = {}) {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedRelatedArticleUrl, setSelectedRelatedArticleUrl] = useState<
    string | null
  >(null);

  // Use props if provided, otherwise show empty state (prompting user to click GET CLAIMS)
  const claims = initialClaims !== undefined ? initialClaims : [];

  // Get related articles from sessionStorage
  let relatedArticles: RelatedArticle[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("agentInitResult");
      if (stored) {
        const initResult = JSON.parse(stored);
        relatedArticles = initResult.relatedArticles || [];
      }
    } catch (error) {
      console.error("Error reading related articles:", error);
    }
  }

  const handleAskReview = (claim: Claim, relatedArticleUrl: string) => {
    setSelectedClaim(claim);
    setSelectedRelatedArticleUrl(relatedArticleUrl);
  };

  const handleCloseModal = () => {
    setSelectedClaim(null);
    setSelectedRelatedArticleUrl(null);
  };

  // Calculate colspan for empty state
  const emptyStateColspan =
    1 + (relatedArticles.length > 0 ? relatedArticles.length : 1);

  return (
    <div>
      <table className="w-full border border-gray-200 rounded-xl">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Claim</th>
            {relatedArticles.length > 0 ? (
              relatedArticles.map((article, index) => (
                <th key={index} className="p-3 text-left">
                  Action
                </th>
              ))
            ) : (
              <th className="p-3 text-left">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {claims.length === 0 ? (
            <tr>
              <td
                colSpan={emptyStateColspan}
                className="p-3 text-center text-gray-500"
              >
                No claims extracted yet. Click &quot;GET CLAIMS&quot; to extract
                claims from the agent&apos;s knowledge.
              </td>
            </tr>
          ) : (
            claims.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.claim}</td>
                {relatedArticles.length > 0 ? (
                  relatedArticles.map((article, index) => {
                    let displayUrl = article.url;
                    try {
                      displayUrl = new URL(article.url).hostname;
                    } catch {
                      // If URL parsing fails, use the full URL truncated
                      displayUrl =
                        article.url.length > 30
                          ? article.url.substring(0, 30) + "..."
                          : article.url;
                    }
                    return (
                      <td key={index} className="p-3">
                        <button
                          onClick={() => handleAskReview(c, article.url)}
                          className="px-4 py-1 bg-black text-white rounded-lg text-sm whitespace-nowrap"
                          title={`Ask review on ${article.url}`}
                        >
                          Ask Review on {displayUrl}
                        </button>
                      </td>
                    );
                  })
                ) : (
                  <td className="p-3">
                    <button
                      onClick={() => handleAskReview(c, "")}
                      className="px-4 py-1 bg-black text-white rounded-lg"
                      disabled
                    >
                      No related articles
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedClaim && (
        <PeerDiscussionModal
          claim={selectedClaim}
          url={url}
          relatedArticleUrl={selectedRelatedArticleUrl || undefined}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
