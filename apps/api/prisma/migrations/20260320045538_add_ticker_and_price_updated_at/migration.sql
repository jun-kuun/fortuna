-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "ticker" TEXT;

-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3);
