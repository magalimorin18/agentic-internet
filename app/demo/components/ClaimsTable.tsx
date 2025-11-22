"use client";

import { useState } from "react";
import PeerDiscussionModal from "./PeerDiscussionModal";

type Claim = {
  id: string;
  claim: string;
  score?: number;
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

  // Use props if provided, otherwise show empty state (prompting user to click GET CLAIMS)
  const claims = initialClaims !== undefined ? initialClaims : [];

  const handleAskAgents = (claim: Claim) => {
    setSelectedClaim(claim);
  };

  const handleCloseModal = () => {
    setSelectedClaim(null);
  };

  return (
    <div className="space-y-4">
      {claims.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600 font-medium mb-2">
              No claims extracted yet
            </p>
            <p className="text-sm text-gray-500">
              Click &quot;GET CLAIMS&quot; to extract claims from the
              agent&apos;s knowledge.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((c, claimIndex) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Claim Number Badge */}
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                    {claimIndex + 1}
                  </div>
                </div>

                {/* Claim Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 leading-relaxed mb-3">
                    {c.claim}
                  </p>

                  {/* Action Button */}
                  <button
                    onClick={() => handleAskAgents(c)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                    title="Start discussion between all agents"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span>ASK AGENTS</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedClaim && (
        <PeerDiscussionModal
          claim={selectedClaim}
          url={url}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
