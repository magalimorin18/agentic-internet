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
};

export default function ClaimsTable({
  claims: initialClaims,
}: ClaimsTableProps = {}) {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  // Use props if provided, otherwise show empty state (prompting user to click GET CLAIMS)
  const claims = initialClaims !== undefined ? initialClaims : [];

  return (
    <div>
      <table className="w-full border border-gray-200 rounded-xl">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Claim</th>
            <th className="p-3 text-left">Score</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {claims.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-3 text-center text-gray-500">
                No claims extracted yet. Click &quot;GET CLAIMS&quot; to extract
                claims from the agent&apos;s knowledge.
              </td>
            </tr>
          ) : (
            claims.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.claim}</td>
                <td className="p-3">{c.score ?? "—"}</td>
                <td className="p-3">
                  <button
                    onClick={() => setSelectedClaim(c)}
                    className="px-4 py-1 bg-black text-white rounded-lg"
                  >
                    Ask another agent
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedClaim && (
        <PeerDiscussionModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
