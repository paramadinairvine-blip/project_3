-- CreateTable
CREATE TABLE "product_units" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "conversionFactor" DECIMAL(15,4) NOT NULL,
    "isBaseUnit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_units_productId_unitId_key" ON "product_units"("productId", "unitId");

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit_of_measures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
