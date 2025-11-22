export function getPeerDiscussion(claimId: string) {
  const discussions: Record<string, string> = {
    "1": "Peer Agent confirms similar findings in 2023 survey but notes diminishing returns after scale. Confidence updated slightly downward.",
    "2": "Peer Agent provides contradictory evidence on RLHF effectiveness for edge cases. Confidence decreases moderately.",
    "3": "Peer Agent strongly supports claim with additional benchmarks. Confidence increases.",
  };

  return discussions[claimId] ?? "I don't know.";
}
