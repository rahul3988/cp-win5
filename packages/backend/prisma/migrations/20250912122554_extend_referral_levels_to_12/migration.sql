/*
  Warnings:

  - You are about to drop the `GiftCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "GiftCodeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXHAUSTED');

-- AlterEnum
ALTER TYPE "AdminPermission" ADD VALUE 'GIFT_CODES';

-- DropForeignKey
ALTER TABLE "gift_code_redemptions" DROP CONSTRAINT "gift_code_redemptions_giftCodeId_fkey";

-- AlterTable
ALTER TABLE "admin_config" ADD COLUMN     "referralLevel10Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel11Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel12Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel4Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel5Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel6Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel7Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel8Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralLevel9Pct" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "GiftCode";

-- CreateTable
CREATE TABLE "gift_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "GiftCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_codes_code_key" ON "gift_codes"("code");

-- AddForeignKey
ALTER TABLE "gift_codes" ADD CONSTRAINT "gift_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_giftCodeId_fkey" FOREIGN KEY ("giftCodeId") REFERENCES "gift_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
