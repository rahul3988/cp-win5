/*
  Warnings:

  - You are about to drop the column `referralTiers` on the `admin_config` table. All the data in the column will be lost.
  - You are about to drop the `referral_tier_claims` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "referral_tier_claims" DROP CONSTRAINT "referral_tier_claims_userId_fkey";

-- AlterTable
ALTER TABLE "admin_config" DROP COLUMN "referralTiers";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- DropTable
DROP TABLE "referral_tier_claims";
