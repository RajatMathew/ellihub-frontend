ALTER TABLE "PurchaseOrder" ADD COLUMN "negotiatedDiscount" DECIMAL(15, 2);

ALTER TABLE "SubChangeOrder" ADD COLUMN "negotiatedDiscount" DECIMAL(15, 2);
ALTER TABLE "SubChangeOrder" ALTER COLUMN "shippingHandlingFee" TYPE DECIMAL(15, 2) USING "shippingHandlingFee"::DECIMAL(15, 2);
