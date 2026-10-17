import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
} from "@vis.gl/react-google-maps";
import { cn } from "cn";
import { getLocalGridMapsKey } from "@/serverFunctions/local-grid";
import { localGridRankBand } from "@/shared/local-grid";

/** Null when the deployment has no Maps key; the grid then draws without one. */
export function useLocalGridMapsConfig() {
  return useQuery({
    queryKey: ["localGridMapsKey"],
    queryFn: () => getLocalGridMapsKey(),
    staleTime: Infinity,
  });
}

/** Only mounts the Maps script loader when there is a key to load it with. */
export function MapsProvider({
  apiKey,
  children,
}: {
  apiKey: string | null | undefined;
  children: ReactNode;
}) {
  if (!apiKey) return children;
  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}

export type GridPinState =
  | { kind: "rank"; rank: number | null; change?: number | null }
  | { kind: "pending" }
  | { kind: "failed" }
  | { kind: "preview" };

const BAND_CLASSES = {
  top3: "bg-emerald-600 text-white",
  top10: "bg-amber-500 text-white",
  low: "bg-orange-600 text-white",
  none: "bg-red-700 text-white",
} as const;

export function GridPin({
  state,
  selected = false,
  size = "md",
}: {
  state: GridPinState;
  selected?: boolean;
  size?: "sm" | "md";
}) {
  const label =
    state.kind === "rank"
      ? (state.rank?.toString() ?? "20+")
      : state.kind === "failed"
        ? "!"
        : "";
  const tone =
    state.kind === "rank"
      ? BAND_CLASSES[localGridRankBand(state.rank)]
      : state.kind === "pending"
        ? "animate-pulse bg-muted-foreground/60"
        : state.kind === "failed"
          ? "bg-muted text-muted-foreground"
          : "bg-foreground/70";
  const change = state.kind === "rank" ? state.change : null;

  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold tabular-nums shadow-md ring-2 ring-white",
          size === "md" ? "size-9 text-xs" : "size-3",
          tone,
          selected && "ring-4 ring-primary",
        )}
      >
        {size === "md" ? label : null}
      </span>
      {change ? (
        <span
          className={cn(
            "absolute -top-1.5 -right-2 rounded-full px-1 text-[10px] font-semibold leading-4 shadow ring-1 ring-white",
            // A lower rank number is better, so a negative change is a gain.
            change < 0
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800",
          )}
        >
          {change < 0 ? `▲${-change}` : `▼${change}`}
        </span>
      ) : null}
    </span>
  );
}

export type MapPoint = {
  key: string;
  row: number;
  col: number;
  latitude: number;
  longitude: number;
  state: GridPinState;
};

function boundsOf(points: MapPoint[]) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  return {
    north: Math.max(...latitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    west: Math.min(...longitudes),
  };
}

/**
 * The grid over Google Maps, or as plain squares without a key. Remounts per
 * grid shape (`key` from the caller) so the map refits to the new bounds.
 */
export function LocalGridMap({
  apiKey,
  mapId,
  points,
  gridSize,
  center,
  selectedKey,
  onSelect,
  className,
}: {
  apiKey: string | null | undefined;
  mapId: string;
  points: MapPoint[];
  gridSize: number;
  center: { latitude: number; longitude: number };
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  if (!apiKey || points.length === 0) {
    return (
      <GridSquares
        points={points}
        gridSize={gridSize}
        selectedKey={selectedKey}
        onSelect={onSelect}
        className={className}
      />
    );
  }

  const pinSize = gridSize > 7 ? "sm" : "md";
  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <GoogleMap
        mapId={mapId}
        defaultBounds={{ ...boundsOf(points), padding: 48 }}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        style={{ width: "100%", height: "100%" }}
      >
        <AdvancedMarker
          position={{ lat: center.latitude, lng: center.longitude }}
          zIndex={0}
        >
          <span className="block size-3 rotate-45 border-2 border-white bg-primary shadow" />
        </AdvancedMarker>
        {points.map((point) => (
          <AdvancedMarker
            key={point.key}
            position={{ lat: point.latitude, lng: point.longitude }}
            zIndex={point.key === selectedKey ? 2 : 1}
            onClick={onSelect ? () => onSelect(point.key) : undefined}
            title={pointTitle(point)}
          >
            <GridPin
              state={point.state}
              selected={point.key === selectedKey}
              size={point.key === selectedKey ? "md" : pinSize}
            />
          </AdvancedMarker>
        ))}
      </GoogleMap>
    </div>
  );
}

function pointTitle(point: MapPoint) {
  const { state } = point;
  if (state.kind === "pending") return "Searching…";
  if (state.kind === "failed") return "This search failed";
  if (state.kind === "preview") return "Grid point";
  return state.rank == null
    ? "Not in the top 20 here"
    : `Rank ${state.rank} here`;
}

function GridSquares({
  points,
  gridSize,
  selectedKey,
  onSelect,
  className,
}: {
  points: MapPoint[];
  gridSize: number;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border bg-muted/30 p-4",
        className,
      )}
    >
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {points.map((point) =>
          onSelect ? (
            <button
              key={point.key}
              type="button"
              title={pointTitle(point)}
              onClick={() => onSelect(point.key)}
              className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
            >
              <GridPin
                state={point.state}
                selected={point.key === selectedKey}
              />
            </button>
          ) : (
            <span key={point.key} title={pointTitle(point)}>
              <GridPin state={point.state} size="sm" />
            </span>
          ),
        )}
      </div>
    </div>
  );
}
