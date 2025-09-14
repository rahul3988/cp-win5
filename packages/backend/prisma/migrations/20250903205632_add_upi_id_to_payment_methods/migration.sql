-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('BETTING', 'GAMING');

-- AlterEnum
ALTER TYPE "GameRoundStatus" ADD VALUE 'COUNTDOWN';

-- AlterTable
ALTER TABLE "bets" ADD COLUMN     "walletType" "WalletType" NOT NULL DEFAULT 'BETTING';

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "upiId" TEXT;
