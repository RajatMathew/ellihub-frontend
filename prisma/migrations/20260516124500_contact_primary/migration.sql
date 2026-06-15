ALTER TABLE "Contact" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Contact_vendorId_isPrimary_idx" ON "Contact"("vendorId", "isPrimary");
CREATE INDEX "Contact_generalContractorId_isPrimary_idx" ON "Contact"("generalContractorId", "isPrimary");

CREATE UNIQUE INDEX "Contact_primary_vendor_unique"
    ON "Contact"("vendorId")
    WHERE "isPrimary" = true AND "vendorId" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "Contact_primary_gc_unique"
    ON "Contact"("generalContractorId")
    WHERE "isPrimary" = true AND "generalContractorId" IS NOT NULL AND "deletedAt" IS NULL;
