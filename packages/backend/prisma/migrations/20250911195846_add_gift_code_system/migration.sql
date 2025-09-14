/*
  Warnings:

  - The values [GIFT_CODES] on the enum `AdminPermission` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `gift_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminPermission_new" AS ENUM ('MANAGE_BETS', 'MANAGE_USERS', 'MANAGE_WITHDRAWALS', 'MANAGE_DEPOSITS', 'VIEW_ANALYTICS', 'EMERGENCY_CONTROLS', 'MANAGE_TIMERS');
ALTER TABLE "admins" ALTER COLUMN "permissions" TYPE "AdminPermission_new"[] USING ("permissions"::text::"AdminPermission_new"[]);
ALTER TYPE "AdminPermission" RENAME TO "AdminPermission_old";
ALTER TYPE "AdminPermission_new" RENAME TO "AdminPermission";
DROP TYPE "AdminPermission_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "gift_code_redemptions" DROP CONSTRAINT "gift_code_redemptions_giftCodeId_fkey";

-- DropForeignKey
ALTER TABLE "gift_codes" DROP CONSTRAINT "gift_codes_createdBy_fkey";

-- DropTable
DROP TABLE "gift_codes";

-- DropEnum
DROP TYPE "GiftCodeStatus";

-- CreateTable
CREATE TABLE "GiftCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_code_key" ON "GiftCode"("code");

-- AddForeignKey
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_giftCodeId_fkey" FOREIGN KEY ("giftCodeId") REFERENCES "GiftCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
