"use client";

import { useState } from "react";

type Claim = {
  id: string;
  claim: string;
  score?: number;
};

type GetClaimsButtonProps = {
  url: string;
  onClaimsFetched: (claims: Claim[]) => void;
};

export default function GetClaimsButton({
  url,
  onClaimsFetched,
}: GetClaimsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleGetClaims() {
    if (!url || url === "Unknown") {
      alert("No URL available. Please initialize an agent first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract claims");
      }

      onClaimsFetched(data.claims || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
      alert(
        `Failed to extract claims: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleGetClaims}
      disabled={isLoading}
      className="px-5 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Extracting Claims..." : "GET CLAIMS"}
    </button>
  );
}

