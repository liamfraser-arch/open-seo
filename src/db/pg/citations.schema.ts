import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

// Mirrors ../citations.schema.ts; see the comments there.
export const citationChecks = pgTable(
  "citation_checks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    // Narrows the search to one area; empty finds listings in every city.
    city: text("city"),
    locationCode: integer("location_code").notNull(),
    languageCode: text("language_code").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("citation_checks_project_idx").on(table.projectId)],
);

export const citationRuns = pgTable(
  "citation_runs",
  {
    id: text("id").primaryKey(),
    checkId: text("check_id")
      .notNull()
      .references(() => citationChecks.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("citation_runs_check_idx").on(table.checkId, table.startedAt),
    uniqueIndex("citation_runs_one_pending_per_check_idx")
      .on(table.checkId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const citationResults = pgTable(
  "citation_results",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => citationRuns.id, { onDelete: "cascade" }),
    directory: text("directory").notNull(),
    status: text("status", {
      enum: ["pending", "checking", "found", "missing", "error"],
    })
      .notNull()
      .default("pending"),
  },
  (table) => [
    uniqueIndex("citation_results_run_directory_idx").on(
      table.runId,
      table.directory,
    ),
  ],
);

export const citationListings = pgTable(
  "citation_listings",
  {
    id: text("id").primaryKey(),
    resultId: text("result_id")
      .notNull()
      .references(() => citationResults.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
  },
  (table) => [index("citation_listings_result_idx").on(table.resultId)],
);
