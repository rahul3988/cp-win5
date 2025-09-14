-- AlterTable
ALTER TABLE "bets" ADD COLUMN     "coveredNumbers" JSONB,
ADD COLUMN     "expandedBets" JSONB,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "totalBetAmount" DOUBLE PRECISION;
