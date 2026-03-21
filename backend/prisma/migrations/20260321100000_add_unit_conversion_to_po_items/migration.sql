-- AlterTable: Add unit conversion fields to purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN "unitId" TEXT;
ALTER TABLE "purchase_order_items" ADD COLUMN "baseQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order_items" ADD COLUMN "receivedBaseQty" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set baseQty = quantity for existing records (assuming they were in base unit)
UPDATE "purchase_order_items" SET "baseQty" = "quantity";

-- Backfill: set receivedBaseQty = receivedQty for existing records
UPDATE "purchase_order_items" SET "receivedBaseQty" = "receivedQty";

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
