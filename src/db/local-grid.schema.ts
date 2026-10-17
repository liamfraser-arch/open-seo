import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// A saved local rank grid: one keyword searched on Google Maps at every point
// of a square grid around a business, so its Maps visibility can be compared
// run over run.
export const localGrids = sqliteTable(
  "local_grids",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    // The business located in each point's results. Rows match on place id
    // or cid first and fall back to a case-insensitive title match.
    businessName: text("business_name").notNull(),
    businessPlaceId: text("business_place_id"),
    businessCid: text("business_cid"),
    centerLatitude: real("center_latitude").notNull(),
    centerLongitude: real("center_longitude").notNull(),
    gridSize: integer("grid_size").notNull(),
    spacingKm: real("spacing_km").notNull(),
    device: text("device", { enum: ["desktop", "mobile"] }).notNull(),
    languageCode: text("language_code").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("local_grids_project_idx").on(table.projectId)],
);

// One row per run of a grid. Status flips from pending to completed once
// every point's queued search is collected.
export const localGridRuns = sqliteTable(
  "local_grid_runs",
  {
    id: text("id").primaryKey(),
    gridId: text("grid_id")
      .notNull()
      .references(() => localGrids.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
    // The grid's settings can change, so each run keeps the ones it used.
    gridSize: integer("grid_size").notNull(),
    spacingKm: real("spacing_km").notNull(),
    zoom: integer("zoom").notNull(),
    errorMessage: text("error_message"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("local_grid_runs_grid_idx").on(table.gridId, table.startedAt),
    // At most one run in flight per grid, so a double click can't pay twice.
    uniqueIndex("local_grid_runs_one_pending_per_grid_idx")
      .on(table.gridId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

// One row per grid point per run. Row 0 is the northern edge, col 0 the west.
export const localGridPoints = sqliteTable(
  "local_grid_points",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => localGridRuns.id, { onDelete: "cascade" }),
    row: integer("row").notNull(),
    col: integer("col").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    // Null when DataForSEO refused the search at post time.
    taskId: text("task_id"),
    status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
    // The target's position; null when it was not in the results returned.
    rank: integer("rank"),
    resultsCount: integer("results_count"),
  },
  (table) => [
    uniqueIndex("local_grid_points_run_cell_idx").on(
      table.runId,
      table.row,
      table.col,
    ),
  ],
);

// The businesses Google Maps returned at a point, in rank order.
export const localGridPointResults = sqliteTable(
  "local_grid_point_results",
  {
    pointId: text("point_id")
      .notNull()
      .references(() => localGridPoints.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    title: text("title"),
    cid: text("cid"),
    placeId: text("place_id"),
    rating: real("rating"),
    reviewsCount: integer("reviews_count"),
    isTarget: integer("is_target", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [primaryKey({ columns: [table.pointId, table.rank] })],
);
