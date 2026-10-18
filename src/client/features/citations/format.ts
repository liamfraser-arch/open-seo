import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { estimateCitationCheckCost } from "@/shared/citations";

/** The ceiling: most directories are found by the first, cheap search. Hosted users pay the marked-up price; self-hosters pay DataForSEO directly. */
export function formatCitationCheckCost(locationCode: number) {
  const cost = estimateCitationCheckCost(locationCode);
  const usd = isHostedClientAuthMode() ? cost.billedUsd : cost.rawUsd;
  return `up to $${usd.toFixed(2)}`;
}
