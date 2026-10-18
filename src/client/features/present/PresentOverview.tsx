import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/client/components/ui/skeleton";
import { BigStat, toneForShare } from "@/client/features/present/PresentBits";
import {
  bestPosition,
  useRankings,
} from "@/client/features/present/PresentRankings";
import { listCitationChecks } from "@/serverFunctions/citations";
import { listLocalGrids } from "@/serverFunctions/local-grid";

/** The three answers a business owner asks first, as big numbers. */
export function PresentOverview({ projectId }: { projectId: string }) {
  const grids = useQuery({
    queryKey: ["localGrids", projectId],
    queryFn: () => listLocalGrids({ data: { projectId } }),
  });
  const checks = useQuery({
    queryKey: ["citationChecks", projectId],
    queryFn: () => listCitationChecks({ data: { projectId } }),
  });
  const rankings = useRankings(projectId);

  if (grids.isPending || checks.isPending || rankings.isPending) {
    return (
      <div className="grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-72 rounded-2xl" />
        ))}
      </div>
    );
  }

  const gridRun = grids.data?.find(
    (grid) => grid.latestRun?.status === "completed",
  )?.latestRun;
  const share = gridRun?.shareOfLocalVoice ?? null;
  const checkRun = checks.data?.find(
    (check) => check.latestRun?.status === "completed",
  )?.latestRun;
  const rows = rankings.results.data?.rows ?? [];
  const page1 = rows.filter((row) => {
    const position = bestPosition(row);
    return position !== null && position <= 10;
  }).length;
  const listedShare = checkRun ? (checkRun.found / checkRun.total) * 100 : 0;
  const page1Share = rows.length ? (page1 / rows.length) * 100 : 0;

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <BigStat
        projectId={projectId}
        section="map"
        question="Do customers nearby find you on Google Maps?"
        value={share === null ? "-" : `${share}%`}
        unit={share === null ? undefined : "of your area"}
        percent={share ?? 0}
        tone={share === null ? "none" : toneForShare(share)}
        note={
          share === null
            ? "No map check has been run yet."
            : `You're in the top 3 results across ${share}% of the places we checked.`
        }
      />
      <BigStat
        projectId={projectId}
        section="rankings"
        question="How many of your searches are on page 1 of Google?"
        value={rows.length ? String(page1) : "-"}
        unit={rows.length ? `of ${rows.length}` : undefined}
        percent={page1Share}
        tone={rows.length ? toneForShare(page1Share * 2) : "none"}
        note={
          rows.length
            ? "Searches where your website is in the first ten results."
            : "No keywords are being tracked yet."
        }
      />
      <BigStat
        projectId={projectId}
        section="listings"
        question="Which directories list your business?"
        value={checkRun ? String(checkRun.found) : "-"}
        unit={checkRun ? `of ${checkRun.total}` : undefined}
        percent={listedShare}
        tone={checkRun ? toneForShare(listedShare) : "none"}
        note={
          checkRun
            ? `${checkRun.missing} directories don't list you yet.`
            : "No directory check has been run yet."
        }
      />
    </div>
  );
}
