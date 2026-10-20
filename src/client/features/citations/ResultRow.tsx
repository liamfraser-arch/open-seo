import { ExternalLink } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { TableCell, TableRow } from "@/client/components/ui/table";
import { ListingNap } from "@/client/features/citations/ListingNap";
import type { getCitationRun } from "@/serverFunctions/citations";

type RunDetail = Awaited<ReturnType<typeof getCitationRun>>;
type Status = RunDetail["results"][number]["status"];

const STATUS_BADGE: Record<
  Status,
  { label: string; variant: "success" | "secondary" | "outline" }
> = {
  found: { label: "Listed", variant: "success" },
  missing: { label: "Not found", variant: "secondary" },
  error: { label: "Search failed", variant: "outline" },
  pending: { label: "Waiting", variant: "outline" },
  checking: { label: "Checking…", variant: "outline" },
};

export function ResultRow({
  result,
  reference,
}: {
  result: RunDetail["results"][number];
  reference: RunDetail["reference"];
}) {
  const badge = STATUS_BADGE[result.status];
  const changed =
    result.previousStatus &&
    result.previousStatus !== result.status &&
    result.status !== "pending" &&
    result.status !== "checking";

  return (
    <TableRow>
      <TableCell className="font-medium">{result.directoryName}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {changed ? (
            <span className="text-xs text-muted-foreground">
              was{" "}
              {STATUS_BADGE[
                result.previousStatus ?? "missing"
              ].label.toLowerCase()}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <ul className="space-y-3">
          {result.listings.map((listing) => (
            <li key={listing.url} className="space-y-1">
              <a
                href={listing.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-md items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <span className="truncate">{listing.title ?? listing.url}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
              <ListingNap listing={listing} reference={reference} />
            </li>
          ))}
        </ul>
      </TableCell>
    </TableRow>
  );
}
