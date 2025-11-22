import Link from "next/link";

export default function Page() {
  return (
    <main className="p-12 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">The Agentic Internet</h1>
      <p className="text-lg mb-4">
        A demo showing how documents can behave like autonomous AI agents:
        extracting claims, assigning confidence, messaging peers, and updating
        beliefs.
      </p>

      <Link
        href="/demo"
        className="px-6 py-3 bg-black text-white rounded-xl mt-6 inline-block"
      >
        Try the Demo →
      </Link>
    </main>
  );
}
