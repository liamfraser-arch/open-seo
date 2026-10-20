ALTER TABLE "citation_checks" ADD COLUMN "reference_name" text;--> statement-breakpoint
ALTER TABLE "citation_checks" ADD COLUMN "reference_address" text;--> statement-breakpoint
ALTER TABLE "citation_checks" ADD COLUMN "reference_phone" text;--> statement-breakpoint
ALTER TABLE "citation_listings" ADD COLUMN "found_name" text;--> statement-breakpoint
ALTER TABLE "citation_listings" ADD COLUMN "found_address" text;--> statement-breakpoint
ALTER TABLE "citation_listings" ADD COLUMN "found_phone" text;--> statement-breakpoint
ALTER TABLE "citation_listings" ADD COLUMN "nap_checked_at" text;