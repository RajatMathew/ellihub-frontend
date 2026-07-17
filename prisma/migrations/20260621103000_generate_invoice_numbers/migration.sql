ALTER TABLE "Invoice"
ADD COLUMN "externalInvoiceNumber" TEXT;

UPDATE "Invoice"
SET "externalInvoiceNumber" = "invoiceNumber";

WITH numbered_invoices AS (
    SELECT
        i."id",
        CASE
            WHEN i."purchaseOrderId" IS NOT NULL AND po."poNumber" IS NOT NULL THEN
                po."poNumber" || '-INV-' || LPAD(
                    ROW_NUMBER() OVER (
                        PARTITION BY i."purchaseOrderId"
                        ORDER BY i."createdAt", i."id"
                    )::TEXT,
                    3,
                    '0'
                )
            ELSE
                'INV-LEGACY-' || LPAD(
                    ROW_NUMBER() OVER (
                        PARTITION BY i."vendorId"
                        ORDER BY i."createdAt", i."id"
                    )::TEXT,
                    3,
                    '0'
                )
        END AS "generatedInvoiceNumber"
    FROM "Invoice" i
    LEFT JOIN "PurchaseOrder" po ON po."id" = i."purchaseOrderId"
)
UPDATE "Invoice" i
SET "invoiceNumber" = numbered_invoices."generatedInvoiceNumber"
FROM numbered_invoices
WHERE i."id" = numbered_invoices."id";

UPDATE "File" invoice_folder
SET "displayName" = invoice."invoiceNumber"
FROM "Invoice" invoice, "File" invoice_parent
WHERE invoice_folder."name" = invoice."id"
  AND invoice_folder."parentId" = invoice_parent."id"
  AND invoice_folder."type" = 'FOLDER'
  AND invoice_folder."deletedAt" IS NULL
  AND invoice_parent."protectedFolderType" = 'INVOICE';

CREATE INDEX "Invoice_externalInvoiceNumber_idx" ON "Invoice"("externalInvoiceNumber");