CREATE TABLE "citation_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"business_name" text NOT NULL,
	"city" text,
	"location_code" integer NOT NULL,
	"language_code" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citation_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"result_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "citation_results" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"directory" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"check_id" text NOT NULL,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"started_at" text NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
ALTER TABLE "citation_checks" ADD CONSTRAINT "citation_checks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_listings" ADD CONSTRAINT "citation_listings_result_id_citation_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."citation_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_results" ADD CONSTRAINT "citation_results_run_id_citation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."citation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_runs" ADD CONSTRAINT "citation_runs_check_id_citation_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."citation_checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_runs" ADD CONSTRAINT "citation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "citation_checks_project_idx" ON "citation_checks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "citation_listings_result_idx" ON "citation_listings" USING btree ("result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "citation_results_run_directory_idx" ON "citation_results" USING btree ("run_id","directory");--> statement-breakpoint
CREATE INDEX "citation_runs_check_idx" ON "citation_runs" USING btree ("check_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "citation_runs_one_pending_per_check_idx" ON "citation_runs" USING btree ("check_id") WHERE "citation_runs"."status" = 'pending';