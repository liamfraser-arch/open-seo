import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";

export type PresentSection =
  | "overview"
  | "progress"
  | "map"
  | "rankings"
  | "listings"
  | "search";

export const PRESENT_SECTIONS: { id: PresentSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "progress", label: "Progress" },
  { id: "map", label: "Google Maps" },
  { id: "rankings", label: "Google rankings" },
  { id: "listings", label: "Directory listings" },
  { id: "search", label: "Search traffic & site health" },
];

type Tone = "good" | "okay" | "poor" | "none";

const TONE_BAR: Record<Tone, string> = {
  good: "bg-success",
  okay: "bg-warning",
  poor: "bg-destructive",
  none: "bg-muted-foreground/30",
};

/** One question, one big number, one bar. Meant to be read across a table. */
export function BigStat({
  question,
  value,
  unit,
  percent,
  tone,
  note,
  projectId,
  section,
}: {
  question: string;
  value: string;
  unit?: string;
  percent: number;
  tone: Tone;
  note: ReactNode;
  projectId: string;
  section: PresentSection;
}) {
  return (
    <Link
      to="/p/$projectId/present"
      params={{ projectId }}
      search={{ section }}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
    >
      <p className="text-base font-medium text-muted-foreground">{question}</p>
      <p className="text-6xl font-semibold tracking-tight tabular-nums">
        {value}
        {unit ? (
          <span className="ml-2 text-xl font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", TONE_BAR[tone])}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <p className="text-base text-muted-foreground">{note}</p>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
        See details
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function toneForShare(share: number): Tone {
  if (share >= 60) return "good";
  if (share >= 30) return "okay";
  return "poor";
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-lg text-muted-foreground">
      {children}
    </div>
  );
}
