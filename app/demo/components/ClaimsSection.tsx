"use client";

import { useState } from "react";
import GetClaimsButton from "./GetClaimsButton";
import ClaimsTable from "./ClaimsTable";

type Claim = {
  id: string;
  claim: string;
  score?: number;
};

type ClaimsSectionProps = {
  url: string;
};

export default function ClaimsSection({ url }: ClaimsSectionProps) {
  const [claims, setClaims] = useState<Claim[] | null>(null);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold">Extracted Claims</h3>
        <GetClaimsButton url={url} onClaimsFetched={setClaims} />
      </div>
      <ClaimsTable claims={claims ?? undefined} url={url} />
    </>
  );
}
