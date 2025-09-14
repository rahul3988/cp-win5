-- CreateEnum
CREATE TYPE "GiftCodeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXHAUSTED');

-- AlterEnum
ALTER TYPE "AdminPermission" ADD VALUE 'GIFT_CODES';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'GIFT_CODE_REDEMPTION';

-- CreateTable
CREATE TABLE "gift_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GiftCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_code_redemptions" (
    "id" TEXT NOT NULL,
    "giftCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_codes_code_key" ON "gift_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gift_code_redemptions_giftCodeId_userId_key" ON "gift_code_redemptions"("giftCodeId", "userId");

-- AddForeignKey
ALTER TABLE "gift_codes" ADD CONSTRAINT "gift_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_giftCodeId_fkey" FOREIGN KEY ("giftCodeId") REFERENCES "gift_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
