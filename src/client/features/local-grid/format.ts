import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { estimateLocalGridCost } from "@/shared/local-grid";

/** Hosted users pay the marked-up price; self-hosters pay DataForSEO directly. */
export function formatGridCost(gridSize: number) {
  const cost = estimateLocalGridCost(gridSize);
  const usd = isHostedClientAuthMode() ? cost.billedUsd : cost.rawUsd;
  return usd < 0.01 ? "<$0.01" : `~$${usd.toFixed(2)}`;
}

export function formatRunDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
