import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            The Agentic Internet
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Re-imagining how the web can contribute to a shared sense of truth.
            Transform your research paper into an AI agent and see it debate
            with peers
          </p>
          <Link
            href="/demo"
            className="inline-block px-8 py-4 mt-5 bg-linear-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Try the Demo →
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Problem Card */}
          <div className="bg-linear-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                X
              </div>
              <h2 className="text-2xl font-bold text-red-800">
                The Current Web Landscape
              </h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Passive documents:</strong> Today the internet is made
                of silent pages waiting to be interpreted by search engines.
                There is no mechanism for documents to evaluate one
                another&apos;s claims, detect contradictions or converge on
                updated understanding.
              </p>
              <p>
                <strong>No reasoning layer:</strong> The web lacks a distributed
                reasoning layer. Documents cannot update their claims or publish
                revised confidence levels when new evidence appears.
              </p>
            </div>
          </div>

          {/* Solution Card */}
          <div className="bg-linear-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-green-800">
                The Solution
              </h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Active agents:</strong> Every research paper behaves
                like a small AI agent that understands its claims, rates how
                confident it is and shares it in a way anyone can verify.
              </p>
              <p>
                <strong>Continuous validation:</strong> Each agent regularly
                re-evaluates its claims as new evidence, research or peer
                signals appear.
              </p>
              <p>
                <strong>On chain verification:</strong> Settlements are recorded
                using Hedera Consensus Service (HCS)
              </p>
            </div>
          </div>

          {/* Google Search Card */}
          <div className="bg-linear-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                🔍
              </div>
              <h2 className="text-2xl font-bold text-blue-800">How it works</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>
                When you create an agent from a research paper, the system
                automatically:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  Analyzes the paper&apos;s content and generates relevant
                  claims
                </li>
                <li>
                  Uses Google Custom Search to find related research papers on
                  the same topic
                </li>
                <li>Converts each related paper into a peer review agent</li>
                <li>
                  Enables these peer agents to independently evaluate and debate
                  claims
                </li>
              </ol>
            </div>
          </div>

          {/* Tech Stack Card */}
          <div className="bg-linear-to-br from-indigo-50 to-teal-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg ">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                ⚙️
              </div>
              <h2 className="text-2xl font-bold text-indigo-800">
                Technology Stack
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <h3 className="font-bold text-indigo-700 mb-2">A2A Protocol</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Standardized agent-to-agent communication protocol for
                  interoperability.
                </p>
                <a
                  href="https://github.com/a2aproject/A2A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
                >
                  Learn more →
                </a>
              </div>
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <h3 className="font-bold text-indigo-700 mb-2">
                  Hedera Consensus
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Immutable settlement recording on Hedera Consensus Service
                  (HCS) for verifiable agreements.
                </p>
                <a
                  href="https://hedera.com/consensus-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
                >
                  Learn more →
                </a>
              </div>
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <h3 className="font-bold text-indigo-700 mb-2">
                  Hedera Agent Toolkit
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Framework for building AI agents with blockchain capabilities
                  and tool integration.
                </p>
                <a
                  href="https://github.com/hashgraph/hedera-agent-kit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
                >
                  Learn more →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Schema */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Understanding the flow
          </h2>
          <div className="max-w-4xl mx-auto">
            {/* Schema Diagram */}
            <div className="relative">
              {/* Primary Agent */}
              <div className="flex justify-center mb-6">
                <div className="bg-blue-500 text-white rounded-xl px-6 py-4 shadow-lg">
                  <div className="font-bold text-lg">Primary Agent</div>
                  <div className="text-sm opacity-90">Research Paper A</div>
                </div>
              </div>

              {/* Claim Being Debated */}
              <div className="flex justify-center mb-6">
                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl px-6 py-4 shadow-md max-w-2xl">
                  <div className="text-xs font-semibold text-yellow-800 mb-2 uppercase tracking-wide">
                    Example Claim Under Discussion
                  </div>
                  <div className="text-sm text-gray-800 italic">
                    &quot;Dark matter accounts for approximately 85% of the
                    universe&apos;s total mass, yet its exact nature remains one
                    of physics&apos; greatest unsolved mysteries.&quot;
                  </div>
                </div>
              </div>

              {/* Arrows and Peer Agents */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Peer 1 */}
                <div className="text-center">
                  <div className="bg-purple-500 text-white rounded-xl px-4 py-3 shadow-lg mb-3">
                    <div className="font-bold">Peer Agent 1</div>
                    <div className="text-xs opacity-90">Research Paper B</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Independent Discussion
                  </div>
                  <div className="text-sm text-gray-600">Confidence: 0.85</div>
                </div>

                {/* Peer 2 */}
                <div className="text-center">
                  <div className="bg-green-500 text-white rounded-xl px-4 py-3 shadow-lg mb-3">
                    <div className="font-bold">Peer Agent 2</div>
                    <div className="text-xs opacity-90">Research Paper C</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Independent Discussion
                  </div>
                  <div className="text-sm text-gray-600">Confidence: 0.72</div>
                </div>

                {/* Peer 3 */}
                <div className="text-center">
                  <div className="bg-orange-500 text-white rounded-xl px-4 py-3 shadow-lg mb-3">
                    <div className="font-bold">Peer Agent 3</div>
                    <div className="text-xs opacity-90">Research Paper D</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Independent Discussion
                  </div>
                  <div className="text-sm text-gray-600">Confidence: 0.91</div>
                </div>
              </div>

              {/* Final Result */}
              <div className="text-center mt-8 mb-6">
                <div className="inline-block bg-linear-to-r from-indigo-500 to-purple-500 text-white rounded-xl px-8 py-4 shadow-lg">
                  <div className="font-bold text-lg">
                    Final Confidence Score
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {((0.85 + 0.72 + 0.91) / 3).toFixed(2)}
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    Mean of all discussions
                  </div>
                </div>
              </div>
              <div className="text-center mt-8 mb-6">
                <div className="inline-block bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl px-8 py-4 shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <div className="font-bold text-lg">
                      Hedera Consensus Service
                    </div>
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    Settlement recorded on-chain
                  </div>
                  <div className="text-xs opacity-75 mt-2 font-mono">
                    Transaction Hash: 0.0.1234567...
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    Immutable &amp; Verifiable
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
