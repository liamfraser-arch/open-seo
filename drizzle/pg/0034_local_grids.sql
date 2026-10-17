CREATE TABLE "local_grid_point_results" (
	"point_id" text NOT NULL,
	"rank" integer NOT NULL,
	"title" text,
	"cid" text,
	"place_id" text,
	"rating" real,
	"reviews_count" integer,
	"is_target" boolean DEFAULT false NOT NULL,
	CONSTRAINT "local_grid_point_results_point_id_rank_pk" PRIMARY KEY("point_id","rank")
);
--> statement-breakpoint
CREATE TABLE "local_grid_points" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"row" integer NOT NULL,
	"col" integer NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"task_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rank" integer,
	"results_count" integer
);
--> statement-breakpoint
CREATE TABLE "local_grid_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"grid_id" text NOT NULL,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"grid_size" integer NOT NULL,
	"spacing_km" real NOT NULL,
	"zoom" integer NOT NULL,
	"error_message" text,
	"started_at" text NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "local_grids" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"keyword" text NOT NULL,
	"business_name" text NOT NULL,
	"business_place_id" text,
	"business_cid" text,
	"center_latitude" real NOT NULL,
	"center_longitude" real NOT NULL,
	"grid_size" integer NOT NULL,
	"spacing_km" real NOT NULL,
	"device" text NOT NULL,
	"language_code" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_grid_point_results" ADD CONSTRAINT "local_grid_point_results_point_id_local_grid_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."local_grid_points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_grid_points" ADD CONSTRAINT "local_grid_points_run_id_local_grid_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."local_grid_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_grid_runs" ADD CONSTRAINT "local_grid_runs_grid_id_local_grids_id_fk" FOREIGN KEY ("grid_id") REFERENCES "public"."local_grids"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_grid_runs" ADD CONSTRAINT "local_grid_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_grids" ADD CONSTRAINT "local_grids_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_grid_points_run_cell_idx" ON "local_grid_points" USING btree ("run_id","row","col");--> statement-breakpoint
CREATE INDEX "local_grid_runs_grid_idx" ON "local_grid_runs" USING btree ("grid_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "local_grid_runs_one_pending_per_grid_idx" ON "local_grid_runs" USING btree ("grid_id") WHERE "local_grid_runs"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "local_grids_project_idx" ON "local_grids" USING btree ("project_id");