import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { portalClients } from "@/db/schema";

async function projectIdsForEmail(email: string) {
  const rows = await db
    .select({ projectId: portalClients.projectId })
    .from(portalClients)
    .where(eq(portalClients.email, email.toLowerCase()));
  return rows.map((row) => row.projectId);
}

async function listForProject(projectId: string) {
  return db
    .select({
      id: portalClients.id,
      email: portalClients.email,
      createdAt: portalClients.createdAt,
    })
    .from(portalClients)
    .where(eq(portalClients.projectId, projectId))
    .orderBy(desc(portalClients.createdAt));
}

async function add(projectId: string, email: string) {
  await db
    .insert(portalClients)
    .values({
      id: crypto.randomUUID(),
      projectId,
      email: email.toLowerCase(),
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
}

async function remove(projectId: string, id: string) {
  await db
    .delete(portalClients)
    .where(
      and(eq(portalClients.id, id), eq(portalClients.projectId, projectId)),
    );
}

export const PortalRepository = {
  projectIdsForEmail,
  listForProject,
  add,
  remove,
};
