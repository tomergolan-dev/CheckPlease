WITH ranked_drafts AS (
	SELECT
		id,
		row_number() OVER (
			PARTITION BY user_id
			ORDER BY (data->>'updatedAt')::bigint DESC, updated_at DESC
		) AS rn
	FROM bills
	WHERE status = 'draft'
)
DELETE FROM bills
WHERE id IN (SELECT id FROM ranked_drafts WHERE rn > 1);
--> statement-breakpoint
CREATE UNIQUE INDEX "bills_one_draft_per_user" ON "bills" USING btree ("user_id") WHERE "bills"."status" = 'draft';
