import { and, desc, eq, inArray } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/db";
import { executeInBatches } from "@/db/runBatch";
import {
  citationChecks,
  citationListings,
  citationResults,
  citationRuns,
} from "@/db/schema";

const RUN_HISTORY_LIMIT = 50;

async function listChecks(projectId: string) {
  return db
    .select()
    .from(citationChecks)
    .where(eq(citationChecks.projectId, projectId))
    .orderBy(desc(citationChecks.createdAt));
}

async function getCheck(projectId: string, checkId: string) {
  const rows = await db
    .select()
    .from(citationChecks)
    .where(
      and(
        eq(citationChecks.id, checkId),
        eq(citationChecks.projectId, projectId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function createCheck(data: InferInsertModel<typeof citationChecks>) {
  await db.insert(citationChecks).values(data);
}

async function deleteCheck(projectId: string, checkId: string) {
  await db
    .delete(citationChecks)
    .where(
      and(
        eq(citationChecks.id, checkId),
        eq(citationChecks.projectId, projectId),
      ),
    );
}

/** Newest first. */
async function listRuns(projectId: string, checkId: string, limit?: number) {
  return db
    .select()
    .from(citationRuns)
    .where(
      and(
        eq(citationRuns.projectId, projectId),
        eq(citationRuns.checkId, checkId),
      ),
    )
    .orderBy(desc(citationRuns.startedAt))
    .limit(limit ?? RUN_HISTORY_LIMIT);
}

async function getRun(projectId: string, runId: string) {
  const rows = await db
    .select()
    .from(citationRuns)
    .where(
      and(eq(citationRuns.id, runId), eq(citationRuns.projectId, projectId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Inserts a pending run, or returns false when the check already has one: the
 * partial unique index on pending runs rejects the second insert.
 */
async function tryCreateRun(data: InferInsertModel<typeof citationRuns>) {
  const inserted = await db
    .insert(citationRuns)
    .values({ ...data, status: "pending" })
    .onConflictDoNothing()
    .returning({ id: citationRuns.id });
  return Boolean(inserted[0]);
}

/** Flips a finished run back to pending; false if the check has another. */
async function tryReopenRun(run: { id: string }) {
  try {
    const updated = await db
      .update(citationRuns)
      .set({ status: "pending", errorMessage: null, completedAt: null })
      .where(eq(citationRuns.id, run.id))
      .returning({ id: citationRuns.id });
    return Boolean(updated[0]);
  } catch {
    // The one-pending-run index refused it.
    return false;
  }
}

async function updateRun(
  runId: string,
  data: Partial<InferInsertModel<typeof citationRuns>>,
) {
  await db.update(citationRuns).set(data).where(eq(citationRuns.id, runId));
}

async function insertResults(
  results: InferInsertModel<typeof citationResults>[],
) {
  await executeInBatches(results, (tx, result) =>
    tx.insert(citationResults).values(result),
  );
}

async function getResultsForRuns(runIds: string[]) {
  if (runIds.length === 0) return [];
  return db
    .select()
    .from(citationResults)
    .where(inArray(citationResults.runId, runIds));
}

async function insertListings(
  listings: InferInsertModel<typeof citationListings>[],
) {
  await executeInBatches(listings, (tx, listing) =>
    tx.insert(citationListings).values(listing),
  );
}

async function getListingsForResults(resultIds: string[]) {
  if (resultIds.length === 0) return [];
  return db
    .select()
    .from(citationListings)
    .where(inArray(citationListings.resultId, resultIds));
}

/** Claims up to `limit` unchecked directories; each is returned to one caller. */
async function claimPendingResults(runId: string, limit: number) {
  const pending = await db
    .select({ id: citationResults.id })
    .from(citationResults)
    .where(
      and(
        eq(citationResults.runId, runId),
        eq(citationResults.status, "pending"),
      ),
    )
    .limit(limit);
  if (pending.length === 0) return [];
  return db
    .update(citationResults)
    .set({ status: "checking" })
    .where(
      and(
        inArray(
          citationResults.id,
          pending.map((row) => row.id),
        ),
        eq(citationResults.status, "pending"),
      ),
    )
    .returning();
}

async function settleResult(
  resultId: string,
  data: Partial<InferInsertModel<typeof citationResults>>,
) {
  await db
    .update(citationResults)
    .set(data)
    .where(eq(citationResults.id, resultId));
}

/** Puts directories whose search failed back in the queue. */
async function requeueErroredResults(runId: string) {
  await db
    .update(citationResults)
    .set({ status: "pending" })
    .where(
      and(
        eq(citationResults.runId, runId),
        eq(citationResults.status, "error"),
      ),
    );
}

/** Settles whatever is still unchecked, for a run that stalled. */
async function failUnsettledResults(runId: string) {
  await db
    .update(citationResults)
    .set({ status: "error" })
    .where(
      and(
        eq(citationResults.runId, runId),
        inArray(citationResults.status, ["pending", "checking"]),
      ),
    );
}

export const CitationRepository = {
  listChecks,
  getCheck,
  createCheck,
  deleteCheck,
  listRuns,
  getRun,
  tryCreateRun,
  tryReopenRun,
  updateRun,
  insertResults,
  getResultsForRuns,
  insertListings,
  getListingsForResults,
  claimPendingResults,
  settleResult,
  failUnsettledResults,
  requeueErroredResults,
};
