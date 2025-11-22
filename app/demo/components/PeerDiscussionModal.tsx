"use client";

import { getPeerDiscussion } from "@/libs/mockDiscussion";

export default function PeerDiscussionModal({ claim, onClose }: any) {
  const summary = getPeerDiscussion(claim.id);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
      <div className="bg-white p-6 rounded-xl w-[400px] shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Peer Agent Discussion</h3>

        <p className="text-sm text-gray-600 mb-2">
          <strong>Claim:</strong> {claim.claim}
        </p>

        <p className="mb-4">{summary}</p>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-black text-white rounded-lg mt-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}
