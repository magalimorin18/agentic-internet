export default function MiniGraph() {
  return (
    <svg width="200" height="150" className="mx-auto mt-6">
      <circle cx="100" cy="20" r="15" fill="#000" />
      <text x="100" y="60" textAnchor="middle">
        Your Doc
      </text>

      <circle cx="40" cy="110" r="12" fill="#444" />
      <text x="40" y="140" textAnchor="middle">
        Peer 1
      </text>

      <circle cx="160" cy="110" r="12" fill="#444" />
      <text x="160" y="140" textAnchor="middle">
        Peer 2
      </text>

      <line x1="100" y1="20" x2="40" y2="110" stroke="black" />
      <line x1="100" y1="20" x2="160" y2="110" stroke="black" />
    </svg>
  );
}
