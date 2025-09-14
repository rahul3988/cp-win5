-- AlterTable
ALTER TABLE "deposit_requests" ADD COLUMN     "usdtHash" TEXT,
ALTER COLUMN "utrCode" DROP NOT NULL;
