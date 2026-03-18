-- AlterTable: Add baseQty column to transaction_items
-- baseQty stores the quantity in base unit (after conversion)
-- Default 0 for existing rows; will be backfilled from stock_movements
ALTER TABLE "transaction_items" ADD COLUMN "baseQty" INTEGER NOT NULL DEFAULT 0;

-- Backfill baseQty from stock_movements for existing transactions
-- This ensures old data also has correct baseQty for cancel operations
UPDATE "transaction_items" ti
SET "baseQty" = COALESCE(
  (SELECT sm."quantity"
   FROM "stock_movements" sm
   WHERE sm."referenceId" = ti."transactionId"
     AND sm."productId" = ti."productId"
     AND sm."type" = 'OUT'
     AND sm."referenceType" = 'TRANSACTION'
   ORDER BY sm."createdAt" DESC
   LIMIT 1),
  ti."quantity"
);
