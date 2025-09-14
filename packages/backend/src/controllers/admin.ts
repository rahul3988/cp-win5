import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireAdmin, 
  requirePermission, 
  validateUserStatus, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { 
  gameConfigSchema,
  adminActionSchema,
  userQuerySchema,
  betHistorySchema,
  transactionHistorySchema,
  paginationSchema,
  ValidationError,
  AuthorizationError,
  createSuccessResponse 
} from '@win5x/common';
import { ConfigService } from '../services/ConfigService';
import { gameEngine } from '../server';
import { logger } from '../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();
const configService = new ConfigService(prisma);

// Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(validateUserStatus);

// Get dashboard analytics
router.get('/analytics', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { period = 'daily' } = req.query;

  let dateFilter: any = {};
  const now = new Date();
  
  switch (period) {
    case 'daily':
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfDay };
      break;
    
    case 'weekly':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfWeek };
      break;
    
    case 'monthly':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { gte: startOfMonth };
      break;
  }

  const [
    totalUsers,
    activeUsers,
    totalRounds,
    totalBets,
    totalRevenue,
    totalPayout,
    pendingWithdrawals,
    pendingDeposits,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.gameRound.count({
      where: { 
        status: 'COMPLETED',
        resultTime: dateFilter,
      },
    }),
    prisma.bet.count({
      where: { placedAt: dateFilter },
    }),
    prisma.bet.aggregate({
      where: { placedAt: dateFilter },
      _sum: { amount: true },
    }),
    prisma.bet.aggregate({
      where: { 
        status: 'WON',
        settledAt: dateFilter,
      },
      _sum: { actualPayout: true },
    }),
    prisma.transaction.count({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
    }),
    prisma.transaction.count({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING',
      },
    }),
    prisma.gameRound.findMany({
      where: {
        status: 'COMPLETED',
        resultTime: dateFilter,
      },
      orderBy: { resultTime: 'desc' },
      take: 10,
      select: {
        roundNumber: true,
        winningNumber: true,
        totalBetAmount: true,
        totalPayout: true,
        houseProfitLoss: true,
        resultTime: true,
        _count: { select: { bets: true } },
      },
    }),
  ]);

  const revenue = totalRevenue._sum.amount || 0;
  const payout = totalPayout._sum.actualPayout || 0;
  const houseProfitLoss = revenue - payout;

  const analytics = {
    period,
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
    recentActivity,
    generatedAt: new Date().toISOString(),
  };

  res.json(createSuccessResponse(analytics));
}));

// Get all users
router.get('/users', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = userQuerySchema.parse(req.query);
  const { page, pageSize, search, isActive, sortBy, sortOrder } = query;

  const where: any = {};
  
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { id: search },
    ];
  }
  
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        walletBetting: true,
        walletGaming: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bets: true,
            transactions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: users,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get user details
router.get('/users/:userId', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bets: {
        orderBy: { placedAt: 'desc' },
        take: 20,
        include: {
          round: {
            select: {
              roundNumber: true,
              winningNumber: true,
            },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: {
        select: {
          bets: true,
          transactions: true,
        },
      },
    },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  // Calculate user statistics
  const [totalWagered, totalWon, winningBets] = await Promise.all([
    prisma.bet.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.bet.aggregate({
      where: { userId, status: 'WON' },
      _sum: { actualPayout: true },
    }),
    prisma.bet.count({
      where: { userId, status: 'WON' },
    }),
  ]);

  const stats = {
    totalWagered: totalWagered._sum.amount || 0,
    totalWon: totalWon._sum.actualPayout || 0,
    winningBets,
    totalBets: user._count.bets,
    winRate: user._count.bets > 0 ? (winningBets / user._count.bets) * 100 : 0,
  };

  res.json(createSuccessResponse({
    ...user,
    stats,
  }));
}));

// Update user status
router.put('/users/:userId/status', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new ValidationError('isActive must be a boolean');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'UPDATE_USER_STATUS',
      target: 'USER',
      targetId: userId,
      oldValue: JSON.stringify({ isActive: !isActive }),
      newValue: JSON.stringify({ isActive }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`User status updated by admin: ${req.user!.username} ${isActive ? 'activated' : 'deactivated'} user ${updatedUser.username}`);

  res.json(createSuccessResponse(updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
}));

// Set temporary password and force reset on next login
router.post('/users/:userId/set-temp-password', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { tempPassword } = req.body as { tempPassword?: string };

  if (!tempPassword || typeof tempPassword !== 'string' || tempPassword.length < 6) {
    throw new ValidationError('A valid temporary password (min 6 chars) is required');
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashed = await require('bcryptjs').hash(tempPassword, saltRounds);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, mustChangePassword: true },
    select: { id: true, username: true, email: true, updatedAt: true },
  });

  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'SET_TEMP_PASSWORD',
      target: 'USER',
      targetId: userId,
      newValue: JSON.stringify({ mustChangePassword: true }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.warn(`Admin ${req.user!.username} set a temporary password for user ${updated.username}`);

  res.json(createSuccessResponse(updated, 'Temporary password set; user must change password on next login'));
}));

// Adjust user balance
router.post('/users/:userId/balance', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  if (!amount || typeof amount !== 'number') {
    throw new ValidationError('Valid amount is required');
  }

  if (!reason || typeof reason !== 'string') {
    throw new ValidationError('Reason is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, walletBetting: true, walletGaming: true },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  const oldBalance = Number(user.walletBetting);

  // Update user balance
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      walletBetting: { increment: amount },
    },
    select: {
      id: true,
      username: true,
      walletBetting: true,
      walletGaming: true,
    },
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId,
      type: 'BONUS_CREDIT',
      amount,
      wallet: 'BETTING',
      status: 'COMPLETED',
      description: reason,
      approvedBy: req.user!.id,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'ADJUST_USER_BALANCE',
      target: 'USER',
      targetId: userId,
      oldValue: JSON.stringify({ balance: oldBalance }),
      newValue: JSON.stringify({ walletBetting: updatedUser.walletBetting, walletGaming: updatedUser.walletGaming }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  // Send real-time updates
  try {
    const { SocketService } = await import('../websocket/SocketService');
    const socketService = SocketService.getInstance();
    if (socketService) {
      // Notify user of balance update
      await socketService.notifyUser(userId, 'user_balance_update', {
        bettingWallet: Number(updatedUser.walletBetting || 0),
        gamingWallet: Number(updatedUser.walletGaming || 0),
      });

      // Notify admins of user balance change
      await socketService.notifyAdmins('admin_notification', {
        type: 'balance_adjustment',
        message: `User ${user.username} balance adjusted by ₹${amount}`,
        data: {
          userId,
          username: user.username,
          amount,
          reason,
          newBalance: updatedUser.walletBetting,
        },
      });

      // Broadcast updated analytics to admins
      await socketService.broadcastAnalyticsUpdate();
    }
  } catch (e) {
    logger.error('Failed to send real-time updates', e);
  }

  logger.info(`Balance adjusted by admin: ${req.user!.username} adjusted ${user.username}'s balance by ${amount} (${reason})`);

  res.json(createSuccessResponse(updatedUser, 'Balance adjusted successfully'));
}));

// Get all transactions
router.get('/transactions', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = transactionHistorySchema.parse(req.query);
  const { page, pageSize, userId, type, status, startDate, endDate } = query;

  const where: any = {};
  
  if (userId) {
    where.userId = userId;
  }
  
  if (type) {
    where.type = type.toUpperCase();
  }
  
  if (status) {
    where.status = status.toUpperCase();
  }
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { username: true, email: true },
        },
        approver: {
          select: { username: true },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: transactions,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Approve/reject transaction
router.put('/transactions/:transactionId', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { transactionId } = req.params;
  const { status, reason } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ValidationError('Status must be APPROVED or REJECTED');
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true },
  });

  if (!transaction) {
    throw new ValidationError('Transaction not found');
  }

  if (transaction.status !== 'PENDING') {
    throw new ValidationError('Transaction is not pending');
  }

  const oldStatus = transaction.status;

  // Update transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status,
      approvedBy: req.user!.id,
      description: reason ? `${transaction.description} - ${reason}` : transaction.description,
    },
    include: {
      user: { select: { username: true } },
      approver: { select: { username: true } },
    },
  });

  // Handle balance adjustments
  if (status === 'APPROVED') {
    if (transaction.type === 'DEPOSIT') {
      // Add deposit amount to user balance
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { walletBetting: { increment: transaction.amount } },
      });
    } else if (transaction.type === 'WITHDRAWAL') {
      // Deduct withdrawal amount from user balance (amount is already negative)
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { walletBetting: { increment: transaction.amount } },
      });
    }
  } else if (status === 'REJECTED' && transaction.type === 'WITHDRAWAL') {
    // Refund withdrawal amount back to user balance
    await prisma.user.update({
      where: { id: transaction.userId },
      data: { walletBetting: { increment: Math.abs(transaction.amount) } },
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'APPROVE_TRANSACTION',
      target: 'TRANSACTION',
      targetId: transactionId,
      oldValue: JSON.stringify({ status: oldStatus }),
      newValue: JSON.stringify({ status }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`Transaction ${status.toLowerCase()} by admin: ${req.user!.username} ${status.toLowerCase()} ${transaction.type} of ${transaction.amount} for ${transaction.user.username}`);

  res.json(createSuccessResponse(updatedTransaction, `Transaction ${status.toLowerCase()} successfully`));
}));

// Get all bets
router.get('/bets', requirePermission('MANAGE_BETS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = betHistorySchema.parse(req.query);
  const { page, pageSize, userId, roundId, betType, status, startDate, endDate } = query;

  const where: any = {};
  
  if (userId) {
    where.userId = userId;
  }
  
  if (roundId) {
    where.roundId = roundId;
  }
  
  if (betType) {
    where.betType = betType.toUpperCase();
  }
  
  if (status) {
    where.status = status.toUpperCase();
  }
  
  if (startDate || endDate) {
    where.placedAt = {};
    if (startDate) {
      where.placedAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.placedAt.lte = new Date(endDate);
    }
  }

  const [bets, total] = await Promise.all([
    prisma.bet.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { username: true, email: true },
        },
        round: {
          select: {
            roundNumber: true,
            winningNumber: true,
            winningColor: true,
            isWinningOdd: true,
            status: true,
          },
        },
      },
    }),
    prisma.bet.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: bets,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get all rounds
router.get('/rounds', requirePermission('MANAGE_BETS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [rounds, total] = await Promise.all([
    prisma.gameRound.findMany({
      orderBy: { roundNumber: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { bets: true },
        },
      },
    }),
    prisma.gameRound.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: rounds,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get game configuration
router.get('/game-config', requirePermission('MANAGE_TIMERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = gameEngine?.getGameConfig();
  
  if (!config) {
    throw new ValidationError('Game configuration not available');
  }

  res.json(createSuccessResponse(config));
}));

// Update game configuration
router.put('/game-config', requirePermission('MANAGE_TIMERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = gameConfigSchema.partial().parse(req.body);

  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  const oldConfig = gameEngine.getGameConfig();

  // If request includes force winning number, set one-time override
  if (typeof (req.body as any).forceWinningNumber === 'number') {
    const n = Number((req.body as any).forceWinningNumber);
    const target = (req.body as any).targetRoundNumber ? Number((req.body as any).targetRoundNumber) : undefined;
    (gameEngine as any).phaseManager.forceNextWinningNumber(n, target);
  }

  // Update configuration timers if provided
  if (Object.keys(validatedData).length > 0) {
    await gameEngine.updateGameConfig(validatedData as any);
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'UPDATE_GAME_CONFIG',
      target: 'GAME_CONFIG',
      oldValue: JSON.stringify(oldConfig),
      newValue: JSON.stringify(validatedData),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`Game configuration updated by admin: ${req.user!.username}`);

  res.json(createSuccessResponse({ ok: true }, 'Game configuration updated successfully'));
}));

// Set force winner
router.post('/force-winner', requirePermission('EMERGENCY_CONTROLS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { number, targetRoundNumber } = req.body;

  if (typeof number !== 'number' || number < 0 || number > 9) {
    throw new ValidationError('Force winner number must be between 0 and 9');
  }

  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  // Set force winner in game engine
  (gameEngine as any).phaseManager.forceNextWinningNumber(number, targetRoundNumber);


  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'SET_FORCE_WINNER',
      target: 'GAME_CONFIG',
      oldValue: JSON.stringify({}),
      newValue: JSON.stringify({ forceWinner: number, targetRoundNumber }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.warn(`Force winner set to ${number} by admin: ${req.user!.username}${targetRoundNumber ? ` for round ${targetRoundNumber}` : ''}`);

  res.json(createSuccessResponse({ 
    forceWinner: number, 
    targetRoundNumber,
    message: `Force winner set to ${number}${targetRoundNumber ? ` for round ${targetRoundNumber}` : ' for next round'}`
  }));
}));

// Clear force winner
router.post('/force-winner/clear', requirePermission('EMERGENCY_CONTROLS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  // Clear force winner in game engine
  (gameEngine as any).phaseManager.forcedWin = null;


  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'CLEAR_FORCE_WINNER',
      target: 'GAME_CONFIG',
      oldValue: JSON.stringify({}),
      newValue: JSON.stringify({ forceWinner: null }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`Force winner cleared by admin: ${req.user!.username}`);

  res.json(createSuccessResponse({ 
    forceWinner: null,
    message: 'Force winner cleared successfully'
  }));
}));

// Get current force winner status
router.get('/force-winner', requirePermission('EMERGENCY_CONTROLS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  const phaseManager = (gameEngine as any).phaseManager;
  
  res.json(createSuccessResponse({
    forceWinner: null,
    currentRound: phaseManager.getCurrentRoundNumber(),
    currentPhase: phaseManager.getCurrentPhase(),
    isForced: phaseManager.forcedWin !== null
  }));
}));

// Emergency stop
router.post('/emergency-stop', requirePermission('EMERGENCY_CONTROLS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { reason } = req.body;

  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  await gameEngine.emergencyStop();

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'EMERGENCY_STOP',
      target: 'GAME_ENGINE',
      newValue: JSON.stringify({ reason: reason || 'Emergency stop executed' }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.warn(`Emergency stop executed by admin: ${req.user!.username} - ${reason || 'No reason provided'}`);

  res.json(createSuccessResponse(null, 'Emergency stop executed successfully'));
}));

// Get audit logs
router.get('/audit-logs', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: {
          select: { username: true, email: true },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: logs,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Support requests (from users) - stored in notifications table
router.get('/support-requests', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { type: 'support_request' },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { username: true, email: true } } } as any,
    }) as any,
    prisma.notification.count({ where: { type: 'support_request' } }),
  ]);

  res.json(createSuccessResponse({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
}));

// Feedback submissions (from users)
router.get('/feedbacks', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { type: 'feedback' },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { username: true, email: true } } } as any,
    }) as any,
    prisma.notification.count({ where: { type: 'feedback' } }),
  ]);

  res.json(createSuccessResponse({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
}));

// Respond to a notification (feedback/support) by sending a reply notification to the user
router.post('/notifications/:id/respond', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { message } = req.body as { message?: string };
  if (!message || message.trim().length < 2) {
    throw new ValidationError('Response message required');
  }
  const original: any = await prisma.notification.findUnique({ where: { id } });
  if (!original) {
    throw new ValidationError('Original notification not found');
  }
  const reply = await prisma.notification.create({
    data: {
      userId: original.userId,
      type: 'admin_response',
      title: `Response to ${original.type}`,
      message: message.trim(),
      data: JSON.stringify({ originalId: id }),
    } as any,
  });
  res.status(201).json(createSuccessResponse(reply, 'Response sent'));
}));

// Admin chat endpoints removed

// Admin notifications feed
router.get('/notifications', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const items = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { username: true } } } as any,
  } as any);
  res.json(createSuccessResponse(items));
}));

router.put('/notifications/:id/read', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const note = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  res.json(createSuccessResponse(note));
}));

// Get system status
router.get('/system-status', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const status = {
    gameEngine: {
      isRunning: gameEngine?.isGameRunning() || false,
      currentRound: gameEngine?.getCurrentRound()?.roundNumber || null,
    },
    database: {
      connected: true, // If we reach here, DB is connected
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  res.json(createSuccessResponse(status));
}));

// Admin config endpoints (referral percentages, attendance amount)
router.get('/config', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const cfg = await configService.getConfig();
  res.json(createSuccessResponse(cfg));
}));

router.put('/config', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { referralLevel1Pct, referralLevel2Pct, referralLevel3Pct, attendanceDay7Amt, depositBonusPct, attendanceTiers } = req.body || {};
  const updated = await configService.updateConfig({ referralLevel1Pct, referralLevel2Pct, referralLevel3Pct, attendanceDay7Amt, depositBonusPct, attendanceTiers });
  res.json(createSuccessResponse(updated, 'Config updated'));
}));

export { router as adminRoutes };

// Promotions CRUD
router.get('/promotions', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = 1, pageSize = 50 } = req.query as any;
  const [items, total] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: 'desc' }, skip: (Number(page)-1)*Number(pageSize), take: Number(pageSize) }),
    prisma.promotion.count(),
  ]);
  res.json(createSuccessResponse({ items, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total/Number(pageSize)) }));
}));

router.post('/promotions', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { title, content, imageUrl, isActive } = req.body as { title?: string; content?: string; imageUrl?: string; isActive?: boolean };
  if (!title || !content) throw new ValidationError('Title and content are required');
  const created = await prisma.promotion.create({ data: { title, content, imageUrl: imageUrl || null, isActive: isActive ?? true } });
  res.status(201).json(createSuccessResponse(created, 'Promotion created'));
}));

router.put('/promotions/:id', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { title, content, imageUrl, isActive } = req.body as { title?: string; content?: string; imageUrl?: string; isActive?: boolean };
  const updated = await prisma.promotion.update({ where: { id }, data: { ...(title!==undefined?{title}:{}), ...(content!==undefined?{content}:{}), ...(imageUrl!==undefined?{ imageUrl }:{}), ...(isActive!==undefined?{ isActive }:{}), } });
  res.json(createSuccessResponse(updated, 'Promotion updated'));
}));

router.delete('/promotions/:id', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  await prisma.promotion.delete({ where: { id } });
  res.json(createSuccessResponse({ ok: true }, 'Promotion deleted'));
}));

// Wallet balances for a user
router.get('/wallets/:userId', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBetting: true, walletGaming: true, bonusBalance: true, coins: true, wageringProgress: true, wageringRequired: true, updatedAt: true },
  });
  if (!user) throw new ValidationError('User not found');
  res.json(createSuccessResponse({
    betting: user.walletBetting,
    gaming: user.walletGaming,
    bonus: user.bonusBalance || 0,
    coins: user.coins || 0,
    wageringProgress: user.wageringProgress || 0,
    wageringRequired: user.wageringRequired || 0,
    updatedAt: user.updatedAt,
  }));
}));

// Wallet transactions for a user
router.get('/wallets/:userId/history', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const query = transactionHistorySchema.parse(req.query);
  const { page, pageSize, type, status, startDate, endDate } = query;

  const where: any = { userId };
  if (type) where.type = type.toUpperCase();
  if (status) where.status = status.toUpperCase();
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, type: true, amount: true, wallet: true, status: true, description: true, reference: true, createdAt: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json(createSuccessResponse({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
}));



// Coin management: adjust user coins (credit/debit)
router.post('/coins/:userId/adjust', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { amount, reason } = req.body as { amount?: number; reason?: string };
  if (typeof amount !== 'number' || amount === 0) throw new ValidationError('Amount must be a non-zero number');
  if (!reason) throw new ValidationError('Reason is required');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
  if (!user) throw new ValidationError('User not found');
  const newCoins = (user.coins || 0) + amount;
  if (newCoins < 0) throw new ValidationError('Insufficient coins');
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { coins: { increment: amount } } }),
    prisma.transaction.create({ data: { userId, type: amount > 0 ? 'COIN_CREDIT' : 'COIN_DEBIT', amount: Math.abs(amount), status: 'COMPLETED', description: reason, approvedBy: req.user!.id } }),
  ]);
  res.json(createSuccessResponse({ userId, delta: amount, coins: newCoins }, 'Coins updated'));
}));
