CREATE TABLE "portal_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_clients" ADD CONSTRAINT "portal_clients_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_clients_project_email_uidx" ON "portal_clients" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "portal_clients_email_idx" ON "portal_clients" USING btree ("email");