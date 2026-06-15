-- Persist one-to-one mappings between ElliHub vendors and QuickBooks vendors per realm.

CREATE TABLE "QuickBooksVendorMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quickBooksPayeeId" TEXT NOT NULL,
    "quickBooksId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksVendorMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuickBooksVendorMapping_realmId_vendorId_key" ON "QuickBooksVendorMapping"("realmId", "vendorId");
CREATE UNIQUE INDEX "QuickBooksVendorMapping_realmId_quickBooksId_key" ON "QuickBooksVendorMapping"("realmId", "quickBooksId");
CREATE INDEX "QuickBooksVendorMapping_connectionId_idx" ON "QuickBooksVendorMapping"("connectionId");
CREATE INDEX "QuickBooksVendorMapping_vendorId_idx" ON "QuickBooksVendorMapping"("vendorId");
CREATE INDEX "QuickBooksVendorMapping_quickBooksPayeeId_idx" ON "QuickBooksVendorMapping"("quickBooksPayeeId");
CREATE INDEX "QuickBooksVendorMapping_createdById_idx" ON "QuickBooksVendorMapping"("createdById");
CREATE INDEX "QuickBooksVendorMapping_updatedById_idx" ON "QuickBooksVendorMapping"("updatedById");

ALTER TABLE "QuickBooksVendorMapping" ADD CONSTRAINT "QuickBooksVendorMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QuickBooksConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksVendorMapping" ADD CONSTRAINT "QuickBooksVendorMapping_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksVendorMapping" ADD CONSTRAINT "QuickBooksVendorMapping_quickBooksPayeeId_fkey" FOREIGN KEY ("quickBooksPayeeId") REFERENCES "QuickBooksPayee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
