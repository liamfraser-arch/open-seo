CREATE TABLE "portal_cluster_keywords" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text NOT NULL,
	"keyword" text NOT NULL,
	"monthly_volume" integer,
	"start_position" integer,
	"current_position" integer,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"month" integer NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_strategies" (
	"project_id" text PRIMARY KEY NOT NULL,
	"start_date" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_wins" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"won_on" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_cluster_keywords" ADD CONSTRAINT "portal_cluster_keywords_cluster_id_portal_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."portal_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_clusters" ADD CONSTRAINT "portal_clusters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_milestones" ADD CONSTRAINT "portal_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_strategies" ADD CONSTRAINT "portal_strategies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_wins" ADD CONSTRAINT "portal_wins_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_cluster_keywords_cluster_idx" ON "portal_cluster_keywords" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "portal_clusters_project_idx" ON "portal_clusters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "portal_milestones_project_idx" ON "portal_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "portal_wins_project_idx" ON "portal_wins" USING btree ("project_id");