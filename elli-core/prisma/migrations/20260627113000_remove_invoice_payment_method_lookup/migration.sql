-- Remove the retired invoice payment-method lookup. Paid invoices now only store paidDate;
-- paymentReference/paymentNotes stay for historical imported payment metadata.
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_paymentMethodId_fkey";
DROP INDEX IF EXISTS "Invoice_paymentMethodId_idx";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "paymentMethodId";

DELETE FROM "Lookup" WHERE "type" = 'PAYMENT_METHOD';