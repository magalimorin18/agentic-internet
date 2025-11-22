/* eslint-disable @typescript-eslint/no-explicit-any */
import AgentIdentity from "../components/AgentIdentity";
import ClaimsTable from "../components/ClaimsTable";

export default async function AgentPage({ searchParams }: any) {
  const resolvedSearchParams = await searchParams;
  const url = resolvedSearchParams.url ?? "Unknown";

  return (
    <main className="p-12 max-w-3xl mx-auto">
      <h2 className="text-3xl font-semibold mb-4">Document Agent</h2>

      <AgentIdentity url={url} />

      <h3 className="text-xl font-semibold mb-3">Extracted Claims</h3>
      <ClaimsTable />
    </main>
  );
}
