import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import {
  portalClusterKeywords,
  portalClusters,
  portalMilestones,
  portalStrategies,
  portalWins,
} from "@/db/schema";
import type { PortalContent } from "@/shared/portal-content";

async function getContent(projectId: string): Promise<PortalContent | null> {
  const [strategy] = await db
    .select()
    .from(portalStrategies)
    .where(eq(portalStrategies.projectId, projectId))
    .limit(1);
  if (!strategy) return null;

  const [milestones, clusters, wins] = await Promise.all([
    db
      .select()
      .from(portalMilestones)
      .where(eq(portalMilestones.projectId, projectId))
      .orderBy(portalMilestones.month, portalMilestones.sortOrder),
    db
      .select()
      .from(portalClusters)
      .where(eq(portalClusters.projectId, projectId))
      .orderBy(portalClusters.sortOrder),
    db
      .select()
      .from(portalWins)
      .where(eq(portalWins.projectId, projectId))
      .orderBy(desc(portalWins.wonOn)),
  ]);
  const keywords = clusters.length
    ? await db
        .select()
        .from(portalClusterKeywords)
        .where(
          inArray(
            portalClusterKeywords.clusterId,
            clusters.map((cluster) => cluster.id),
          ),
        )
        .orderBy(portalClusterKeywords.sortOrder)
    : [];

  return {
    startDate: strategy.startDate,
    summary: strategy.summary,
    milestones: milestones.map((m) => ({
      month: m.month,
      title: m.title,
      detail: m.detail,
      status: m.status,
    })),
    clusters: clusters.map((cluster) => ({
      name: cluster.name,
      keywords: keywords
        .filter((keyword) => keyword.clusterId === cluster.id)
        .map((keyword) => ({
          keyword: keyword.keyword,
          monthlyVolume: keyword.monthlyVolume,
          startPosition: keyword.startPosition,
          currentPosition: keyword.currentPosition,
        })),
    })),
    wins: wins.map((win) => ({
      title: win.title,
      detail: win.detail,
      wonOn: win.wonOn,
    })),
  };
}

/**
 * Replaces everything a client sees for the project in one atomic write, so
 * the editor saves what is on screen and a failure leaves the old content.
 */
async function replaceContent(projectId: string, content: PortalContent) {
  await runBatch((tx) => [
    tx
      .delete(portalStrategies)
      .where(eq(portalStrategies.projectId, projectId)),
    tx
      .delete(portalMilestones)
      .where(eq(portalMilestones.projectId, projectId)),
    // Deleting clusters cascades to their keywords.
    tx.delete(portalClusters).where(eq(portalClusters.projectId, projectId)),
    tx.delete(portalWins).where(eq(portalWins.projectId, projectId)),
    tx.insert(portalStrategies).values({
      projectId,
      startDate: content.startDate,
      summary: content.summary,
    }),
    ...content.milestones.map((milestone, index) =>
      tx.insert(portalMilestones).values({
        id: crypto.randomUUID(),
        projectId,
        ...milestone,
        sortOrder: index,
      }),
    ),
    ...content.clusters.flatMap((cluster, clusterIndex) => {
      const clusterId = crypto.randomUUID();
      return [
        tx.insert(portalClusters).values({
          id: clusterId,
          projectId,
          name: cluster.name,
          sortOrder: clusterIndex,
        }),
        ...cluster.keywords.map((keyword, index) =>
          tx.insert(portalClusterKeywords).values({
            id: crypto.randomUUID(),
            clusterId,
            ...keyword,
            sortOrder: index,
          }),
        ),
      ];
    }),
    ...content.wins.map((win) =>
      tx.insert(portalWins).values({
        id: crypto.randomUUID(),
        projectId,
        ...win,
      }),
    ),
  ]);
}

export const PortalContentRepository = { getContent, replaceContent };
