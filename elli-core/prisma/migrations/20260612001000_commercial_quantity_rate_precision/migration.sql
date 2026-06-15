ALTER TABLE "RFQDeliverable"
ALTER COLUMN "quantity" TYPE DECIMAL(10, 3)
USING "quantity"::DECIMAL(10, 3);

ALTER TABLE "PurchaseOrder"
ALTER COLUMN "taxPercent" TYPE DECIMAL(6, 3)
USING "taxPercent"::DECIMAL(6, 3),
ALTER COLUMN "retainagePercent" TYPE DECIMAL(6, 3)
USING "retainagePercent"::DECIMAL(6, 3);

ALTER TABLE "PurchaseOrderLineItem"
ALTER COLUMN "quantity" TYPE DECIMAL(10, 3)
USING "quantity"::DECIMAL(10, 3),
ALTER COLUMN "unitPrice" TYPE DECIMAL(15, 3)
USING "unitPrice"::DECIMAL(15, 3);

ALTER TABLE "SubCOLineItem"
ALTER COLUMN "quantity" TYPE DECIMAL(10, 3)
USING "quantity"::DECIMAL(10, 3),
ALTER COLUMN "unitPrice" TYPE DECIMAL(15, 3)
USING "unitPrice"::DECIMAL(15, 3);
