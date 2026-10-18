import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { estimateProspectSearchCost } from "@/shared/prospects";

/** Hosted users pay the marked-up price; self-hosters pay DataForSEO directly. */
export function formatProspectSearchCost() {
  const cost = estimateProspectSearchCost();
  const usd = isHostedClientAuthMode() ? cost.billedUsd : cost.rawUsd;
  return usd < 0.01 ? "<$0.01" : `~$${usd.toFixed(2)}`;
}
