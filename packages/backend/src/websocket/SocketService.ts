import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { GameEngine, GameEngineEvents } from '../services/GameEngine';
import { LiveActivityService } from '../services/LiveActivityService';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS, SOCKET_ROOMS, GamePhase } from '@win5x/common';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

export class SocketService {
  private static instance: SocketService | null = null;
  private io: SocketIOServer;
  private gameEngine: GameEngine;
  private prisma: PrismaClient;
  private liveActivityService: LiveActivityService;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private connectedAdmins: Map<string, Set<string>> = new Map(); // adminId -> socketIds

  private constructor(io: SocketIOServer, gameEngine: GameEngine, prisma: PrismaClient, liveActivityService: LiveActivityService) {
    this.io = io;
    this.gameEngine = gameEngine;
    this.prisma = prisma;
    this.liveActivityService = liveActivityService;
  }

  static getInstance(): SocketService | null {
    return SocketService.instance;
  }

  static createInstance(io: SocketIOServer, gameEngine: GameEngine, prisma: PrismaClient, liveActivityService: LiveActivityService): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(io, gameEngine, prisma, liveActivityService);
    }
    return SocketService.instance;
  }

  initialize(): void {
    // Set up authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Handle connections
    this.io.on('connection', this.handleConnection.bind(this));

    // Listen to game engine events
    this.setupGameEngineListeners();

    logger.info('Socket service initialized');
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        logger.warn('Socket auth failed: missing token', { socketId: socket.id });
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.type === 'admin') {
        // Admin authentication
        const admin = await this.prisma.admin.findUnique({
          where: { id: decoded.userId },
        });

        if (!admin || !admin.isActive) {
          logger.warn('Socket admin auth failed', { socketId: socket.id, userId: decoded.userId });
          return next(new Error('Invalid admin credentials'));
        }

        socket.userId = admin.id;
        socket.username = admin.username;
        socket.isAdmin = true;
        socket.permissions = decoded.permissions || [];
      } else {
        // User authentication
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user || !user.isActive) {
          logger.warn('Socket user auth failed', { socketId: socket.id, userId: decoded.userId });
          return next(new Error('Invalid user credentials'));
        }

        socket.userId = user.id;
        socket.username = user.username;
        socket.isAdmin = false;
      }

      logger.info('Socket auth success', { socketId: socket.id, username: socket.username, isAdmin: socket.isAdmin });
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    logger.info(`User connected: ${socket.username} (${socket.userId}) - Socket ID: ${socket.id}`);

    // Track connected users/admins
    if (socket.isAdmin) {
      if (!this.connectedAdmins.has(socket.userId!)) {
        this.connectedAdmins.set(socket.userId!, new Set());
      }
      this.connectedAdmins.get(socket.userId!)!.add(socket.id);
      
      // Join admin room
      socket.join(SOCKET_ROOMS.ADMIN);
    } else {
      if (!this.connectedUsers.has(socket.userId!)) {
        this.connectedUsers.set(socket.userId!, new Set());
      }
      this.connectedUsers.get(socket.userId!)!.add(socket.id);
      
      // Join user-specific room
      socket.join(`${SOCKET_ROOMS.USER_PREFIX}${socket.userId}`);
      
      // Register user with live activity service
      this.liveActivityService.userJoined(socket.userId!, socket.username!);
    }

    // Join game room
    socket.join(SOCKET_ROOMS.GAME);

    // Send current game state
    this.sendCurrentGameState(socket);

    // Handle socket events
    socket.on(SOCKET_EVENTS.PLACE_BET, this.handlePlaceBet.bind(this, socket));
    socket.on(SOCKET_EVENTS.ADMIN_ACTION, this.handleAdminAction.bind(this, socket));
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));

    // Broadcast counts
    this.io.to(SOCKET_ROOMS.ADMIN).emit('admin_connected', { count: this.getConnectedAdminsCount() });
    this.io.to(SOCKET_ROOMS.ADMIN).emit('user_connected', { count: this.getConnectedUsersCount() });

    // Send connection confirmation
    socket.emit('connected', {
      userId: socket.userId,
      username: socket.username,
      isAdmin: socket.isAdmin,
      timestamp: new Date().toISOString(),
    });
  }

  private async sendCurrentGameState(socket: AuthenticatedSocket): Promise<void> {
    try {
      const currentRound = this.gameEngine.getCurrentRound();
      
      if (currentRound) {
        // Send current round
        socket.emit(SOCKET_EVENTS.ROUND_UPDATE, currentRound);

        // Send bet distribution
        const distribution = await this.getBetDistribution(currentRound.id);
        if (distribution) {
          socket.emit(SOCKET_EVENTS.BET_DISTRIBUTION, {
            roundId: currentRound.id,
            ...distribution,
          });
        }

        // Send timer update
        const timeRemaining = this.calculateTimeRemaining(currentRound);
        if (timeRemaining) {
          socket.emit(SOCKET_EVENTS.TIMER_UPDATE, timeRemaining);
        }
      }

      // Send user balance if not admin
      if (!socket.isAdmin) {
        const user = await this.prisma.user.findUnique({
          where: { id: socket.userId! },
          select: { walletBetting: true, walletGaming: true },
        });

        if (user) {
          socket.emit(SOCKET_EVENTS.USER_BALANCE_UPDATE, {
            walletBetting: Number(user.walletBetting),
            walletGaming: Number(user.walletGaming),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send current game state:', error);
    }
  }

  private async handlePlaceBet(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (socket.isAdmin) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Admins cannot place bets',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { roundId, betType, betValue, amount, useGamingWallet = false } = data;

      // Validate input
      if (!roundId || !betType || betValue === undefined || !amount) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Invalid bet data',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      // Place bet through game engine
      const bet = await this.gameEngine.placeBet(
        socket.userId!,
        roundId,
        betType,
        betValue,
        amount,
        useGamingWallet
      );

      // Register bet with live activity service
      this.liveActivityService.betPlaced(socket.userId!, socket.username!, betType, betValue, amount);

      // Send confirmation to user
      socket.emit('bet_placed', bet);

      // Update user balance
      const user = await this.prisma.user.findUnique({
        where: { id: socket.userId! },
        select: { walletBetting: true, walletGaming: true },
      });

      if (user) {
        socket.emit(SOCKET_EVENTS.USER_BALANCE_UPDATE, {
          walletBetting: Number(user.walletBetting),
          walletGaming: Number(user.walletGaming),
        });
      }

      logger.info(`Bet placed via socket: ${socket.username} bet ${amount} on ${betType}:${betValue}`);
    } catch (error) {
      logger.error('Failed to handle place bet:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to place bet',
        code: 'BET_ERROR',
      });
    }
  }

  private async handleAdminAction(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      if (!socket.isAdmin) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Admin privileges required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { action, data: actionData } = data;

      switch (action) {
        case 'emergency_stop':
          if (!socket.permissions?.includes('EMERGENCY_CONTROLS')) {
            socket.emit(SOCKET_EVENTS.ERROR, {
              message: 'Insufficient permissions',
              code: 'FORBIDDEN',
            });
            return;
          }
          
          await this.gameEngine.emergencyStop();
          
          // Notify all connected clients
          this.io.to(SOCKET_ROOMS.GAME).emit('game_stopped', {
            reason: 'Emergency stop by admin',
            admin: socket.username,
            timestamp: new Date().toISOString(),
          });
          break;

        case 'update_config':
          if (!socket.permissions?.includes('MANAGE_TIMERS')) {
            socket.emit(SOCKET_EVENTS.ERROR, {
              message: 'Insufficient permissions',
              code: 'FORBIDDEN',
            });
            return;
          }
          
          await this.gameEngine.updateGameConfig(actionData);
          
          // Notify admins
          this.io.to(SOCKET_ROOMS.ADMIN).emit(SOCKET_EVENTS.ADMIN_NOTIFICATION, {
            type: 'system_alert',
            message: `Game configuration updated by ${socket.username}`,
            timestamp: new Date(),
          });
          break;

        default:
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: 'Unknown admin action',
            code: 'INVALID_ACTION',
          });
      }
    } catch (error) {
      logger.error('Failed to handle admin action:', error);
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: error instanceof Error ? error.message : 'Admin action failed',
        code: 'ADMIN_ACTION_ERROR',
      });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    logger.info(`User disconnected: ${socket.username} (${socket.userId}) - Socket ID: ${socket.id}`);

    // Remove from tracking
    if (socket.isAdmin) {
      const adminSockets = this.connectedAdmins.get(socket.userId!);
      if (adminSockets) {
        adminSockets.delete(socket.id);
        if (adminSockets.size === 0) {
          this.connectedAdmins.delete(socket.userId!);
        }
      }
    } else {
      const userSockets = this.connectedUsers.get(socket.userId!);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(socket.userId!);
          // Register user leaving with live activity service
          this.liveActivityService.userLeft(socket.userId!, socket.username!);
        }
      }
    }

    // Broadcast updated counts
    this.io.to(SOCKET_ROOMS.ADMIN).emit('admin_connected', { count: this.getConnectedAdminsCount() });
    this.io.to(SOCKET_ROOMS.ADMIN).emit('user_connected', { count: this.getConnectedUsersCount() });
  }

  private setupGameEngineListeners(): void {
    this.gameEngine.on('round_started', (round) => {
      // Convert status to lowercase for frontend consistency
      const normalizedRound = { ...round, status: round.status?.toLowerCase() };
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.ROUND_UPDATE, normalizedRound);
      logger.info(`Broadcasted round started: ${round.roundNumber}`);
    });

    this.gameEngine.on('betting_closed', (round) => {
      // Convert status to lowercase for frontend consistency
      const normalizedRound = { ...round, status: 'spin_preparation' };
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.ROUND_UPDATE, normalizedRound);
      logger.info(`Broadcasted betting closed: ${round.roundNumber}`);
    });

    this.gameEngine.on('spin_started', (round) => {
      // Ensure a consistent payload shape with `id` for frontend
      // GameEngine emits { roundId, roundNumber, status } for spin_started
      const payload: any = {
        id: (round as any).roundId || (round as any).id,
        roundId: (round as any).roundId || (round as any).id,
        roundNumber: (round as any).roundNumber,
        status: ((round as any).status || 'SPINNING').toLowerCase(),
      };
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.ROUND_UPDATE, payload);
      logger.info(`Broadcasted spin started: ${payload.roundNumber}`);
    });

    this.gameEngine.on('round_completed', (round, winningNumber) => {
      // Convert status to lowercase for frontend consistency
      const normalizedRound = { ...round, status: round.status?.toLowerCase() };
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.ROUND_UPDATE, normalizedRound);
      this.io.to(SOCKET_ROOMS.ADMIN).emit('round_completed', normalizedRound, winningNumber);
    });

    this.gameEngine.on('round_winner', (winnerData) => {
      // Broadcast winner to all game clients immediately
      this.io.to(SOCKET_ROOMS.GAME).emit('round_winner', winnerData);
      this.io.to(SOCKET_ROOMS.ADMIN).emit('round_winner', winnerData);
    });

    this.gameEngine.on('bet_distribution_updated', (roundId, distribution) => {
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.BET_DISTRIBUTION, {
        roundId,
        ...distribution,
      });
      logger.info('Broadcasted bet distribution', { roundId });
    });

    this.gameEngine.on('timer_updated', (roundId, phase, timeRemaining) => {
      // Convert phase to lowercase for frontend consistency
      const normalizedPhase = phase?.toLowerCase();
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.TIMER_UPDATE, {
        roundId,
        phase: normalizedPhase,
        timeRemaining,
      });
    });

    // Handle phase updates from GamePhaseManager
    this.gameEngine.on('phase_update', (phaseUpdate) => {
      // Convert phase to lowercase for frontend consistency
      const normalizedPhase = phaseUpdate.phase?.toLowerCase();
      this.io.to(SOCKET_ROOMS.GAME).emit(SOCKET_EVENTS.PHASE_UPDATE, {
        phase: normalizedPhase,
        timeRemaining: phaseUpdate.timeRemaining,
        roundNumber: phaseUpdate.roundNumber,
        phaseStartTime: phaseUpdate.phaseStartTime,
        phaseEndTime: phaseUpdate.phaseEndTime,
      });
    });

    // Listen to user balance updates from GameEngine
    this.gameEngine.on('user_balance_update', (balanceUpdate) => {
      // Send balance update to specific user
      this.io.to(`${SOCKET_ROOMS.USER_PREFIX}${balanceUpdate.userId}`).emit(SOCKET_EVENTS.USER_BALANCE_UPDATE, {
        bettingWallet: balanceUpdate.bettingWallet,
        gamingWallet: balanceUpdate.gamingWallet,
      });
      logger.info(`Balance update sent to user ${balanceUpdate.userId}: Betting=${balanceUpdate.bettingWallet}, Gaming=${balanceUpdate.gamingWallet}`);
    });

    // Setup live activity listeners
    this.liveActivityService.on('activity_update', (event) => {
      this.io.to(SOCKET_ROOMS.GAME).emit('live_activity', event);
    });

    this.liveActivityService.on('stats_update', (stats) => {
      this.io.to(SOCKET_ROOMS.GAME).emit('live_stats', stats);
    });
  }

  private async getBetDistribution(roundId: string): Promise<any> {
    try {
      // Try to get from Redis first
      const cached = await this.gameEngine['redis'].get(`bet_distribution_${roundId}`);
      if (cached) {
        return cached;
      }

      // Calculate from database
      const bets = await this.prisma.bet.findMany({
        where: { roundId, status: 'PENDING' },
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

      return distribution;
    } catch (error) {
      logger.error('Failed to get bet distribution:', error);
      return null;
    }
  }

  private calculateTimeRemaining(round: any): any {
    const now = new Date();
    
    switch (round.status) {
      case 'BETTING':
        if (round.bettingEndTime) {
          const timeRemaining = Math.max(0, Math.ceil((new Date(round.bettingEndTime).getTime() - now.getTime()) / 1000));
          return {
            roundId: round.id,
            phase: 'betting',
            timeRemaining,
          };
        }
        break;
      
      case 'SPINNING':
        if (round.spinStartTime) {
          const spinDuration = this.gameEngine.getGameConfig().spinDuration;
          const elapsed = Math.ceil((now.getTime() - new Date(round.spinStartTime).getTime()) / 1000);
          const timeRemaining = Math.max(0, spinDuration - elapsed);
          return {
            roundId: round.id,
            phase: 'spinning',
            timeRemaining,
          };
        }
        break;
      
      case 'COMPLETED':
        if (round.resultTime) {
          const resultDuration = this.gameEngine.getGameConfig().resultDuration;
          const elapsed = Math.ceil((now.getTime() - new Date(round.resultTime).getTime()) / 1000);
          const timeRemaining = Math.max(0, resultDuration - elapsed);
          return {
            roundId: round.id,
            phase: 'result',
            timeRemaining,
          };
        }
        break;
    }
    
    return null;
  }

  // Public methods for external use
  async notifyUser(userId: string, event: string, data: any): Promise<void> {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  async notifyAdmin(adminId: string, event: string, data: any): Promise<void> {
    const socketIds = this.connectedAdmins.get(adminId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  async notifyAdmins(event: string, data: any): Promise<void> {
    this.io.to(SOCKET_ROOMS.ADMIN).emit(event, data);
  }

  async broadcastAnalyticsUpdate(): Promise<void> {
    try {
      // Get current analytics data
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        activeUsers,
        totalRounds,
        totalBets,
        totalRevenue,
        totalPayout,
        pendingWithdrawals,
        pendingDeposits,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.gameRound.count({
          where: { 
            status: 'COMPLETED',
            resultTime: { gte: startOfDay },
          },
        }),
        this.prisma.bet.count({
          where: { placedAt: { gte: startOfDay } },
        }),
        this.prisma.bet.aggregate({
          where: { placedAt: { gte: startOfDay } },
          _sum: { amount: true },
        }),
        this.prisma.bet.aggregate({
          where: { 
            status: 'WON',
            settledAt: { gte: startOfDay },
          },
          _sum: { actualPayout: true },
        }),
        this.prisma.transaction.count({
          where: {
            type: 'WITHDRAWAL',
            status: 'PENDING',
          },
        }),
        this.prisma.transaction.count({
          where: {
            type: 'DEPOSIT',
            status: 'PENDING',
          },
        }),
      ]);

      const revenue = totalRevenue._sum.amount || 0;
      const payout = totalPayout._sum.actualPayout || 0;
      const houseProfitLoss = revenue - payout;

      const analytics = {
        summary: {
          totalUsers,
          activeUsers,
          totalRounds,
          totalBets,
          revenue,
          payout,
          houseProfitLoss,
          houseEdge: revenue > 0 ? ((houseProfitLoss / revenue) * 100) : 0,
        },
        pending: {
          withdrawals: pendingWithdrawals,
          deposits: pendingDeposits,
        },
        generatedAt: new Date().toISOString(),
      };

      // Broadcast to all admins
      this.io.to(SOCKET_ROOMS.ADMIN).emit('analytics_update', analytics);
    } catch (error) {
      logger.error('Failed to broadcast analytics update:', error);
    }
  }

  async notifyAllAdmins(event: string, data: any): Promise<void> {
    this.io.to(SOCKET_ROOMS.ADMIN).emit(event, data);
  }

  async notifyAllUsers(event: string, data: any): Promise<void> {
    this.io.to(SOCKET_ROOMS.GAME).emit(event, data);
  }

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getConnectedAdminsCount(): number {
    return this.connectedAdmins.size;
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  isAdminConnected(adminId: string): boolean {
    return this.connectedAdmins.has(adminId);
  }
}