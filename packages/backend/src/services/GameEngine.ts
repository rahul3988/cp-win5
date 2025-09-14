import { PrismaClient, GameRound, GameRoundStatus, Bet, BetStatus } from '@prisma/client';
import { RedisService } from './RedisService';
// ReferralService removed - using direct database calls
import { ConfigService } from './ConfigService';
import { GamePhaseManager } from './GamePhaseManager';
import { WalletService } from './WalletService';
import { CashbackService } from './CashbackService';
import { logger } from '../utils/logger';
import { 
  GAME_CONFIG, 
  CACHE_KEYS, 
  determineLeastChosenNumber, 
  calculatePayout, 
  calculateCashbackAmount,
  getNumberColor,
  isNumberOdd,
  GamePhase,
  expandBet,
  calculatePotentialPayout,
  calculateBetsPayout,
  getCoveredNumbers,
  BET_TYPES
} from '@win5x/common';
import { EventEmitter } from 'events';

export interface GameEngineEvents {
  'round_started': (round: GameRound) => void;
  'betting_closed': (round: GameRound) => void;
  'spin_started': (round: GameRound) => void;
  'round_completed': (round: GameRound, winningNumber: number) => void;
  'bet_distribution_updated': (roundId: string, distribution: any) => void;
  'timer_updated': (roundId: string, phase: string, timeRemaining: number) => void;
}

export class GameEngine extends EventEmitter {
  private prisma: PrismaClient;
  private redis: RedisService;
  private phaseManager: GamePhaseManager;
  private cashbackService: CashbackService;
  private currentRound: GameRound | null = null;
  private gameConfig: any;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private roundCounter: number = 0;

  constructor(prisma: PrismaClient, redis: RedisService) {
    super();
    this.prisma = prisma;
    this.redis = redis;
    this.phaseManager = new GamePhaseManager();
    this.cashbackService = new CashbackService(prisma);
    this.setupPhaseManagerListeners();
  }

  private setupPhaseManagerListeners(): void {
    this.phaseManager.on('phase_update', (phaseUpdate) => {
      this.emit('timer_updated', this.currentRound?.id || '', phaseUpdate.phase, phaseUpdate.timeRemaining);
    });

    this.phaseManager.on('phase_transition', async (transition) => {
      logger.info(`Phase transition: ${transition.from} → ${transition.to}`);
      
      switch (transition.to) {
        case GamePhase.SPIN_PREPARATION:
          await this.startSpinPreparationPhase();
          break;
        case GamePhase.SPINNING:
          await this.startSpinningPhase();
          break;
        case GamePhase.RESULT:
          await this.startResultPhase();
          break;
        case GamePhase.TRANSITION:
          await this.startTransitionPhase();
          break;
        case GamePhase.BETTING:
          await this.startNewRound();
          break;
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      // Load game configuration
      await this.loadGameConfig();
      
      // Get the last round number
      const lastRound = await this.prisma.gameRound.findFirst({
        orderBy: { roundNumber: 'desc' },
      });
      
      this.roundCounter = lastRound ? lastRound.roundNumber : 0;
      
      // Check for any incomplete rounds
      await this.handleIncompleteRounds();
      
      logger.info('Game Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Game Engine:', error);
      throw error;
    }
  }

  async loadGameConfig(): Promise<void> {
    try {
      // Try to get from cache first
      const cachedConfig = await this.redis.get(CACHE_KEYS.GAME_CONFIG);
      if (cachedConfig) {
        this.gameConfig = cachedConfig;
        return;
      }

      // Get from database
      const dbConfig = await this.prisma.gameConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      this.gameConfig = dbConfig || {
        bettingDuration: GAME_CONFIG.DEFAULT_BETTING_DURATION,
        spinDuration: GAME_CONFIG.DEFAULT_SPINNING_DURATION,
        resultDuration: GAME_CONFIG.DEFAULT_RESULT_DURATION,
        minBetAmount: GAME_CONFIG.MIN_BET_AMOUNT,
        maxBetAmount: GAME_CONFIG.MAX_BET_AMOUNT,
        payoutMultiplier: GAME_CONFIG.PAYOUT_MULTIPLIER,
        cashbackPercentage: GAME_CONFIG.CASHBACK_PERCENTAGE,
        maxExposure: GAME_CONFIG.MAX_EXPOSURE_MULTIPLIER * GAME_CONFIG.MAX_BET_AMOUNT,
        forceWinner: null,
      };

      // Cache the configuration
      await this.redis.set(CACHE_KEYS.GAME_CONFIG, this.gameConfig, 300); // 5 minutes cache
    } catch (error) {
      logger.error('Failed to load game configuration:', error);
      throw error;
    }
  }

  async handleIncompleteRounds(): Promise<void> {
    try {
      const incompleteRounds = await this.prisma.gameRound.findMany({
        where: {
          status: {
            in: [GameRoundStatus.BETTING, GameRoundStatus.BETTING_CLOSED, GameRoundStatus.SPINNING],
          },
        },
        include: {
          bets: true,
        },
      });

      for (const round of incompleteRounds) {
        logger.warn(`Found incomplete round ${round.id}, completing it...`);
        await this.completeRound(round);
      }
    } catch (error) {
      logger.error('Failed to handle incomplete rounds:', error);
    }
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Game Engine is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Game Engine started');
    
    // Start the first round immediately
    this.startNewRound();
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Game Engine is not running');
      return;
    }

    this.isRunning = false;
    
    // Clear all timers
    this.timers.forEach((timer, key) => {
      clearTimeout(timer);
      this.timers.delete(key);
    });

    logger.info('Game Engine stopped');
  }

  async startNewRound(): Promise<GameRound> {
    try {
      if (!this.isRunning) {
        throw new Error('Game Engine is not running');
      }

      this.roundCounter++;
      
      const round = await this.prisma.gameRound.create({
        data: {
          roundNumber: this.roundCounter,
          status: GameRoundStatus.BETTING,
          bettingStartTime: new Date(),
          bettingEndTime: new Date(Date.now() + this.gameConfig.bettingDuration * 1000),
        },
      });

      this.currentRound = round;
      
      // Cache the current round
      await this.redis.set(CACHE_KEYS.CURRENT_ROUND, round, this.gameConfig.bettingDuration + 60);
      
      // Initialize bet distribution
      await this.updateBetDistribution(round.id);
      
      // Start the phase manager cycle
      this.phaseManager.startPhaseCycle();
      
      // Emit event
      this.emit('round_started', round);
      
      logger.info(`Started new round ${round.roundNumber} (${round.id})`);
      
      return round;
    } catch (error) {
      logger.error('Failed to start new round:', error);
      throw error;
    }
  }





  async completeRound(round: GameRound): Promise<void> {
    try {
      // Get all bets for this round
      const bets = await this.prisma.bet.findMany({
        where: { roundId: round.id, status: BetStatus.PENDING },
      }) as any[];

      // Use the winning number that was already determined in spin preparation phase
      const winningNumber = this.phaseManager.getWinningNumber();
      if (winningNumber === null) {
        logger.warn(`Winning number not set for round ${round.id}, skipping round completion`);
        return; // Skip completing the round instead of throwing an error
      }

      logger.info(`Completing round ${round.roundNumber} with winning number: ${winningNumber} (forced: ${(this.phaseManager as any).wasForcedWinner || false})`);

      // Debug: log exposures and simulated payouts for verification
      const payouts: Record<number, number> = {};
      for (let n = 0; n <= 9; n++) payouts[n] = 0;
      for (const bet of bets) {
        const betValue = JSON.parse(bet.betValue);
        const payout = calculatePayout(bet.betType.toLowerCase() as any, betValue, bet.amount, winningNumber);
        payouts[winningNumber] += payout; // focus on chosen winner; below we simulate all in spin prep
      }
      logger.info('Round completion', { chosen: winningNumber, payoutForChosen: payouts[winningNumber] });
      const isWinningOdd = isNumberOdd(winningNumber);
      const winningColor = getNumberColor(winningNumber);

      // Calculate total bet amount and payout
      let totalBetAmount = 0;
      let totalPayout = 0;

      // Process each bet
      for (const bet of bets) {
        // Idempotency guard: skip bets already settled to avoid double credits
        if ((bet as any).settledAt) {
          continue;
        }
        totalBetAmount += bet.amount;
        
        const betValue = JSON.parse(bet.betValue);
        const payout = calculatePayout(
          bet.betType.toLowerCase() as any,
          betValue,
          bet.amount,
          winningNumber
        );

        const isWinner = payout > 0;
        totalPayout += payout;

        // Update bet
        await this.prisma.bet.update({
          where: { id: bet.id },
          data: {
            isWinner,
            actualPayout: payout,
            status: isWinner ? BetStatus.WON : BetStatus.LOST,
            settledAt: new Date(),
          },
        });

        // Handle winnings and losses using new settlement logic
        if (isWinner && payout > 0) {
          const walletType = (bet as any).walletType || 'betting';
          
          if (walletType.toLowerCase() === 'gaming') {
            // Gaming Wallet bet: winnings go to Betting Wallet, Gaming Wallet becomes 0
            await WalletService.addWinnings(bet.userId, payout, 'betting');
            
            // Reset Gaming Wallet to 0
            await this.prisma.user.update({
              where: { id: bet.userId },
              data: { walletGaming: 0 },
            });
            
            // Create transaction record for Gaming Wallet reset
            await this.prisma.transaction.create({
              data: {
                userId: bet.userId,
                type: 'BONUS_CREDIT',
                amount: 0,
                wallet: 'GAMING',
                status: 'COMPLETED',
                description: `Gaming Wallet reset to ₹0 after winning bet on round ${round.roundNumber}`,
              },
            });
          } else {
            // Normal betting wallet bet: winnings go to betting wallet
            await WalletService.addWinnings(bet.userId, payout, 'betting');
          }

          // Create transaction record for winnings
          await this.prisma.transaction.create({
            data: {
              userId: bet.userId,
              type: 'BET_WON',
              amount: payout,
              wallet: 'BETTING',
              status: 'COMPLETED',
              description: `Won bet on round ${round.roundNumber} using ${walletType.toLowerCase()} wallet`,
            },
          });
        } else {
          const walletType = (bet as any).walletType || 'betting';
          
          if (walletType.toLowerCase() === 'gaming') {
            // Gaming Wallet bet loss: 10% cashback goes to Gaming Wallet
            const cashbackAmount = parseFloat((bet.amount * 0.10).toFixed(2));
            await this.prisma.user.update({
              where: { id: bet.userId },
              data: { walletGaming: { increment: cashbackAmount } },
            });
            
            // Create transaction record for cashback
            await this.prisma.transaction.create({
              data: {
                userId: bet.userId,
                type: 'CASHBACK',
                amount: cashbackAmount,
                wallet: 'GAMING',
                status: 'COMPLETED',
                description: `10% cashback for Gaming Wallet bet loss on round ${round.roundNumber}`,
              },
            });
          } else {
            // Normal betting wallet bet loss: schedule 10% cashback
            await this.cashbackService.scheduleCashback(bet.id, bet.amount, bet.userId);
          }

          // Create transaction record for loss (bet deduction already recorded on placement)
          await this.prisma.transaction.create({
            data: {
              userId: bet.userId,
              type: 'BET_LOST',
              amount: -bet.amount,
              wallet: walletType.toUpperCase() as any,
              status: 'COMPLETED',
              description: `Lost bet on round ${round.roundNumber} using ${walletType.toLowerCase()} wallet`,
            },
          });
        }

        // Update wagering progress: user must wager bonus amount before withdrawal
        try {
          await this.prisma.user.update({
            where: { id: bet.userId },
            data: ({
              wageringProgress: { increment: bet.amount },
            } as any),
          });
        } catch {}

        // Credit referral earnings based on wager amount
        try {
          // ReferralService removed - using direct database calls
          // This will be implemented later if needed
          logger.info(`Referral earnings processing skipped for wager: ${bet.id}`, {
            userId: bet.userId,
            amount: bet.amount
          });
        } catch (e) {
          logger.warn('Failed to credit referral earning for wager', e);
        }

        // Get updated user balance for real-time update
        const updatedUser = await this.prisma.user.findUnique({
          where: { id: bet.userId },
          select: { walletBetting: true, walletGaming: true },
        });

        // Emit balance update to user
        this.emit('user_balance_update', {
          userId: bet.userId,
          bettingWallet: Number(updatedUser?.walletBetting || 0),
          gamingWallet: Number(updatedUser?.walletGaming || 0),
        });


      }

      const houseProfitLoss = totalBetAmount - totalPayout;

      // Update round to RESULT status first
      const resultRound = await this.prisma.gameRound.update({
        where: { id: round.id },
        data: {
          status: GameRoundStatus.RESULT,
          resultTime: new Date(),
          winningNumber,
          winningColor,
          isWinningOdd,
          totalBetAmount,
          totalPayout,
          houseProfitLoss,
        },
      });

      this.emit('round_completed', resultRound, winningNumber);
      
      // Broadcast winner immediately for frontend synchronization
      this.emit('round_winner', {
        roundId: round.id,
        roundNumber: round.roundNumber,
        winningNumber,
        winningColor, // derived from number per mapping
        isWinningOdd, // derived from number
        totalBetAmount,
        totalPayout,
        houseProfitLoss,
      });
      
      // Removed daily aggregated cashback. Instant per-loss cashback is handled above.
      
      logger.info(`Completed round ${round.roundNumber}, winning number: ${winningNumber}, house P/L: ${houseProfitLoss}`);
    } catch (error) {
      logger.error(`Failed to complete round ${round.id}:`, error);
    }
  }

  async finalizeRound(roundId: string): Promise<void> {
    try {
      // Update round to COMPLETED status
      const completedRound = await this.prisma.gameRound.update({
        where: { id: roundId },
        data: {
          status: GameRoundStatus.COMPLETED,
        },
      });

      logger.info(`Finalized round ${completedRound.roundNumber}`);
    } catch (error) {
      logger.error(`Failed to finalize round ${roundId}:`, error);
    }
  }

  async placeBet(userId: string, roundId: string, betType: string, betValue: any, amount: number, useGamingWallet: boolean = false): Promise<Bet> {
    try {
      // Use database transaction to prevent race conditions
      const result = await this.prisma.$transaction(async (tx) => {
        // Validate round is in betting phase
        const round = await tx.gameRound.findUnique({
          where: { id: roundId },
        });

        if (!round || round.status !== GameRoundStatus.BETTING) {
          throw new Error('Betting is not available for this round');
        }

        // Check if betting time has expired
        if (new Date() > round.bettingEndTime!) {
          throw new Error('Betting time has expired');
        }

        // Validate bet amount using constants
        if (amount < GAME_CONFIG.minBet) {
          throw new Error(`Minimum bet amount is ₹${GAME_CONFIG.minBet}`);
        }
        if (amount > GAME_CONFIG.maxBet) {
          throw new Error(`Maximum bet amount is ₹${GAME_CONFIG.maxBet}`);
        }
        if (!Number.isInteger(amount)) {
          throw new Error('Bet amount must be a whole number');
        }

        // Check if user can place bet using wallet service
        const walletCheck = await WalletService.canPlaceBet(userId, amount);
        if (!walletCheck.canBet) {
          throw new Error(walletCheck.reason || 'Cannot place bet');
        }

        // Get user details
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Expand the bet according to betting rules
        const betExpansion = expandBet(betType, typeof betValue === 'number' ? betValue : 0, amount);
        
        // Enforce at most two categories per round (number, odd_even)
        const normalizeCategory = (t: string): 'number' | 'odd_even' => {
          const key = (t || '').toLowerCase();
          if (key === 'number' || key === 'single') return 'number';
          return 'odd_even';
        };
        const newCategory = normalizeCategory(betType);
        const existingBets = await tx.bet.findMany({
          where: { userId, roundId },
          select: { betType: true },
        });
        const usedCategories = new Set(existingBets.map(b => normalizeCategory(String(b.betType))));
        usedCategories.add(newCategory);
        if (usedCategories.size > 2) {
          throw new Error('You can bet in at most two categories (Numbers, Odd/Even) per round');
        }

        // Deduct total bet amount from appropriate wallet(s)
        const deductionResult = await WalletService.deductBetAmount(userId, betExpansion.totalBet, useGamingWallet);

        // Create individual bets for each expanded number
        const bets = await Promise.all(
          betExpansion.bets.map(expandedBet => 
            tx.bet.create({
              data: {
                userId,
                roundId,
                betType: 'NUMBER' as any,
                betValue: JSON.stringify(expandedBet.number),
                amount: expandedBet.bet,
                potentialPayout: calculatePotentialPayout(betType, expandedBet.number, betExpansion.originalAmount),
                status: BetStatus.PENDING,
                walletType: deductionResult.walletType.toUpperCase() as any,
                originalAmount: betExpansion.originalAmount,
                totalBetAmount: betExpansion.totalBet,
                expandedBets: JSON.stringify(betExpansion.bets),
                coveredNumbers: JSON.stringify(getCoveredNumbers(betType, typeof betValue === 'number' ? betValue : undefined)),
              } as any,
            })
          )
        );
        
        const bet = bets[0]; // Return the first bet as the main bet reference

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId,
            type: 'BET_PLACED',
            amount: -betExpansion.totalBet,
            wallet: deductionResult.walletType.toUpperCase() as any,
            status: 'COMPLETED',
            description: `Placed ${betType} bet (₹${betExpansion.originalAmount} → ₹${betExpansion.totalBet}) on round ${round.roundNumber} using ${deductionResult.walletType} wallet`,
          },
        });

        return { bet, round, user };
      });

      // Update bet distribution after successful transaction
      await this.updateBetDistribution(roundId);
      
      // Get updated user balance for real-time update
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletBetting: true, walletGaming: true },
      });

      // Emit balance update to user
      this.emit('user_balance_update', {
        userId,
        bettingWallet: Number(updatedUser?.walletBetting || 0),
        gamingWallet: Number(updatedUser?.walletGaming || 0),
      });
      
      logger.info(`Bet placed: ${result.user.username} bet ${amount} on ${betType}:${betValue} for round ${result.round.roundNumber}`);
      
      return result.bet;
    } catch (error) {
      logger.error('Failed to place bet:', error);
      throw error;
    }
  }

  async updateBetDistribution(roundId: string): Promise<void> {
    try {
      const bets = await this.prisma.bet.findMany({
        where: { roundId, status: BetStatus.PENDING },
      });

      const distribution = {
        numbers: {} as Record<string, { count: number; amount: number }>,
      };

      // Initialize numbers
      for (let i = 0; i <= 9; i++) {
        distribution.numbers[i.toString()] = { count: 0, amount: 0 };
      }

      bets.forEach(bet => {
        const betValue = JSON.parse(bet.betValue);
        
        switch (bet.betType) {
          case 'NUMBER':
            if (typeof betValue === 'number' && betValue >= 0 && betValue <= 9) {
              distribution.numbers[betValue.toString()].count++;
              distribution.numbers[betValue.toString()].amount += bet.amount;
            }
            break;
        }
      });

      // Cache the distribution
      try {
        await this.redis.set(`${CACHE_KEYS.BET_DISTRIBUTION}_${roundId}`, distribution, 300);
        logger.info('Bet distribution cached', { key: `${CACHE_KEYS.BET_DISTRIBUTION}_${roundId}` });
      } catch (cacheErr) {
        logger.error('Failed to cache bet distribution', { error: cacheErr });
      }
      
      this.emit('bet_distribution_updated', roundId, distribution);
    } catch (error) {
      logger.error(`Failed to update bet distribution for round ${roundId}:`, error);
    }
  }

  async processDailyCashback(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get users who lost money today
      const dailyLosers = await this.prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          type: 'BET_PLACED',
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: {
          amount: true,
        },
        having: {
          amount: {
            _sum: {
              lt: 0, // Net loss (bet_placed transactions are negative)
            },
          },
        },
      });

      for (const loser of dailyLosers) {
        const dailyLoss = Math.abs(loser._sum.amount || 0);
        const cashbackAmount = parseFloat((dailyLoss * 0.10).toFixed(2)); // Exactly 10% of daily losses

        if (cashbackAmount > 0) {
          // Find losing bets for this user today to map per-bet cashback
          const losingBets = await this.prisma.bet.findMany({
            where: {
              userId: loser.userId,
              status: 'LOST',
              placedAt: { gte: today, lt: tomorrow },
            },
            select: { id: true, amount: true },
          });
          const totalLosingAmount = losingBets.reduce((s, b) => s + (b.amount || 0), 0) || 1;
          const betCashbacks = losingBets.map((b) => ({
            betId: b.id,
            amount: Number(((cashbackAmount * (b.amount || 0)) / totalLosingAmount).toFixed(2)),
          }));

          // Add cashback as game credit
          await this.prisma.user.update({
            where: { id: loser.userId },
            data: {
              walletGaming: {
                increment: cashbackAmount,
              },
            },
          });

          // Create transaction record with per-bet mapping in description JSON
          await this.prisma.transaction.create({
            data: {
              userId: loser.userId,
              type: 'CASHBACK',
              amount: cashbackAmount,
              status: 'COMPLETED',
              description: JSON.stringify({
                note: `Daily cashback (${this.gameConfig.cashbackPercentage}% of daily loss)` ,
                betCashbacks,
              }),
            },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process daily cashback:', error);
    }
  }



  // Getters
  getCurrentRound(): GameRound | null {
    return this.currentRound;
  }

  getGameConfig(): any {
    return this.gameConfig;
  }

  // Schedule 9-day rolling cashback at 5:00 AM server time
  startRollingCashbackScheduler(): void {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(5, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next.getTime() - now.getTime();
      setTimeout(async () => {
        try {
          await this.processRollingCashback();
        } catch (e) {
          logger.error('Rolling cashback failed', e);
        } finally {
          scheduleNext();
        }
      }, delay);
    };
    scheduleNext();
  }

  private async processRollingCashback(): Promise<void> {
    // For each user, at 5 AM, credit 10% of loss for each of the past 9 days separately
    const prisma = this.prisma;
    const today = new Date(); today.setHours(0,0,0,0);

    const users = await prisma.user.findMany({ select: { id: true } });
    for (const u of users) {
      let totalCreditForToday = 0;
      for (let k = 1; k <= 9; k++) {
        const start = new Date(today); start.setDate(start.getDate() - k);
        const end = new Date(start); end.setDate(end.getDate() + 1);

        // Sum losses (BET_LOST) for that source day
        const agg = await prisma.transaction.aggregate({
          where: { userId: u.id, type: 'BET_LOST', createdAt: { gte: start, lt: end } },
          _sum: { amount: true },
        });
        const dayLoss = Math.abs(agg._sum.amount || 0);
        if (dayLoss <= 0) continue;

        const credit = Number((dayLoss * 0.10).toFixed(2));

        // Idempotency: ensure not already credited for this source day and offset (k)
        const marker = `roll_src:${start.toISOString().slice(0,10)};offset:${k}`;
        const exists = await prisma.transaction.findFirst({
          where: { userId: u.id, type: 'CASHBACK', description: { contains: marker } },
          select: { id: true },
        });
        if (exists) continue;

        totalCreditForToday += credit;
        await prisma.transaction.create({
          data: {
            userId: u.id,
            type: 'CASHBACK',
            amount: credit,
            status: 'COMPLETED',
            description: `Rolling cashback 10% for ${start.toISOString().slice(0,10)} (${marker})`,
          },
        });
      }

      if (totalCreditForToday > 0) {
        await prisma.user.update({ where: { id: u.id }, data: { walletGaming: { increment: totalCreditForToday } } });
      }
    }
  }

  isGameRunning(): boolean {
    return this.isRunning;
  }

  // Admin controls
  async emergencyStop(): Promise<void> {
    try {
      this.stop();
      
      // Cancel current round if exists
      if (this.currentRound) {
        await this.prisma.gameRound.update({
          where: { id: this.currentRound.id },
          data: { status: GameRoundStatus.CANCELLED },
        });

        // Refund all pending bets
        const pendingBets = await this.prisma.bet.findMany({
          where: { roundId: this.currentRound.id, status: BetStatus.PENDING },
        });

        for (const bet of pendingBets) {
          await this.prisma.bet.update({
            where: { id: bet.id },
            data: { status: BetStatus.REFUNDED },
          });

          await this.prisma.user.update({
            where: { id: bet.userId },
            data: { walletBetting: { increment: bet.amount } },
          });

          await this.prisma.transaction.create({
            data: {
              userId: bet.userId,
              type: 'BET_PLACED',
              amount: bet.amount,
              status: 'COMPLETED',
              description: `Refund for cancelled round ${this.currentRound.roundNumber}`,
            },
          });
        }
      }
      
      logger.warn('Emergency stop executed');
    } catch (error) {
      logger.error('Failed to execute emergency stop:', error);
      throw error;
    }
  }

  async updateGameConfig(newConfig: any): Promise<void> {
    try {
      // Update database
      await this.prisma.gameConfig.create({
        data: {
          ...newConfig,
          isActive: true,
        },
      });

      // Deactivate old configs
      await this.prisma.gameConfig.updateMany({
        where: { isActive: true, id: { not: newConfig.id } },
        data: { isActive: false },
      });

      // Update in-memory config
      this.gameConfig = newConfig;
      
      // Update cache
      await this.redis.set(CACHE_KEYS.GAME_CONFIG, newConfig, 300);
      
      logger.info('Game configuration updated');
    } catch (error) {
      logger.error('Failed to update game configuration:', error);
      throw error;
    }
  }

  // New phase management methods
  private async startSpinPreparationPhase(): Promise<void> {
    if (!this.currentRound) {
      logger.error('No current round for spin preparation phase');
      return;
    }

    try {
      // Get bet distribution and calculate winning number
      const betDistribution = await this.getBetDistributionForRound(this.currentRound.id);
      
      // Respect forced win if already set by admin via phaseManager
      let winningNumber = this.phaseManager.getWinningNumber();
      let wasForcedWinner = false;
      
      if (winningNumber === null) {
        // Check if there's a forced winner in the phase manager
        const forcedWin = (this.phaseManager as any).forcedWin;
        if (forcedWin && (!forcedWin.targetRound || this.phaseManager.getCurrentRoundNumber() === forcedWin.targetRound)) {
          winningNumber = forcedWin.number;
          wasForcedWinner = true;
          logger.warn(`FORCE WINNER APPLIED: Round ${this.phaseManager.getCurrentRoundNumber()} will have winning number ${winningNumber}`);
          // Clear the forced winner from memory
          (this.phaseManager as any).forcedWin = null;
          (this.phaseManager as any).wasForcedWinner = true;
        } else {
          winningNumber = determineLeastChosenNumber(betDistribution);
          (this.phaseManager as any).wasForcedWinner = false;
        }
      }
      
      // Store winning number and bet distribution in phase manager
      if (winningNumber !== null) {
        this.phaseManager.setWinningNumber(winningNumber);
      }
      this.phaseManager.setBetDistribution(betDistribution);


      // Update round status
      await this.prisma.gameRound.update({
        where: { id: this.currentRound.id },
        data: {
          status: GameRoundStatus.BETTING_CLOSED,
          bettingEndTime: new Date(),
        },
      });

      // For spin prep, also simulate payouts for all potential winners
      const simulatedPayouts: Record<number, number> = {};
      for (let n = 0; n <= 9; n++) simulatedPayouts[n] = 0;
      const pendingBets = await this.prisma.bet.findMany({ where: { roundId: this.currentRound.id, status: BetStatus.PENDING } });
      for (let n = 0; n <= 9; n++) {
        for (const bet of pendingBets) {
          const betValue = JSON.parse(bet.betValue);
          const p = calculatePayout(bet.betType.toLowerCase() as any, betValue, bet.amount, n);
          simulatedPayouts[n] += p;
        }
      }

      logger.info(`Spin preparation phase started - Winner calculated: ${winningNumber}`);
      logger.info('Exposure & simulated payouts (spin prep)', { exposures: betDistribution, simulatedPayouts });
    } catch (error) {
      logger.error('Error starting spin preparation phase:', error);
    }
  }

  private async startSpinningPhase(): Promise<void> {
    if (!this.currentRound) {
      logger.error('No current round for spinning phase');
      return;
    }

    try {
      const winningNumber = this.phaseManager.getWinningNumber();
      if (winningNumber === null) {
        throw new Error('Winning number not calculated');
      }

      // Update round status to spinning (but don't reveal winning number yet)
      await this.prisma.gameRound.update({
        where: { id: this.currentRound.id },
        data: {
          status: GameRoundStatus.SPINNING,
          spinStartTime: new Date(),
          // Don't set winningNumber yet - it will be revealed after spinning ends
        },
      });

      // Broadcast spinning started (without revealing winner)
      this.emit('spin_started', {
        roundId: this.currentRound.id,
        roundNumber: this.currentRound.roundNumber,
        status: 'SPINNING',
      });

      logger.info(`Spinning phase started - Winner will be revealed after spin ends`);
    } catch (error) {
      logger.error('Error starting spinning phase:', error);
    }
  }

  private async startResultPhase(): Promise<void> {
    if (!this.currentRound) {
      logger.error('No current round for result phase');
      return;
    }

    try {
      const winningNumber = this.phaseManager.getWinningNumber();
      if (winningNumber === null) {
        throw new Error('Winning number not available');
      }

      // Update round status and reveal winning number
      await this.prisma.gameRound.update({
        where: { id: this.currentRound.id },
        data: {
          status: GameRoundStatus.RESULT,
          resultTime: new Date(),
          winningNumber: winningNumber,
        },
      });

      // Broadcast winner reveal to all clients
      this.emit('round_winner', {
        roundId: this.currentRound.id,
        roundNumber: this.currentRound.roundNumber,
        winningNumber,
        winningColor: getNumberColor(winningNumber),
        isWinningOdd: isNumberOdd(winningNumber),
      });

      // Complete the round and process payouts
      await this.completeRound(this.currentRound);

      logger.info(`Result phase started - Winner revealed: ${winningNumber}`);
    } catch (error) {
      logger.error('Error starting result phase:', error);
    }
  }

  private async startTransitionPhase(): Promise<void> {
    if (!this.currentRound) {
      logger.error('No current round for transition phase');
      return;
    }

    try {
      // Update round status to completed
      await this.prisma.gameRound.update({
        where: { id: this.currentRound.id },
        data: {
          status: GameRoundStatus.COMPLETED,
        },
      });

      logger.info(`Transition phase started for round ${this.currentRound.roundNumber}`);
    } catch (error) {
      logger.error('Error starting transition phase:', error);
    }
  }

  private async getBetDistributionForRound(roundId: string): Promise<Record<string, number>> {
    const bets = await this.prisma.bet.findMany({
      where: { roundId, status: BetStatus.PENDING },
    });

    // Exposure per number 0-9
    const exposures: Record<string, number> = {};
    for (let i = 0; i <= 9; i++) exposures[i.toString()] = 0;

    let redTotal = 0, blackTotal = 0, oddTotal = 0, evenTotal = 0;

    for (const bet of bets) {
      if (bet.betType === 'NUMBER') {
        const betValue = JSON.parse(bet.betValue);
        if (typeof betValue === 'number' && betValue >= 0 && betValue <= 9) {
          exposures[betValue.toString()] += bet.amount;
        }
      } else if (bet.betType === 'ODD_EVEN') {
        try {
          const v = String(JSON.parse(bet.betValue) ?? '').toLowerCase();
          if (v === 'odd') oddTotal += bet.amount;
          if (v === 'even') evenTotal += bet.amount;
        } catch {}
      }
    }

    // Distribute color bets equally across their numbers
    for (let n = 0; n < 10; n++) {
      const color = getNumberColor(n);
      if (color === 'red') exposures[n.toString()] += redTotal / 5;
      if (color === 'black') exposures[n.toString()] += blackTotal / 5;
    }

    // Distribute odd/even bets equally across their numbers
    for (let n = 0; n < 10; n++) {
      if (isNumberOdd(n)) exposures[n.toString()] += oddTotal / 5;
      else exposures[n.toString()] += evenTotal / 5;
    }

    return exposures;
  }



  private async calculateWinningNumber(): Promise<number> {
    if (!this.currentRound) {
      throw new Error('No current round to calculate winning number');
    }

    // Get all bets for this round
    const bets = await this.prisma.bet.findMany({
      where: { 
        roundId: this.currentRound.id, 
        status: BetStatus.PENDING 
      },
    });

    // Calculate bet distribution by number
    const numberDistribution: Record<string, number> = {};
    for (let i = 0; i <= 9; i++) {
      numberDistribution[i.toString()] = 0;
    }

    bets.forEach(bet => {
      if (bet.betType === 'NUMBER') {
        const betValue = JSON.parse(bet.betValue);
        if (typeof betValue === 'number' && betValue >= 0 && betValue <= 9) {
          numberDistribution[betValue.toString()] += bet.amount;
        }
      }
    });

    // Determine winning number (lowest bet amount)
    const winningNumber = determineLeastChosenNumber(numberDistribution);
    logger.info(`Winning number calculated: ${winningNumber}`, { numberDistribution });
    
    return winningNumber;
  }

  // Getter methods for phase manager
  getCurrentPhase(): GamePhase {
    return this.phaseManager.getCurrentPhase();
  }

  getTimeRemaining(): number {
    return this.phaseManager.getTimeRemaining();
  }

  getCurrentRoundNumber(): number {
    return this.phaseManager.getCurrentRoundNumber();
  }

  getWinningNumber(): number | null {
    return this.phaseManager.getWinningNumber();
  }

  getBetDistribution(): Record<string, number> {
    return this.phaseManager.getBetDistribution();
  }

}