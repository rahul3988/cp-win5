import { PrismaClient } from '@prisma/client';
import { WalletType } from '@win5x/common';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class WalletService {
  /**
   * Check if user can place a bet with the given amount
   * Rules:
   * - User must have minimum ₹10 in betting wallet to place any bet
   * - Can bet up to (betting wallet + gaming wallet) if betting wallet >= ₹10
   * - Cannot bet if betting wallet < ₹10, even if gaming wallet has funds
   */
  static async canPlaceBet(userId: string, betAmount: number): Promise<{
    canBet: boolean;
    reason?: string;
    availableAmount: number;
    bettingWalletBalance: number;
    gamingWalletBalance: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBetting: true, walletGaming: true },
    });

    if (!user) {
      return {
        canBet: false,
        reason: 'User not found',
        availableAmount: 0,
        bettingWalletBalance: 0,
        gamingWalletBalance: 0,
      };
    }

    const bettingWalletBalance = Number(user.walletBetting);
    const gamingWalletBalance = Number(user.walletGaming);
    const totalAvailable = bettingWalletBalance + gamingWalletBalance;

    // Check minimum betting wallet requirement
    if (bettingWalletBalance < 10) {
      return {
        canBet: false,
        reason: 'Minimum ₹10 required in betting wallet to place bets',
        availableAmount: totalAvailable,
        bettingWalletBalance,
        gamingWalletBalance,
      };
    }

    // Check if bet amount is within available funds
    if (betAmount > totalAvailable) {
      return {
        canBet: false,
        reason: 'Insufficient funds',
        availableAmount: totalAvailable,
        bettingWalletBalance,
        gamingWalletBalance,
      };
    }

    return {
      canBet: true,
      availableAmount: totalAvailable,
      bettingWalletBalance,
      gamingWalletBalance,
    };
  }

  static async addBonus(userId: string, amount: number, prisma = new PrismaClient()) {
    await prisma.user.update({ where: { id: userId }, data: { bonusBalance: { increment: amount }, wageringRequired: { increment: amount } } });
    await prisma.transaction.create({ data: { userId, type: 'BONUS_CREDIT', amount, wallet: 'BETTING', status: 'COMPLETED', description: 'Bonus credited' } });
  }

  static async addCoins(userId: string, amount: number, prisma = new PrismaClient()) {
    await prisma.user.update({ where: { id: userId }, data: { coins: { increment: amount } } });
    await prisma.transaction.create({ data: { userId, type: 'COIN_CREDIT', amount, status: 'COMPLETED', description: 'Win5x Coins credited' } });
  }

  /**
   * Deduct bet amount from appropriate wallet(s)
   * If useGamingWallet is true, combine both wallets for the bet
   */
  static async deductBetAmount(userId: string, betAmount: number, useGamingWallet: boolean = false): Promise<{
    walletType: WalletType;
    bettingWalletDeduction: number;
    gamingWalletDeduction: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBetting: true, walletGaming: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const bettingWalletBalance = Number(user.walletBetting);
    const gamingWalletBalance = Number(user.walletGaming);

    let bettingWalletDeduction = 0;
    let gamingWalletDeduction = 0;
    let walletType: WalletType = 'betting';

    if (useGamingWallet) {
      // Gaming Wallet option: combine both wallets
      const totalAvailable = bettingWalletBalance + gamingWalletBalance;
      
      if (totalAvailable < betAmount) {
        throw new Error('Insufficient combined wallet balance');
      }

      // Use all betting wallet first, then gaming wallet
      bettingWalletDeduction = Math.min(bettingWalletBalance, betAmount);
      gamingWalletDeduction = Math.max(0, betAmount - bettingWalletBalance);
      walletType = 'gaming'; // Mark as gaming wallet bet
    } else {
      // Normal betting: use betting wallet only
      if (bettingWalletBalance < betAmount) {
        throw new Error('Insufficient betting wallet balance');
      }
      bettingWalletDeduction = betAmount;
    }

    // Update user balances
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletBetting: { decrement: bettingWalletDeduction },
        walletGaming: { decrement: gamingWalletDeduction },
      },
    });

    logger.info(`Bet deduction: User ${userId}, Betting: ₹${bettingWalletDeduction}, Gaming: ₹${gamingWalletDeduction}, Wallet: ${walletType}`);

    return {
      walletType,
      bettingWalletDeduction,
      gamingWalletDeduction,
    };
  }

  /**
   * Add winnings: credit to gaming wallet as per business rule
   */
  static async addWinnings(userId: string, amount: number, originalWalletType: WalletType): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletBetting: { increment: amount },
      },
    });

    logger.info(`Winnings added: User ${userId}, Amount: ₹${amount}, Original wallet: ${originalWalletType}, Added to: betting`);
  }

  /**
   * Add 10% reversal credit to gaming wallet for losses
   */
  static async addReversalCredit(userId: string, lossAmount: number): Promise<void> {
    // Credit 10% of loss into gaming wallet as cashback
    const cashbackAmount = parseFloat((lossAmount * 0.10).toFixed(2));
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletGaming: { increment: cashbackAmount },
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'CASHBACK',
        amount: cashbackAmount,
        wallet: 'GAMING',
        status: 'COMPLETED',
        description: 'Loss cashback credited (10%)',
      },
    });

    logger.info(`Reversal credit added: User ${userId}, 10% of loss moved to gaming wallet: ₹${cashbackAmount}`);
  }

  /**
   * Get user wallet balances
   */
  static async getWalletBalances(userId: string): Promise<{
    bettingWallet: number;
    gamingWallet: number;
    totalAvailable: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBetting: true, walletGaming: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      bettingWallet: Number(user.walletBetting),
      gamingWallet: Number(user.walletGaming),
      totalAvailable: Number(user.walletBetting) + Number(user.walletGaming),
    };
  }

  /**
   * Check if user can withdraw from betting wallet
   * Only betting wallet funds can be withdrawn
   */
  static async canWithdraw(userId: string, amount: number): Promise<{
    canWithdraw: boolean;
    reason?: string;
    availableForWithdrawal: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBetting: true },
    });

    if (!user) {
      return {
        canWithdraw: false,
        reason: 'User not found',
        availableForWithdrawal: 0,
      };
    }

    const bettingWalletBalance = Number(user.walletBetting);

    if (amount > bettingWalletBalance) {
      return {
        canWithdraw: false,
        reason: 'Insufficient betting wallet balance',
        availableForWithdrawal: bettingWalletBalance,
      };
    }

    return {
      canWithdraw: true,
      availableForWithdrawal: bettingWalletBalance,
    };
  }
}

