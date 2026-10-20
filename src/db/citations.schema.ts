import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// A business whose directory listings are looked for.
export const citationChecks = sqliteTable(
  "citation_checks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    // Narrows the search to one area; empty finds listings in every city.
    city: text("city"),
    // The Google market the directory searches run in.
    locationCode: integer("location_code").notNull(),
    languageCode: text("language_code").notNull(),
    // The details on the Google Business Profile, which listings are compared to.
    referenceName: text("reference_name"),
    referenceAddress: text("reference_address"),
    referencePhone: text("reference_phone"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("citation_checks_project_idx").on(table.projectId)],
);

// One row per run of a check. Status flips from pending to completed once
// every directory is settled.
export const citationRuns = sqliteTable(
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
    // At most one run in flight per check, so a double click can't pay twice.
    uniqueIndex("citation_runs_one_pending_per_check_idx")
      .on(table.checkId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

// One row per directory per run. "checking" marks a directory a worker has
// claimed, so two open tabs never pay for the same search.
export const citationResults = sqliteTable(
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

// The listings found at a directory; a business with several locations can
// have several.
export const citationListings = sqliteTable(
  "citation_listings",
  {
    id: text("id").primaryKey(),
    resultId: text("result_id")
      .notNull()
      .references(() => citationResults.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    // What the listing page shows; null where it showed nothing.
    foundName: text("found_name"),
    foundAddress: text("found_address"),
    foundPhone: text("found_phone"),
    // Set once the page was fetched; null for listings never read.
    napCheckedAt: text("nap_checked_at"),
  },
  (table) => [index("citation_listings_result_idx").on(table.resultId)],
);
