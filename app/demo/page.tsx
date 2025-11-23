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

      // Store the URL separately in sessionStorage for easy access
      sessionStorage.setItem("agentUrl", url);

      // Navigate to the agent page after successful initialization
      router.push("/demo/agent");
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

  const exampleLinks = [
    {
      title: "Suitable Conditions for Mycelial Growth of Phellinus spp",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3755185/",
    },
    {
      title: "CRISPR-Cas9: A Revolutionary Gene Editing Technology",
      url: "https://www.nature.com/articles/nature24644",
    },
    {
      title: "Role of glucosyltransferase R in biofilm interactions",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7174356/",
    },
  ];

  return (
    <main className="p-12 max-w-xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6">
        Transform Research Papers into AI Agents
      </h2>
      <p className="text-gray-600 mb-8">
        Convert any research paper into an autonomous AI agent that can extract
        claims, engage in peer review discussions and reach consensus with other
        document agents.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Research Paper URL
        </label>
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
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">
            Or try one of these example papers:
          </p>
          <div className="space-y-2">
            {exampleLinks.map((example, index) => (
              <button
                key={index}
                onClick={() => setUrl(example.url)}
                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:underline p-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                {example.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Peer Agent Reviewers
        </label>
        <p className="text-xs text-gray-500 mb-2">
          This determines how many related articles will be found and converted
          into peer review agents. Each peer agent will have a separate
          discussion with the primary agent about the claims. The final
          confidence score will be the average of all individual discussions.
        </p>
        <input
          type="number"
          min="1"
          className="border p-3 rounded w-full"
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
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="mt-4 px-5 py-2 bg-black text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Initializing Agents..." : "Create Agents"}
      </button>
    </main>
  );
}
