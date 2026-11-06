-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "sheetError" TEXT,
ADD COLUMN     "sheetSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rfq" ADD COLUMN     "sheetError" TEXT,
ADD COLUMN     "sheetSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");

