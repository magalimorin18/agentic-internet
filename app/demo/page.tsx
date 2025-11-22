"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function handleSubmit() {
    router.push(`/demo/agent?url=${encodeURIComponent(url)}`);
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
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="mt-4 px-5 py-2 bg-black text-white rounded-xl"
      >
        Create Agent
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
