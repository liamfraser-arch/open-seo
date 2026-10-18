import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { organization } from "./better-auth-schema";

// A search for local businesses of one trade in one place, the pool a
// service provider picks prospects from. Prospects belong to the
// organization, not a project: they are not clients yet.
export const prospectSearches = sqliteTable(
  "prospect_searches",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    locationName: text("location_name").notNull(),
    locationCode: integer("location_code").notNull(),
    languageCode: text("language_code").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("prospect_searches_organization_idx").on(table.organizationId),
  ],
);

// One row per business found. The score ranks how much help it could use;
// the columns it comes from are kept so the reasons can be shown.
export const prospects = sqliteTable(
  "prospects",
  {
    id: text("id").primaryKey(),
    searchId: text("search_id")
      .notNull()
      .references(() => prospectSearches.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Position in the Maps results for the search.
    rank: integer("rank").notNull(),
    title: text("title").notNull(),
    placeId: text("place_id"),
    cid: text("cid"),
    url: text("url"),
    domain: text("domain"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    category: text("category"),
    rating: real("rating"),
    reviewsCount: integer("reviews_count"),
    photosCount: integer("photos_count"),
    isClaimed: integer("is_claimed", { mode: "boolean" }),
    score: integer("score").notNull(),
    status: text("status", {
      enum: ["new", "contacted", "won", "passed"],
    })
      .notNull()
      .default("new"),
  },
  (table) => [
    index("prospects_search_score_idx").on(table.searchId, table.score),
    index("prospects_organization_idx").on(table.organizationId),
  ],
);
