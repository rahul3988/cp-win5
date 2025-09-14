import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { calculateCashbackAmount } from '@win5x/common';

export class CashbackService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Schedule cashback for a losing bet
   * Immediate 10% cashback to Gaming Wallet
   */
  async scheduleCashback(betId: string, betAmount: number, userId: string): Promise<void> {
    try {
      const cashbackAmount = calculateCashbackAmount(betAmount); // 10% of bet amount

      // Credit 10% immediately to Gaming Wallet
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletGaming: { increment: cashbackAmount },
        },
      });

      // Create transaction record for cashback
      await this.prisma.transaction.create({
        data: {
          userId,
          type: 'CASHBACK',
          amount: cashbackAmount,
          wallet: 'GAMING',
          status: 'COMPLETED',
          description: `10% cashback for losing bet ${betId}`,
        },
      });

      logger.info(`Cashback credited for bet ${betId}: ${cashbackAmount} to Gaming Wallet`);
    } catch (error) {
      logger.error('Failed to schedule cashback:', error);
      throw error;
    }
  }

  /**
   * Process daily cashback payments
   * Should be called by a cron job daily
   */
  async processDailyCashback(): Promise<void> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Find cashback schedules that need processing
      const schedules = await this.prisma.cashbackSchedule.findMany({
        where: {
          status: 'SCHEDULED',
          remainingAmount: { gt: 0 },
          OR: [
            { lastProcessedAt: null }, // Never processed
            { 
              lastProcessedAt: { 
                lt: startOfDay // Last processed before today
              }
            }
          ],
        },
        include: {
          user: true,
        },
      });

      for (const schedule of schedules) {
        await this.processSchedule(schedule);
      }

      logger.info(`Processed ${schedules.length} cashback schedules`);
    } catch (error) {
      logger.error('Failed to process daily cashback:', error);
      throw error;
    }
  }

  private async processSchedule(schedule: any): Promise<void> {
    try {
      const { id, userId, dailyAmount, remainingAmount, lastProcessedAt } = schedule;
      
      // Calculate how much to credit today
      const amountToCredit = Math.min(dailyAmount, remainingAmount);
      
      if (amountToCredit <= 0) {
        // Mark as completed
        await this.prisma.cashbackSchedule.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
        return;
      }

      // Credit to Gaming Wallet
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletGaming: { increment: amountToCredit },
        },
      });

      // Create transaction record
      await this.prisma.transaction.create({
        data: {
          userId,
          type: 'CASHBACK',
          amount: amountToCredit,
          wallet: 'GAMING',
          status: 'COMPLETED',
          description: `Daily Cashback - Bet ${schedule.betId}`,
        },
      });

      // Update schedule
      await this.prisma.cashbackSchedule.update({
        where: { id },
        data: {
          remainingAmount: { decrement: amountToCredit },
          lastProcessedAt: new Date(),
          status: remainingAmount - amountToCredit <= 0 ? 'COMPLETED' : 'SCHEDULED',
        },
      });

      logger.info(`Processed cashback for user ${userId}: ${amountToCredit} credited`);
    } catch (error) {
      logger.error(`Failed to process cashback schedule ${schedule.id}:`, error);
    }
  }

  /**
   * Get user's cashback status
   */
  async getUserCashbackStatus(userId: string): Promise<any> {
    try {
      const schedules = await this.prisma.cashbackSchedule.findMany({
        where: {
          userId,
          status: 'SCHEDULED',
        },
        include: {
          bet: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return schedules;
    } catch (error) {
      logger.error('Failed to get user cashback status:', error);
      throw error;
    }
  }
}
