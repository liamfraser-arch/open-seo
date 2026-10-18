import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sort } from "remeda";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Empty } from "@/client/features/present/PresentBits";
import { DeviceRankCell } from "@/client/features/rank-tracking/RankTrackingTableParts";
import {
  getLatestRankResults,
  getRankTrackingConfigs,
} from "@/serverFunctions/rank-tracking";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";

const SHOWN = 40;

/** Best position across the devices checked; null when not ranking. */
export function bestPosition(row: RankTrackingRow) {
  const positions = [row.desktop.position, row.mobile.position].filter(
    (position): position is number => position !== null,
  );
  return positions.length > 0 ? Math.min(...positions) : null;
}

/** The first rank-tracking config's latest results, shared with the overview. */
export function useRankings(projectId: string, configId?: string) {
  const configs = useQuery({
    queryKey: ["presentRankConfigs", projectId],
    queryFn: () => getRankTrackingConfigs({ data: { projectId } }),
  });
  const config =
    configs.data?.find((item) => item.id === configId) ?? configs.data?.[0];
  const results = useQuery({
    queryKey: ["presentRankResults", projectId, config?.id],
    queryFn: () =>
      getLatestRankResults({
        data: { projectId, configId: config?.id ?? "", comparePeriod: "7d" },
      }),
    enabled: Boolean(config),
  });
  return {
    configs: configs.data,
    config,
    results,
    isPending: configs.isPending,
  };
}

export function PresentRankings({ projectId }: { projectId: string }) {
  const [configId, setConfigId] = useState<string | undefined>();
  const { configs, config, results, isPending } = useRankings(
    projectId,
    configId,
  );

  if (isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!config) {
    return <Empty>No keywords are being tracked for this client yet.</Empty>;
  }
  const rows = sort(results.data?.rows ?? [], (a, b) => {
    const left = bestPosition(a);
    const right = bestPosition(b);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return left - right;
  }).slice(0, SHOWN);
  const devices =
    config.devices === "both"
      ? (["desktop", "mobile"] as const)
      : ([config.devices] as const);

  return (
    <div className="flex flex-col gap-4">
      {configs && configs.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {configs.map((item) => (
            <Button
              key={item.id}
              variant={item.id === config.id ? "secondary" : "outline"}
              onClick={() => setConfigId(item.id)}
            >
              {item.domain}
            </Button>
          ))}
        </div>
      ) : null}
      <p className="text-base text-muted-foreground">
        Where {config.domain} appears on Google. Hover a position to see the
        results on that page.
      </p>
      {results.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <Empty>No rankings have been checked yet.</Empty>
      ) : (
        <TableCard>
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Search</TableHead>
                {devices.map((device) => (
                  <TableHead key={device} className="w-40">
                    {device === "mobile" ? "Mobile" : "Desktop"} position
                  </TableHead>
                ))}
                <TableHead>Page</TableHead>
                <TableHead className="w-32 text-right">Searches / mo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.trackingKeywordId}>
                  <TableCell className="font-medium">{row.keyword}</TableCell>
                  {devices.map((device) => (
                    <TableCell key={device}>
                      <DeviceRankCell
                        result={row[device]}
                        serp={{
                          projectId,
                          configId: config.id,
                          keywordId: row.trackingKeywordId,
                          keyword: row.keyword,
                          device,
                          domain: config.domain,
                        }}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {row[devices[0]].rankingUrl ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.searchVolume?.toLocaleString() ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}
