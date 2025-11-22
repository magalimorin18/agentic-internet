/* eslint-disable @typescript-eslint/no-explicit-any */
import AgentIdentity from "../components/AgentIdentity";
import ClaimsSection from "../components/ClaimsSection";

export default async function AgentPage({ searchParams }: any) {
  const resolvedSearchParams = await searchParams;
  const url = resolvedSearchParams.url ?? "Unknown";

  return (
    <main className="p-12 max-w-3xl mx-auto">
      <h2 className="text-3xl font-semibold mb-4">Document Agent</h2>

      <AgentIdentity url={url} />

      <ClaimsSection url={url} />
    </main>
  );
}
