import { Badge } from "@/client/components/ui/badge";
import { Card } from "@/client/components/ui/card";
import type { getCitationRun } from "@/serverFunctions/citations";
import { compareNap, type NapFieldResult } from "@/shared/nap";

type RunDetail = Awaited<ReturnType<typeof getCitationRun>>;

const NAP_FIELDS = [
  ["name", "Name"],
  ["address", "Address"],
  ["phone", "Phone"],
] as const;

export function ReferenceNap({
  reference,
}: {
  reference: RunDetail["reference"];
}) {
  const known = NAP_FIELDS.filter(([key]) => reference[key]);
  if (known.length === 0) {
    return (
      <Card className="px-5 py-3 text-sm text-muted-foreground">
        No Google Business Profile details are saved for this check, so listing
        details can't be compared.
      </Card>
    );
  }
  return (
    <Card className="gap-1 px-5 py-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Google Business Profile (listings are compared to this)
      </p>
      <p>{known.map(([key]) => reference[key]).join(" · ")}</p>
    </Card>
  );
}

const FIELD_STYLE: Record<NapFieldResult, string> = {
  match: "text-muted-foreground",
  mismatch: "font-medium text-destructive",
  missing: "text-muted-foreground/60 italic",
};

export function ListingNap({
  listing,
  reference,
}: {
  listing: RunDetail["results"][number]["listings"][number];
  reference: RunDetail["reference"];
}) {
  if (!listing.nap) return null;
  if (listing.nap.status === "unreadable") {
    return (
      <p className="text-xs text-muted-foreground">
        Couldn't read the details on this page (the directory may block
        automated visits).
      </p>
    );
  }
  const comparison = compareNap(reference, listing.found);
  const badge =
    comparison.status === "match"
      ? { label: "NAP matches", variant: "success" as const }
      : comparison.status === "mismatch"
        ? { label: "NAP mismatch", variant: "destructive" as const }
        : { label: "Partly checked", variant: "secondary" as const };
  return (
    <div className="space-y-0.5">
      <Badge variant={badge.variant}>{badge.label}</Badge>
      {NAP_FIELDS.map(([key, label]) => (
        <p key={key} className={`text-xs ${FIELD_STYLE[comparison[key]]}`}>
          {label}: {listing.found[key] ?? "not shown"}
        </p>
      ))}
    </div>
  );
}
