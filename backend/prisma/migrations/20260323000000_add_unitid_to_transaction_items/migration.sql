-- AlterTable
ALTER TABLE "transaction_items" ADD COLUMN "unitId" TEXT;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
