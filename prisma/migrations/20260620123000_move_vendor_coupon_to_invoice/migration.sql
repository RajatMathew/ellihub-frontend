ALTER TABLE "Invoice"
ADD COLUMN "vendorCoupon" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RFQVendorQuote"
DROP COLUMN "vendorCoupon";