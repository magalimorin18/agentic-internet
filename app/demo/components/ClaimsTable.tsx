"use client";

import { useState } from "react";
import PeerDiscussionModal from "./PeerDiscussionModal";
import { mockClaims } from "@/libs/mockClaims";

export default function ClaimsTable() {
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);

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
          {mockClaims.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.claim}</td>
              <td className="p-3">{c.score}</td>
              <td className="p-3">
                <button
                  onClick={() => setSelectedClaim(c)}
                  className="px-4 py-1 bg-black text-white rounded-lg"
                >
                  Ask another agent
                </button>
              </td>
            </tr>
          ))}
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
