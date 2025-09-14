import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireUser, validateUserStatus, AuthenticatedRequest } from '../middleware/auth';
import { WalletService } from '../services/WalletService';
import { 
  depositSchema, 
  withdrawalSchema, 
  paginationSchema,
  betHistorySchema,
  transactionHistorySchema,
  ValidationError,
  createSuccessResponse,
  createErrorResponse,
  PAGINATION 
} from '@win5x/common';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import { asyncHandler as _ah } from '../middleware/errorHandler';

const router: Router = Router();
const prisma = new PrismaClient();

// Apply authentication to all user routes
router.use(authenticateToken);
router.use(requireUser);
router.use(validateUserStatus);

// Get user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      walletBetting: true,
      walletGaming: true,
      bonusBalance: true,
      referralCode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } as any,
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  res.json(createSuccessResponse(user));
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { email, username, avatarUrl } = req.body;

  if (email) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user!.id },
      },
    });

    if (existingUser) {
      throw new ValidationError('Email is already taken');
    }
  }

  // Validate unique username if provided
  if (username) {
    const existingUsername = await prisma.user.findFirst({
      where: {
        username,
        id: { not: req.user!.id },
      },
    });
    if (existingUsername) {
      throw new ValidationError('Username is already taken');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(email && { email }),
      ...(username && { username }),
      ...(avatarUrl && { avatarUrl }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      walletBetting: true,
      walletGaming: true,
      updatedAt: true,
    } as any,
  });

  logger.info(`User profile updated: ${req.user!.username} (${req.user!.id})`);

  res.json(createSuccessResponse(updatedUser, 'Profile updated successfully'));
}));

// Change password
router.post('/change-password', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current and new passwords are required');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    throw new ValidationError('User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, (user as any).password);
  if (!isValid) {
    throw new ValidationError('Current password is incorrect');
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password: hashedPassword, mustChangePassword: false },
  });

  logger.info(`User changed password: ${req.user!.username} (${req.user!.id})`);
  res.json(createSuccessResponse(null, 'Password changed successfully'));
}));

// Get user balance
router.get('/balance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { walletBetting: true, walletGaming: true, bonusBalance: true, coins: true, wageringProgress: true, wageringRequired: true },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  res.json(createSuccessResponse({
    walletBetting: user.walletBetting,
    walletGaming: user.walletGaming,
    bonusBalance: user.bonusBalance,
    coins: user.coins,
    wageringProgress: user.wageringProgress,
    wageringRequired: user.wageringRequired,
  }));
}));

// Wallets: detailed balances (real/bonus/coin/gaming) and wagering progress
router.get('/wallets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      walletBetting: true,
      walletGaming: true,
      bonusBalance: true,
      coins: true,
      wageringProgress: true,
      wageringRequired: true,
      updatedAt: true,
    },
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

// Wallet transactions/history (all relevant types)
router.get('/wallets/history', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = transactionHistorySchema.parse(req.query);
  const { page, pageSize, type, status, startDate, endDate } = query;

  const where: any = { userId: req.user!.id };
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
      select: {
        id: true,
        type: true,
        amount: true,
        wallet: true,
        status: true,
        description: true,
        reference: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json(createSuccessResponse({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
}));



// Deposit request
router.post('/deposit', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = depositSchema.parse(req.body);
  const { amount, paymentMethod, reference } = validatedData;

  // Create deposit transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'DEPOSIT',
      amount,
      wallet: 'BETTING',
      status: 'PENDING',
      description: `Deposit via ${paymentMethod}`,
      reference,
    },
  });

  logger.info(`Deposit request created: ${req.user!.username} requested ${amount} via ${paymentMethod}`);

  res.status(201).json(createSuccessResponse(transaction, 'Deposit request submitted successfully'));
}));

// Withdrawal request
router.post('/withdraw', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = withdrawalSchema.parse(req.body);
  const { amount, paymentMethod, accountDetails } = validatedData;

  // Check if user can withdraw using wallet service
  const withdrawalCheck = await WalletService.canWithdraw(req.user!.id, amount);
  if (!withdrawalCheck.canWithdraw) {
    throw new ValidationError(withdrawalCheck.reason || 'Cannot withdraw');
  }

  // Create withdrawal transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'WITHDRAWAL',
      amount: -amount, // Negative for withdrawal
      wallet: 'BETTING',
      status: 'PENDING',
      description: `Withdrawal to ${paymentMethod}: ${accountDetails}`,
    },
  });

  logger.info(`Withdrawal request created: ${req.user!.username} requested ${amount} to ${paymentMethod}`);

  res.status(201).json(createSuccessResponse(transaction, 'Withdrawal request submitted successfully'));
}));

// Create support request (stored as notification for admins)
router.post('/support-request', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { issueType, message, contactEmail } = req.body as { issueType?: string; message?: string; contactEmail?: string };

  if (!issueType && !message) {
    throw new ValidationError('Issue details are required');
  }

  const payload = {
    type: 'support_request',
    title: issueType || 'Support Request',
    message: `${message || ''}${contactEmail ? `\n\nContact: ${contactEmail}` : ''}`.trim() || 'No message provided',
    data: null as any,
    isRead: false,
    userId: req.user!.id,
  } as any;

  const note = await prisma.notification.create({ data: payload });

  res.status(201).json(createSuccessResponse(note, 'Support request submitted'));
}));

// Get transaction history
router.get('/transactions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = transactionHistorySchema.parse(req.query);
  const page = query.page;
  const pageSize = query.pageSize;
  const type = query.type;
  const status = query.status;
  const startDate = query.startDate;
  const endDate = query.endDate;
  const wallet = (query as any).wallet;

  const where: any = {
    userId: req.user!.id,
  };

  if (type) {
    where.type = type.toUpperCase();
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  if (wallet) {
    where.wallet = wallet;
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
      select: {
        id: true,
        type: true,
        amount: true,
        wallet: true,
        status: true,
        description: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
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

// Attendance APIs
router.get('/attendance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { attendanceStreak: true, lastAttendanceAt: true } });
  res.json(createSuccessResponse(user));
}));

// Attendance public config for users (tiers and day7 amount)
router.get('/attendance/config', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const cfg = await prisma.adminConfig.findFirst();
  let tiers: number[] = [5,10,15,20,30,40,60]; // Day 1-7 rewards
  try {
    if (cfg?.attendanceTiers) {
      const parsed = JSON.parse(String(cfg.attendanceTiers));
      if (Array.isArray(parsed)) tiers = parsed.map((n: any) => Number(n));
    }
  } catch {}
  res.json(createSuccessResponse({
    day7: cfg?.attendanceDay7Amt ?? 60,
    tiers,
  }));
}));

router.post('/attendance/claim', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new ValidationError('User not found');
  const now = new Date();
  // Robust claim guard: check if an attendance bonus transaction exists today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const alreadyClaimedToday = await prisma.transaction.findFirst({
    where: {
      userId: user.id,
      type: 'BONUS_CREDIT',
      description: { contains: 'Attendance Day' },
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { id: true },
  });
  if (alreadyClaimedToday) {
    throw new ValidationError('Already claimed today');
  }

  // Eligibility rule 1: First-time deposit requirement (>= ₹100 in completed deposits overall)
  const depositsAgg = await prisma.transaction.aggregate({
    where: { userId: user.id, type: 'DEPOSIT', status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const totalDeposited = depositsAgg._sum.amount || 0;
  if (totalDeposited < 100) {
    throw new ValidationError('Attendance requires at least ₹100 deposited (one-time requirement)');
  }

  // Eligibility rule 2: Daily betting requirement (>= ₹10 bet placed today before claiming)
  const todaysBets = await prisma.bet.aggregate({
    where: { userId: user.id, placedAt: { gte: startOfDay, lte: endOfDay } },
    _sum: { amount: true },
  });
  const totalBetToday = todaysBets._sum.amount || 0;
  if (totalBetToday < 10) {
    throw new ValidationError('Attendance requires at least ₹10 bet placed today');
  }
  // Determine today's tier based on streak (0..6 → day 1..7)
  const cfg = await prisma.adminConfig.findFirst();
  const tiers = ((): number[] => {
    try { const parsed = cfg?.attendanceTiers ? JSON.parse(String(cfg.attendanceTiers)) : null; return Array.isArray(parsed) ? parsed : [5,10,15,20,30,40,60]; } catch { return [5,10,15,20,30,40,60]; }
  })();
  const currentIdx = Math.min(6, Math.max(0, (user.attendanceStreak || 1) - 1)); // Convert 1-based streak to 0-based index
  const reward = Number(tiers[currentIdx] || 0);
  const newStreak = currentIdx >= 6 ? 1 : (currentIdx + 2); // Convert back to 1-based streak
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { walletGaming: { increment: reward }, attendanceStreak: newStreak, lastAttendanceAt: now } }),
    prisma.transaction.create({ data: { userId: user.id, type: 'BONUS_CREDIT', amount: reward, wallet: 'GAMING', status: 'COMPLETED', description: `Attendance Day ${currentIdx+1} bonus` } })
  ]);
  res.json(createSuccessResponse({ reward, day: currentIdx + 1 }, 'Attendance bonus credited'));
}));

router.post('/attendance/ping', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // User opens app today; update streak if new day in sequence
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new ValidationError('User not found');
  const now = new Date();
  const last = user.lastAttendanceAt ? new Date(user.lastAttendanceAt) : null;
  if (last && last.toDateString() === now.toDateString()) {
    return res.json(createSuccessResponse({ attendanceStreak: user.attendanceStreak }));
  }
  let newStreak = 1;
  if (last) {
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (24*60*60*1000));
    newStreak = diffDays === 1 ? Math.min(6, (user.attendanceStreak || 0) + 1) : 1; // cap at 6; day 7 requires claim
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { attendanceStreak: newStreak, lastAttendanceAt: now } });
  res.json(createSuccessResponse({ attendanceStreak: updated.attendanceStreak }));
}));

// Transaction summary (totals)
router.get('/transactions/summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const [deposits, withdrawals] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'DEPOSIT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'WITHDRAWAL', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);

  const depositsSum = deposits._sum.amount || 0;
  const withdrawalsSum = Math.abs(withdrawals._sum.amount || 0);

  res.json(createSuccessResponse({ depositsSum, withdrawalsSum }));
}));

// Get bet history
router.get('/bets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = betHistorySchema.parse(req.query);
  const { page, pageSize, roundId, betType, status, startDate, endDate } = query;

  const where: any = {
    userId: req.user!.id,
  };

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

// Get player betting history for history page
router.get('/history/player/:userId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  // Security: Only allow users to access their own history
  if (req.user!.id !== userId) {
    return res.status(403).json(createErrorResponse('Access denied: Cannot view other users\' history'));
  }

  const [bets, total] = await Promise.all([
    prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        round: {
          select: {
            roundNumber: true,
            winningNumber: true,
            isWinningOdd: true,
            status: true,
          },
        },
      },
    }),
    prisma.bet.count({ where: { userId } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Transform data to match required format
  const historyItems = bets.map(bet => {
    const isWin = bet.status === 'WON';
    const isOdd = bet.round?.isWinningOdd;
    const betValue = bet.betValue;
    
    // Determine bet type and result
    let betType = '';
    let result = '';
    
    if (bet.betType === 'NUMBER') {
      betType = `Number ${betValue}`;
      result = bet.round?.winningNumber === parseInt(betValue as string) ? 'Win' : 'Lose';
    } else if (bet.betType === 'ODD_EVEN') {
      betType = betValue === 'odd' ? 'Odd' : 'Even';
      result = (betValue === 'odd' && isOdd) || (betValue === 'even' && !isOdd) ? 'Win' : 'Lose';
    }

    // Calculate cashback (exactly 10% of bet amount for losses)
    const cashback = !isWin ? parseFloat((bet.amount * 0.10).toFixed(2)) : 0;

    return {
      round: bet.round?.roundNumber || 0,
      bet: betType,
      amount: bet.amount,
      payout: bet.actualPayout || 0,
      cashback: cashback,
      result: result,
      time: bet.placedAt,
    };
  });

  res.json(createSuccessResponse({
    items: historyItems,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get user login/logout logs
router.get('/logs/:userId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  // Security: Only allow users to access their own logs
  if (req.user!.id !== userId) {
    return res.status(403).json(createErrorResponse('Access denied: Cannot view other users\' logs'));
  }

  const [logs, total] = await Promise.all([
    prisma.securityLog.findMany({
      where: { 
        userId,
        type: { in: ['login', 'logout'] }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        type: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
      },
    }),
    prisma.securityLog.count({ 
      where: { 
        userId,
        type: { in: ['login', 'logout'] }
      }
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Transform data to match required format
  const logItems = logs.map(log => ({
    action: log.type,
    date: log.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
    time: log.createdAt.toISOString().split('T')[1].split('.')[0].substring(0, 5), // HH:MM format
    timestamp: log.createdAt,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
  }));

  res.json(createSuccessResponse({
    items: logItems,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get user statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get bet statistics
  const [
    totalBets,
    totalWagered,
    totalWon,
    winningBets,
    recentBets,
  ] = await Promise.all([
    prisma.bet.count({
      where: { userId },
    }),
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
    prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: 'desc' },
      take: 10,
      include: {
        round: {
          select: {
            roundNumber: true,
            winningNumber: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const totalWageredAmount = totalWagered._sum.amount || 0;
  const totalWonAmount = totalWon._sum.actualPayout || 0;
  const winRate = totalBets > 0 ? (winningBets / totalBets) * 100 : 0;
  const netProfit = totalWonAmount - totalWageredAmount;

  const stats = {
    totalBets,
    totalWagered: totalWageredAmount,
    totalWon: totalWonAmount,
    winningBets,
    winRate: Math.round(winRate * 100) / 100,
    netProfit,
    recentBets,
  };

  res.json(createSuccessResponse(stats));
}));

// Get user's current active bets
router.get('/active-bets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const activeBets = await prisma.bet.findMany({
    where: {
      userId: req.user!.id,
      status: 'PENDING',
    },
    include: {
      round: {
        select: {
          id: true,
          roundNumber: true,
          status: true,
          bettingEndTime: true,
        },
      },
    },
    orderBy: { placedAt: 'desc' },
  });

  res.json(createSuccessResponse(activeBets));
}));

// Leaderboard (simple: sum of winnings by user in period)
router.get('/leaderboard', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = String((req.query as any).period || 'daily');
  const now = new Date();
  let start = new Date(now);
  if (period === 'daily') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0, 0, 0); // 02:00 today
  } else if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = d;
  } else if (period === 'monthly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    start = d;
  }

  // Aggregate winnings per user
  const winnings = await prisma.bet.groupBy({
    by: ['userId'],
    where: {
      placedAt: { gte: start, lte: now },
      status: 'WON',
    },
    _sum: { actualPayout: true },
  });

  // Sort desc and take top 1000 (client will paginate if needed)
  const sorted = winnings
    .map(w => ({ userId: w.userId, totalWon: Number(w._sum.actualPayout || 0) }))
    .filter(x => x.totalWon > 0)
    .sort((a, b) => b.totalWon - a.totalWon)
    .slice(0, 1000);

  // Fetch usernames for top entries and current user
  const topUserIds = sorted.slice(0, 200).map(x => x.userId);
  const users = await prisma.user.findMany({ where: { id: { in: topUserIds } }, select: { id: true, username: true } });
  const idToName: Record<string, string> = Object.fromEntries(users.map(u => [u.id, u.username]));

  const leaderboard = sorted.slice(0, 200).map((x, idx) => ({
    rank: idx + 1,
    userId: x.userId,
    username: idToName[x.userId] || 'Player',
    totalWon: x.totalWon,
  }));

  const myIndex = sorted.findIndex(x => x.userId === req.user!.id);
  const me = myIndex >= 0 ? { rank: myIndex + 1, totalWon: sorted[myIndex].totalWon } : { rank: null as any, totalWon: 0 };

  res.json(createSuccessResponse({ period, start, end: now, entries: leaderboard, me }));
}));

// Convert game credit to balance (if allowed)
router.post('/convert-credit', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new ValidationError('Invalid amount');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { walletGaming: true },
  });

  if (!user || user.walletGaming < amount) {
    throw new ValidationError('Insufficient gaming wallet balance');
  }

  // Convert gaming wallet to betting wallet
  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      walletGaming: { decrement: amount },
      walletBetting: { increment: amount },
    },
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'BONUS_CREDIT',
      amount,
      wallet: 'BETTING',
      status: 'COMPLETED',
      description: `Converted ${amount} gaming wallet to betting wallet`,
    },
  });

  // Send real-time balance update
  try {
    const { SocketService } = await import('../websocket/SocketService');
    const socketService = SocketService.getInstance();
    if (socketService) {
      // Get updated user balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { walletBetting: true, walletGaming: true },
      });

      if (updatedUser) {
        await socketService.notifyUser(req.user!.id, 'user_balance_update', {
          bettingWallet: Number(updatedUser.walletBetting || 0),
          gamingWallet: Number(updatedUser.walletGaming || 0),
        });
      }
    }
  } catch (e) {
    logger.error('Failed to send balance update via socket', e);
  }

  logger.info(`Game credit converted: ${req.user!.username} converted ${amount} credit to balance`);

  res.json(createSuccessResponse(null, 'Game credit converted successfully'));
}));

// Refund bet amount (for clear bets functionality)
router.post('/refund-bet', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { amount, useGamingWallet } = req.body;

  if (!amount || amount <= 0) {
    throw new ValidationError('Invalid amount');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { walletBetting: true, walletGaming: true },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  // Refund the bet amount back to the appropriate wallet(s)
  if (useGamingWallet) {
    // If it was a gaming wallet bet, refund proportionally
    const bettingWalletBalance = Number(user.walletBetting);
    const gamingWalletBalance = Number(user.walletGaming);
    const totalBalance = bettingWalletBalance + gamingWalletBalance;
    
    if (totalBalance > 0) {
      const bettingRefund = (bettingWalletBalance / totalBalance) * amount;
      const gamingRefund = (gamingWalletBalance / totalBalance) * amount;
      
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          walletBetting: { increment: bettingRefund },
          walletGaming: { increment: gamingRefund },
        },
      });
    } else {
      // If no balance, refund to betting wallet
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          walletBetting: { increment: amount },
        },
      });
    }
  } else {
    // Normal betting wallet bet - refund to betting wallet
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        walletBetting: { increment: amount },
      },
    });
  }

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'BONUS_CREDIT',
      amount,
      wallet: 'BETTING',
      status: 'COMPLETED',
      description: `Bet refund - cleared bets`,
    },
  });

  // Send real-time balance update
  try {
    const { SocketService } = await import('../websocket/SocketService');
    const socketService = SocketService.getInstance();
    if (socketService) {
      // Get updated user balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { walletBetting: true, walletGaming: true },
      });

      if (updatedUser) {
        await socketService.notifyUser(req.user!.id, 'user_balance_update', {
          bettingWallet: Number(updatedUser.walletBetting || 0),
          gamingWallet: Number(updatedUser.walletGaming || 0),
        });
      }
    }
  } catch (e) {
    logger.error('Failed to send balance update via socket', e);
  }

  logger.info(`Bet refunded: ${req.user!.username} refunded ${amount} for cleared bets`);

  res.json(createSuccessResponse(null, 'Bet amount refunded successfully'));
}));

// Feedback (simple)
router.post('/feedback', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { category, message } = req.body as { category?: string; message?: string };
  if (!message || message.trim().length < 4) {
    throw new ValidationError('Feedback message too short');
  }
  const note = await prisma.notification.create({
    data: {
      userId: req.user!.id,
      type: 'feedback',
      title: category || 'general',
      message: message.trim(),
      data: null as any,
    } as any,
  });
  res.status(201).json(createSuccessResponse(note, 'Feedback submitted'));
}));

// Live Chat endpoints removed

export { router as userRoutes };

// Public promotions for users
router.get('/promotions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const items = await prisma.promotion.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  res.json(createSuccessResponse(items));
}));

// Promotions config (public-facing values such as deposit bonus %)
router.get('/promotions/config', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const cfg = await prisma.adminConfig.findFirst();
  let tiers: number[] = [5,10,15,20,30,40,60]; // Day 1-7 rewards
  try {
    if (cfg?.attendanceTiers) {
      const parsed = JSON.parse(String(cfg.attendanceTiers));
      if (Array.isArray(parsed)) tiers = parsed.map((n: any) => Number(n));
    }
  } catch {}
  res.json(createSuccessResponse({
    depositBonusPct: cfg?.depositBonusPct ?? 5,
    attendanceTiers: tiers,
  }));
}));

// Gift code redemption - now handled by gift code controller