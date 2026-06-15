ALTER TABLE "RFQVendorQuote"
ADD COLUMN "negotiationAmount" DECIMAL(15, 2),
ADD COLUMN "vendorCoupon" BOOLEAN NOT NULL DEFAULT false;
