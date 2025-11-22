export default function AgentIdentity({ url }: { url: string }) {
  return (
    <div className="p-4 border rounded-xl mb-6 bg-gray-50">
      <h3 className="font-semibold text-lg mb-2">Agent Identity</h3>
      <p>
        <strong>Source:</strong> {url}
      </p>
      <p>
        <strong>DID:</strong> did:agentic:123abc
      </p>
      <p>
        <strong>Public Key:</strong> 0x91fe23a1bb93ff
      </p>
    </div>
  );
}
