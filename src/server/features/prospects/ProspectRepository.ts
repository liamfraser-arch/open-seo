import { and, desc, eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/db";
import { executeInBatches } from "@/db/runBatch";
import { prospectSearches, prospects } from "@/db/schema";

async function listSearches(organizationId: string) {
  return db
    .select()
    .from(prospectSearches)
    .where(eq(prospectSearches.organizationId, organizationId))
    .orderBy(desc(prospectSearches.createdAt));
}

async function getSearch(organizationId: string, searchId: string) {
  const rows = await db
    .select()
    .from(prospectSearches)
    .where(
      and(
        eq(prospectSearches.id, searchId),
        eq(prospectSearches.organizationId, organizationId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function createSearch(
  search: InferInsertModel<typeof prospectSearches>,
  rows: InferInsertModel<typeof prospects>[],
) {
  await db.insert(prospectSearches).values(search);
  await executeInBatches(rows, (tx, row) => tx.insert(prospects).values(row));
}

async function deleteSearch(organizationId: string, searchId: string) {
  await db
    .delete(prospectSearches)
    .where(
      and(
        eq(prospectSearches.id, searchId),
        eq(prospectSearches.organizationId, organizationId),
      ),
    );
}

async function listProspects(organizationId: string, searchId: string) {
  return db
    .select()
    .from(prospects)
    .where(
      and(
        eq(prospects.searchId, searchId),
        eq(prospects.organizationId, organizationId),
      ),
    )
    .orderBy(desc(prospects.score), prospects.rank);
}

async function listProspectsForProject(organizationId: string) {
  return db
    .select()
    .from(prospects)
    .where(eq(prospects.organizationId, organizationId));
}

async function getProspect(organizationId: string, prospectId: string) {
  const rows = await db
    .select()
    .from(prospects)
    .where(
      and(
        eq(prospects.id, prospectId),
        eq(prospects.organizationId, organizationId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function setStatus(
  organizationId: string,
  prospectId: string,
  status: "new" | "contacted" | "won" | "passed",
) {
  await db
    .update(prospects)
    .set({ status })
    .where(
      and(
        eq(prospects.id, prospectId),
        eq(prospects.organizationId, organizationId),
      ),
    );
}

export const ProspectRepository = {
  listSearches,
  getSearch,
  createSearch,
  deleteSearch,
  listProspects,
  listProspectsForProject,
  getProspect,
  setStatus,
};
