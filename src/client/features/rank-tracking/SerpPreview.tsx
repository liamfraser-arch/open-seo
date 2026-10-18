import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/client/components/ui/hover-card";
import { getKeywordSerp } from "@/serverFunctions/rank-tracking";
import { cn } from "cn";

export type SerpPreviewTarget = {
  projectId: string;
  configId: string;
  keywordId: string;
  keyword: string;
  device: "desktop" | "mobile";
  /** The tracked domain, highlighted in the results. */
  domain: string;
};

function isTrackedDomain(resultDomain: string | null, tracked: string) {
  if (!resultDomain) return false;
  const host = resultDomain.toLowerCase();
  const target = tracked.toLowerCase();
  return host === target || host.endsWith(`.${target}`);
}

function formatChecked(iso: string) {
  return new Date(
    iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`,
  ).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Hovering a position shows the Google results it was read from. */
export function SerpPreview({
  target,
  children,
}: {
  target: SerpPreviewTarget;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger
        delay={250}
        closeDelay={100}
        render={<span className="cursor-help" />}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent>
        {open ? <SerpResults target={target} /> : null}
      </HoverCardContent>
    </HoverCard>
  );
}

function SerpResults({ target }: { target: SerpPreviewTarget }) {
  const serp = useQuery({
    queryKey: [
      "keywordSerp",
      target.projectId,
      target.configId,
      target.keywordId,
      target.device,
    ],
    queryFn: () =>
      getKeywordSerp({
        data: {
          projectId: target.projectId,
          configId: target.configId,
          keywordId: target.keywordId,
          device: target.device,
        },
      }),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">“{target.keyword}” on Google</p>
        <p className="text-xs text-muted-foreground">
          {target.device === "mobile" ? "Mobile" : "Desktop"} results
          {serp.data ? ` · checked ${formatChecked(serp.data.checkedAt)}` : ""}
        </p>
      </div>
      {serp.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : serp.isError ? (
        <p className="text-xs text-muted-foreground">
          Couldn't load the results.
        </p>
      ) : !serp.data ? (
        <p className="text-xs text-muted-foreground">
          The results appear here after the next check of this keyword.
        </p>
      ) : (
        <ol className="max-h-80 divide-y overflow-auto rounded-lg border">
          {serp.data.results.map((result) => {
            const mine = isTrackedDomain(result.domain, target.domain);
            return (
              <li
                key={result.position}
                className={cn(
                  "flex items-start gap-2.5 px-2.5 py-2",
                  mine && "bg-primary/10",
                )}
              >
                <span className="w-4 shrink-0 pt-0.5 text-right font-mono text-xs text-muted-foreground">
                  {result.position}
                </span>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <span
                    className={cn(
                      "block truncate text-sm",
                      mine && "font-semibold",
                    )}
                  >
                    {result.title ?? result.url}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {result.domain ?? result.url}
                    {mine ? " · you" : ""}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
