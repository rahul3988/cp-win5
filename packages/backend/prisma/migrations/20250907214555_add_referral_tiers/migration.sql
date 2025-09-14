-- AlterTable
ALTER TABLE "admin_config" ADD COLUMN     "referralTiers" JSONB;

-- CreateTable
CREATE TABLE "referral_tier_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierIndex" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_tier_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_tier_claims_userId_tierIndex_key" ON "referral_tier_claims"("userId", "tierIndex");

-- AddForeignKey
ALTER TABLE "referral_tier_claims" ADD CONSTRAINT "referral_tier_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
