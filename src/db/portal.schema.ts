import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// A client who may open the read-only portal for one project. They sign in
// through the same Cloudflare Access login as everyone else; this row is what
// limits them to that project. Emails are stored lowercased.
export const portalClients = sqliteTable(
  "portal_clients",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("portal_clients_project_email_uidx").on(
      table.projectId,
      table.email,
    ),
    index("portal_clients_email_idx").on(table.email),
  ],
);

// The 6-month plan a client sees: when it started and a one-line summary.
export const portalStrategies = sqliteTable("portal_strategies", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  summary: text("summary").notNull().default(""),
});

// One step of the plan, placed in month 1 to 6.
export const portalMilestones = sqliteTable(
  "portal_milestones",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    status: text("status", { enum: ["todo", "doing", "done"] })
      .notNull()
      .default("todo"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("portal_milestones_project_idx").on(table.projectId)],
);

// A group of related keywords the client cares about, e.g. "Emergency repair".
export const portalClusters = sqliteTable(
  "portal_clusters",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("portal_clusters_project_idx").on(table.projectId)],
);

// A keyword in a cluster. Positions are Google's organic rank when the plan
// started and now; null means not ranking.
export const portalClusterKeywords = sqliteTable(
  "portal_cluster_keywords",
  {
    id: text("id").primaryKey(),
    clusterId: text("cluster_id")
      .notNull()
      .references(() => portalClusters.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    monthlyVolume: integer("monthly_volume"),
    startPosition: integer("start_position"),
    currentPosition: integer("current_position"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("portal_cluster_keywords_cluster_idx").on(table.clusterId)],
);

// Something worth celebrating, shown newest first.
export const portalWins = sqliteTable(
  "portal_wins",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    wonOn: text("won_on").notNull(),
  },
  (table) => [index("portal_wins_project_idx").on(table.projectId)],
);
