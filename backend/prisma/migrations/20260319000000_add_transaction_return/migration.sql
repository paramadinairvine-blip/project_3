-- AlterEnum: Add RETURN to ReferenceType
ALTER TYPE "ReferenceType" ADD VALUE 'RETURN';

-- CreateTable
CREATE TABLE "transaction_returns" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "reason" TEXT,
    "refundAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "transaction_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_return_items" (
    "id" TEXT NOT NULL,
    "transactionReturnId" TEXT NOT NULL,
    "transactionItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "baseQty" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "transaction_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_returns_returnNumber_key" ON "transaction_returns"("returnNumber");

-- CreateIndex
CREATE INDEX "transaction_returns_transactionId_idx" ON "transaction_returns"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_returns_createdAt_idx" ON "transaction_returns"("createdAt");

-- AddForeignKey
ALTER TABLE "transaction_returns" ADD CONSTRAINT "transaction_returns_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_returns" ADD CONSTRAINT "transaction_returns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_return_items" ADD CONSTRAINT "transaction_return_items_transactionReturnId_fkey" FOREIGN KEY ("transactionReturnId") REFERENCES "transaction_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_return_items" ADD CONSTRAINT "transaction_return_items_transactionItemId_fkey" FOREIGN KEY ("transactionItemId") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_return_items" ADD CONSTRAINT "transaction_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
