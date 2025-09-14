/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_EARNING';
ALTER TYPE "TransactionType" ADD VALUE 'BONUS_CREDIT';
ALTER TYPE "TransactionType" ADD VALUE 'COIN_CREDIT';
ALTER TYPE "TransactionType" ADD VALUE 'COIN_DEBIT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "attendanceStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "coins" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastAttendanceAt" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "wageringProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "wageringRequired" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_earnings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_config" (
    "id" TEXT NOT NULL,
    "referralLevel1Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralLevel2Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralLevel3Pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attendanceDay7Amt" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referrals_parentId_level_idx" ON "referrals"("parentId", "level");

-- CreateIndex
CREATE INDEX "referrals_userId_idx" ON "referrals"("userId");

-- CreateIndex
CREATE INDEX "referral_earnings_userId_level_idx" ON "referral_earnings"("userId", "level");

-- CreateIndex
CREATE INDEX "referral_earnings_fromUserId_idx" ON "referral_earnings"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
