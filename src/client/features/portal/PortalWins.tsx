import { ArrowDown, ArrowUp, Trophy } from "lucide-react";
import { Card } from "@/client/components/ui/card";
import {
  RANK_BUCKETS,
  rankSummary,
  type PortalContent,
  type RankBucketKey,
} from "@/shared/portal-content";
import { percentChange, type PortalTraffic } from "@/shared/portal-traffic";
import { cn } from "cn";

type Summary = ReturnType<typeof rankSummary>;

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Everything the numbers show as a win, drawn as charts a client can read at a glance. */
export function Wins({
  content,
  traffic,
}: {
  content: PortalContent | null;
  traffic: PortalTraffic | null;
}) {
  if (!content) return null;
  const summary = rankSummary(content);
  const hasRanks = summary.total > 0;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Trophy className="size-4 text-primary" />
        Wins
      </h2>
      {hasRanks ? <Kpis summary={summary} traffic={traffic} /> : null}
      {hasRanks ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankMovementChart movement={summary.movement} />
          <RankDistributionChart summary={summary} />
        </div>
      ) : null}
      {content.wins.length > 0 ? <Milestones wins={content.wins} /> : null}
    </section>
  );
}

function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium",
        up ? "text-emerald-700" : "text-red-700",
      )}
    >
      {up ? (
        <ArrowUp className="size-3.5" aria-label="Up" />
      ) : (
        <ArrowDown className="size-3.5" aria-label="Down" />
      )}
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

function Kpis({
  summary,
  traffic,
}: {
  summary: Summary;
  traffic: PortalTraffic | null;
}) {
  const clicksGain = traffic
    ? percentChange(traffic.threeMonths.clicks, traffic.threeMonths.prevClicks)
    : null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="gap-1 px-4 py-3">
        <p className="text-xs text-muted-foreground">Keywords on page 1</p>
        <p className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
          {summary.pageOneNow}
          <Delta value={summary.pageOneNow - summary.pageOneStart} />
        </p>
        <p className="text-xs text-muted-foreground">
          was {summary.pageOneStart} when we started
        </p>
      </Card>
      <Card className="gap-1 px-4 py-3">
        <p className="text-xs text-muted-foreground">Keywords improved</p>
        <p className="text-2xl font-semibold tabular-nums">
          {summary.improved}
          <span className="ml-1 text-base font-normal text-muted-foreground">
            of {summary.total}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">since we started</p>
      </Card>
      {clicksGain != null ? (
        <Card className="gap-1 px-4 py-3">
          <p className="text-xs text-muted-foreground">Visitors from Google</p>
          <p className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
            {clicksGain > 0 ? "+" : ""}
            {clicksGain}%
          </p>
          <p className="text-xs text-muted-foreground">
            last 3 months vs the 3 before
          </p>
        </Card>
      ) : null}
    </div>
  );
}

// Position 1 sits at the right edge so progress reads as moving right.
const WORST_POSITION = 100;
const trackPosition = (position: number | null) =>
  `${((WORST_POSITION - (position ?? WORST_POSITION)) / (WORST_POSITION - 1)) * 100}%`;

function RankMovementChart({ movement }: { movement: Summary["movement"] }) {
  return (
    <Card className="gap-3 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold">Where each keyword moved</h3>
        <p className="text-xs text-muted-foreground">
          Google position then and now. Further right is better.
        </p>
      </div>
      {movement.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Movement will show here once rankings change.
        </p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {movement.map((mover) => (
              <li
                key={mover.keyword}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-center gap-3"
              >
                <span className="truncate text-sm" title={mover.keyword}>
                  {mover.keyword}
                </span>
                <div className="relative h-5">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                  <div
                    className={cn(
                      "absolute top-1/2 h-0.5 -translate-y-1/2",
                      mover.gain > 0 ? "bg-primary" : "bg-red-500",
                    )}
                    style={{
                      left: trackPosition(
                        Math.max(mover.from ?? 100, mover.to),
                      ),
                      right: `calc(100% - ${trackPosition(
                        Math.min(mover.from ?? 100, mover.to),
                      )})`,
                    }}
                  />
                  <span
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-card"
                    style={{ left: trackPosition(mover.from) }}
                  />
                  <span
                    className={cn(
                      "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card",
                      mover.gain > 0 ? "bg-primary" : "bg-red-500",
                    )}
                    style={{ left: trackPosition(mover.to) }}
                  />
                </div>
                <span className="whitespace-nowrap text-right text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    {mover.from == null ? "new" : `#${mover.from}`} →{" "}
                  </span>
                  <span className="font-medium">#{mover.to}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full border-2 border-muted-foreground bg-card" />
              Start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-primary" />
              Now
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

const BUCKET_STYLE: Record<RankBucketKey, string> = {
  top3: "bg-primary text-primary-foreground",
  page1: "bg-primary/75 text-primary-foreground",
  page2: "bg-primary/55 text-primary-foreground",
  page3to5: "bg-primary/35 text-foreground",
  deep: "bg-primary/20 text-foreground",
  none: "bg-muted text-muted-foreground",
};
const BUCKET_LABELS: Array<{ key: RankBucketKey; label: string }> = [
  ...RANK_BUCKETS.map(({ key, label }) => ({ key, label })),
  { key: "none", label: "Not in top 100" },
];

function DistributionBar({
  name,
  counts,
  total,
}: {
  name: string;
  counts: Record<RankBucketKey, number>;
  total: number;
}) {
  const description = BUCKET_LABELS.filter(({ key }) => counts[key] > 0)
    .map(({ key, label }) => `${counts[key]} ${label}`)
    .join(", ");
  return (
    <div className="grid grid-cols-[44px_1fr] items-center gap-3">
      <span className="text-sm text-muted-foreground">{name}</span>
      <div
        role="img"
        aria-label={`${name}: ${description}`}
        className="flex h-9 gap-0.5 overflow-hidden rounded-md"
      >
        {BUCKET_LABELS.filter(({ key }) => counts[key] > 0).map(({ key }) => (
          <div
            key={key}
            className={cn(
              "flex items-center justify-center text-xs font-medium tabular-nums",
              BUCKET_STYLE[key],
            )}
            style={{ width: `${(counts[key] / total) * 100}%` }}
          >
            {counts[key]}
          </div>
        ))}
      </div>
    </div>
  );
}

function RankDistributionChart({ summary }: { summary: Summary }) {
  return (
    <Card className="gap-4 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold">Where your keywords rank</h3>
        <p className="text-xs text-muted-foreground">
          How many of your {summary.total} keywords sit in each part of Google
        </p>
      </div>
      <div className="space-y-2">
        <DistributionBar
          name="Start"
          counts={summary.start}
          total={summary.total}
        />
        <DistributionBar
          name="Now"
          counts={summary.now}
          total={summary.total}
        />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {BUCKET_LABELS.map(({ key, label }) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", BUCKET_STYLE[key])} />
            {label}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Milestones({ wins }: { wins: PortalContent["wins"] }) {
  return (
    <Card className="gap-3 px-5 py-4">
      <h3 className="text-sm font-semibold">Milestones reached</h3>
      <ol className="relative space-y-4 border-l border-border pl-5">
        {wins.map((win) => (
          <li key={`${win.wonOn}-${win.title}`} className="relative">
            <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary ring-4 ring-card" />
            <time className="text-xs text-muted-foreground">
              {formatDay(win.wonOn)}
            </time>
            <p className="text-sm font-medium">{win.title}</p>
            {win.detail ? (
              <p className="text-sm text-muted-foreground">{win.detail}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
