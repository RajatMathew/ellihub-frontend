ALTER TABLE "ProjectSchedule"
ADD COLUMN "primeChangeOrderId" TEXT;

ALTER TABLE "ProjectSchedule"
ADD CONSTRAINT "ProjectSchedule_primeChangeOrderId_fkey"
FOREIGN KEY ("primeChangeOrderId") REFERENCES "PrimeChangeOrder"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ProjectSchedule_primeChangeOrderId_idx"
ON "ProjectSchedule"("primeChangeOrderId");
