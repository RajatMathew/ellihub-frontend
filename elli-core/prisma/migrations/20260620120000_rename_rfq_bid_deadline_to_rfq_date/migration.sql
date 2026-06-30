ALTER TABLE "RFQ" RENAME COLUMN "bidDeadline" TO "rfqDate";
ALTER INDEX IF EXISTS "RFQ_bidDeadline_idx" RENAME TO "RFQ_rfqDate_idx";

UPDATE "TemplateSetting"
SET "value" = jsonb_set(
    "value",
    '{body}',
    to_jsonb(replace(replace("value"->>'body', 'Bid Deadline: {{bidDeadline}}', 'RFQ Date: {{rfqDate}}'), 'Please send your proposal before the deadline.', 'Please send your proposal by the RFQ date.')),
    true
)
WHERE "kind" = 'MAIL_FEATURE'
  AND "key" IN ('rfq.vendorRequest', 'rfq.vendorRequestAll')
  AND "value" ? 'body'
  AND "value"->>'body' LIKE '%Bid Deadline: {{bidDeadline}}%';