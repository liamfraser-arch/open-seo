import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

// Mirrors ../local-grid.schema.ts; see the comments there.
export const localGrids = pgTable(
  "local_grids",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
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

export const localGridRuns = pgTable(
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
    gridSize: integer("grid_size").notNull(),
    spacingKm: real("spacing_km").notNull(),
    zoom: integer("zoom").notNull(),
    errorMessage: text("error_message"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("local_grid_runs_grid_idx").on(table.gridId, table.startedAt),
    uniqueIndex("local_grid_runs_one_pending_per_grid_idx")
      .on(table.gridId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const localGridPoints = pgTable(
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
    taskId: text("task_id"),
    status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
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

export const localGridPointResults = pgTable(
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
    isTarget: boolean("is_target").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.pointId, table.rank] })],
);
