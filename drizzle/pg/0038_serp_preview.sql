CREATE TABLE "rank_snapshot_results" (
	"run_id" text NOT NULL,
	"tracking_keyword_id" text NOT NULL,
	"device" text NOT NULL,
	"position" integer NOT NULL,
	"url" text NOT NULL,
	"domain" text,
	"title" text,
	CONSTRAINT "rank_snapshot_results_run_id_tracking_keyword_id_device_position_pk" PRIMARY KEY("run_id","tracking_keyword_id","device","position")
);
--> statement-breakpoint
ALTER TABLE "rank_snapshot_results" ADD CONSTRAINT "rank_snapshot_results_run_id_rank_check_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rank_check_runs"("id") ON DELETE cascade ON UPDATE no action;