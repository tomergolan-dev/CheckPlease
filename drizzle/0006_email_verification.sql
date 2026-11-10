CREATE TABLE "email_verification_codes" (
	"email" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"sends_in_window" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
-- Accounts that signed up with a password before verification existed count as verified, so no
-- one is locked out by this change.
UPDATE "user" SET "emailVerified" = now() WHERE "password_hash" IS NOT NULL AND "emailVerified" IS NULL;
