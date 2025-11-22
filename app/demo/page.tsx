"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    setIsLoading(true);
    try {
      // Initialize the agent with the URL
      const response = await fetch("/api/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize agent");
      }

      console.log("Agent initialized:", data);

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

  async function handleInitAgent() {
    try {
      const response = await fetch("/api/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      console.log("API Response:", data);
    } catch (error) {
      console.error("Error calling API:", error);
    }
  }

  return (
    <main className="p-12 max-w-xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6">Generate an Agent</h2>

      <input
        className="border p-3 rounded w-full"
        placeholder="Paste research paper URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
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

      <button
        onClick={handleInitAgent}
        className="mt-4 ml-4 px-5 py-2 bg-blue-600 text-white rounded-xl"
      >
        Initialize Agent (Test API)
      </button>
    </main>
  );
}
