import { ExternalLink, UserPlus, MapPin, Phone } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { TableCell, TableRow } from "@/client/components/ui/table";
import type { getProspectSearch } from "@/serverFunctions/prospects";
import { PROSPECT_STATUSES, type ProspectStatus } from "@/shared/prospects";
import { cn } from "cn";

type Prospect = Awaited<
  ReturnType<typeof getProspectSearch>
>["prospects"][number];

export const STATUS_LABEL: Record<ProspectStatus, string> = {
  new: "New",
  contacted: "Contacted",
  won: "Won",
  passed: "Not a fit",
};
const STATUS_ITEMS = PROSPECT_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

/** Opens the business's Google Maps profile. */
function mapsUrl(prospect: Prospect) {
  if (prospect.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospect.title)}&query_place_id=${encodeURIComponent(prospect.placeId)}`;
  }
  if (prospect.cid) {
    return `https://maps.google.com/?cid=${encodeURIComponent(prospect.cid)}`;
  }
  return null;
}

function scoreTone(score: number) {
  if (score >= 60) return "bg-destructive/15 text-destructive";
  if (score >= 35) return "bg-warning/20 text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

export function ProspectRow({
  prospect,
  onStatus,
  onCreateClient,
}: {
  prospect: Prospect;
  onStatus: (status: ProspectStatus) => void;
  onCreateClient: () => void;
}) {
  const maps = mapsUrl(prospect);
  return (
    <TableRow>
      <TableCell>
        <span
          className={cn(
            "inline-flex min-w-9 justify-center rounded-md px-2 py-1 font-mono text-sm font-semibold",
            scoreTone(prospect.score),
          )}
          title="How much help this business could use, out of 100"
        >
          {prospect.score}
        </span>
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="truncate font-medium">{prospect.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[prospect.category, `#${prospect.rank} on Maps`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {prospect.address ? (
          <p className="truncate text-xs text-muted-foreground">
            {prospect.address}
          </p>
        ) : null}
        {prospect.rating !== null ? (
          <p className="text-xs text-muted-foreground">
            ★ {prospect.rating} ({prospect.reviewsCount ?? 0} reviews)
          </p>
        ) : null}
      </TableCell>
      <TableCell className="max-w-xs">
        <div className="flex flex-wrap gap-1">
          {prospect.reasons.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Looks well set up
            </span>
          ) : (
            prospect.reasons.slice(0, 4).map((reason) => (
              <Badge key={reason} variant="secondary" size="sm">
                {reason}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5 text-sm">
          {prospect.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted-foreground" />
              {prospect.phone}
            </span>
          ) : null}
          {prospect.url ? (
            <a
              href={prospect.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-48 items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              <span className="truncate">{prospect.domain ?? "Website"}</span>
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">No website</span>
          )}
          {maps ? (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <MapPin className="size-3.5 shrink-0" />
              Google profile
            </a>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Select
          items={STATUS_ITEMS}
          value={prospect.status}
          onValueChange={(next) => {
            const status = PROSPECT_STATUSES.find((item) => item === next);
            if (status) onStatus(status);
          }}
        >
          <SelectTrigger size="sm" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Make ${prospect.title} a client project`}
          title="Make this a client project"
          onClick={onCreateClient}
        >
          <UserPlus />
        </Button>
      </TableCell>
    </TableRow>
  );
}
