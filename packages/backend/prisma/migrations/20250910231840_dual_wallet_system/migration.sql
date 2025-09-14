/*
  Warnings:

  - You are about to drop the column `balance` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gameCredit` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "wallet" "WalletType" NOT NULL DEFAULT 'BETTING';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "balance",
DROP COLUMN "gameCredit",
ADD COLUMN     "walletBetting" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
ADD COLUMN     "walletGaming" DECIMAL(65,30) NOT NULL DEFAULT 0.0;
