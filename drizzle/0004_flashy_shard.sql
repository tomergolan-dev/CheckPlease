CREATE TABLE "scan_attempts" (
	"scan_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"exempt" boolean DEFAULT false NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scan_attempts_status_valid" CHECK ("scan_attempts"."status" in ('processing', 'succeeded', 'empty', 'failed', 'no_credits'))
);
--> statement-breakpoint
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scan_attempts_user_created_idx" ON "scan_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scan_attempts_created_idx" ON "scan_attempts" USING btree ("created_at");