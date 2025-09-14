/*
  Warnings:

  - The values [ODD_EVEN,COLOR] on the enum `BetType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CashbackStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "BetType_new" AS ENUM ('NUMBER');
ALTER TABLE "bets" ALTER COLUMN "betType" TYPE "BetType_new" USING ("betType"::text::"BetType_new");
ALTER TYPE "BetType" RENAME TO "BetType_old";
ALTER TYPE "BetType_new" RENAME TO "BetType";
DROP TYPE "BetType_old";
COMMIT;

-- CreateTable
CREATE TABLE "cashback_schedules" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "day1Amount" DOUBLE PRECISION NOT NULL,
    "dailyAmount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "status" "CashbackStatus" NOT NULL DEFAULT 'SCHEDULED',
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_schedules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cashback_schedules" ADD CONSTRAINT "cashback_schedules_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_schedules" ADD CONSTRAINT "cashback_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
