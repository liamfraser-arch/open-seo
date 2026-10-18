import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { organization } from "./better-auth-schema";

// Mirrors ../prospects.schema.ts; see the comments there.
export const prospectSearches = pgTable(
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

export const prospects = pgTable(
  "prospects",
  {
    id: text("id").primaryKey(),
    searchId: text("search_id")
      .notNull()
      .references(() => prospectSearches.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
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
    isClaimed: boolean("is_claimed"),
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
