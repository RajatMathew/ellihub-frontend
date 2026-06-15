CREATE INDEX IF NOT EXISTS "PurchaseOrder_fullyPaid_issuedAt_idx"
ON "PurchaseOrder" ("fullyPaid", "issuedAt");

CREATE INDEX IF NOT EXISTS "PoPayment_purchaseOrderId_txnDate_idx"
ON "PoPayment" ("purchaseOrderId", "txnDate");

CREATE INDEX IF NOT EXISTS "SubChangeOrder_purchaseOrderId_status_deletedAt_idx"
ON "SubChangeOrder" ("purchaseOrderId", "status", "deletedAt");
