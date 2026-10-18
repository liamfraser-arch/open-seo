CREATE TABLE "prospect_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"keyword" text NOT NULL,
	"location_name" text NOT NULL,
	"location_code" integer NOT NULL,
	"language_code" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"search_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"rank" integer NOT NULL,
	"title" text NOT NULL,
	"place_id" text,
	"cid" text,
	"url" text,
	"domain" text,
	"phone" text,
	"address" text,
	"city" text,
	"category" text,
	"rating" real,
	"reviews_count" integer,
	"photos_count" integer,
	"is_claimed" boolean,
	"score" integer NOT NULL,
	"status" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospect_searches" ADD CONSTRAINT "prospect_searches_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_search_id_prospect_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."prospect_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_searches_organization_idx" ON "prospect_searches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prospects_search_score_idx" ON "prospects" USING btree ("search_id","score");--> statement-breakpoint
CREATE INDEX "prospects_organization_idx" ON "prospects" USING btree ("organization_id");