"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [numPeerReviewers, setNumPeerReviewers] = useState("2");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    setIsLoading(true);
    try {
      // Initialize the agent with the URL
      const numReviewers = parseInt(numPeerReviewers, 10);
      if (isNaN(numReviewers) || numReviewers < 1) {
        alert("Please enter a valid number of peer reviewers (1 or more)");
        return;
      }

      const response = await fetch("/api/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, numPeerReviewers: numReviewers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize agent");
      }

      console.log("Agent initialized:", data);

      // Store the initialization result in sessionStorage
      sessionStorage.setItem("agentInitResult", JSON.stringify(data));

      // Navigate to the agent page after successful initialization
      router.push(`/demo/agent?url=${encodeURIComponent(url)}`);
    } catch (error) {
      console.error("Error initializing agent:", error);
      alert(
        `Failed to initialize agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="p-12 max-w-xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6">Generate an Agent</h2>

      <input
        className="border p-3 rounded w-full mb-4"
        placeholder="Paste research paper URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading) {
            handleSubmit();
          }
        }}
      />

      <input
        type="number"
        min="1"
        className="border p-3 rounded w-full mb-4"
        placeholder="Number of Peer Agent Reviewers"
        value={numPeerReviewers}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "" || /^\d+$/.test(value)) {
            setNumPeerReviewers(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading) {
            handleSubmit();
          }
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="mt-4 px-5 py-2 bg-black text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Initializing Agent..." : "Create Agent"}
      </button>
    </main>
  );
}
