import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireUser, 
  requireAdmin, 
  requirePermission, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { 
  ValidationError,
  createSuccessResponse 
} from '@win5x/common';
import { createErrorResponse } from '@win5x/common';

const router: Router = Router();
const prisma = new PrismaClient();

// Gift code status enum
enum GiftCodeStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXHAUSTED = 'EXHAUSTED'
}

// Admin: Create gift code
router.post('/admin/gift-codes', authenticateToken, requireAdmin, requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { code, amount, usageLimit = 1, expiryDate } = req.body;

  if (!code || !amount || !expiryDate) {
    return res.status(400).json(createErrorResponse('Code, amount, and expiry date are required'));
  }

  if (amount <= 0) {
    return res.status(400).json(createErrorResponse('Amount must be greater than 0'));
  }

  if (usageLimit <= 0) {
    return res.status(400).json(createErrorResponse('Usage limit must be greater than 0'));
  }

  // Check if code already exists
  const existingCode = await prisma.giftCode.findUnique({
    where: { code: code.toUpperCase() }
  });

  if (existingCode) {
    return res.status(400).json(createErrorResponse('Gift code already exists'));
  }

  // Create gift code
  const giftCode = await prisma.giftCode.create({
    data: {
      code: code.toUpperCase(),
      amount,
      usageLimit,
      expiryDate: new Date(expiryDate),
      status: GiftCodeStatus.ACTIVE,
      createdBy: req.user!.id
    }
  });

  res.status(201).json(createSuccessResponse(giftCode, 'Gift code created successfully'));
}));

// Admin: Get all gift codes
router.get('/admin/gift-codes', authenticateToken, requireAdmin, requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);

  const giftCodes = await prisma.giftCode.findMany({
    include: {
      _count: {
        select: { redemptions: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(pageSize)
  });

  const total = await prisma.giftCode.count();

  res.json(createSuccessResponse({
    items: giftCodes,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / Number(pageSize))
  }, 'Gift codes retrieved successfully'));
}));

// Admin: Update gift code
router.put('/admin/gift-codes/:id', authenticateToken, requireAdmin, requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !Object.values(GiftCodeStatus).includes(status)) {
    return res.status(400).json(createErrorResponse('Invalid status'));
  }

  const giftCode = await prisma.giftCode.update({
    where: { id },
    data: { status }
  });

  res.json(createSuccessResponse(giftCode, 'Gift code updated successfully'));
}));

// Admin: Delete gift code
router.delete('/admin/gift-codes/:id', authenticateToken, requireAdmin, requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  await prisma.giftCode.delete({
    where: { id }
  });

  res.json(createSuccessResponse(null, 'Gift code deleted successfully'));
}));

// User: Redeem gift code
router.post('/user/redeem-code', authenticateToken, requireUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;
  const userId = req.user!.id;

  if (!code) {
    return res.status(400).json(createErrorResponse('Gift code is required'));
  }

  // Find gift code
  const giftCode = await prisma.giftCode.findUnique({
    where: { code: code.toUpperCase() }
  });

  if (!giftCode) {
    return res.status(400).json(createErrorResponse('Invalid gift code'));
  }

  // Check if gift code is active
  if (giftCode.status !== GiftCodeStatus.ACTIVE) {
    return res.status(400).json(createErrorResponse('Gift code is not active'));
  }

  // Check if gift code has expired
  if (new Date() > giftCode.expiryDate) {
    await prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { status: GiftCodeStatus.EXPIRED }
    });
    return res.status(400).json(createErrorResponse('Gift code has expired'));
  }

  // Check if gift code has reached usage limit
  if (giftCode.usedCount >= giftCode.usageLimit) {
    await prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { status: GiftCodeStatus.EXHAUSTED }
    });
    return res.status(400).json(createErrorResponse('Gift code has reached usage limit'));
  }

  // Check if user has already redeemed this gift code
  const existingRedemption = await prisma.giftCodeRedemption.findUnique({
    where: {
      giftCodeId_userId: {
        giftCodeId: giftCode.id,
        userId
      }
    }
  });

  if (existingRedemption) {
    return res.status(400).json(createErrorResponse('You have already redeemed this gift code'));
  }

  // Create redemption record
  const redemption = await prisma.giftCodeRedemption.create({
    data: {
      giftCodeId: giftCode.id,
      userId,
      amount: giftCode.amount
    }
  });

  // Update gift code usage count
  await prisma.giftCode.update({
    where: { id: giftCode.id },
    data: {
      usedCount: { increment: 1 }
    }
  });

  // Update user's gaming wallet
  await prisma.user.update({
    where: { id: userId },
    data: {
      walletGaming: { increment: giftCode.amount }
    }
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId,
      type: 'GIFT_CODE_REDEMPTION',
      amount: giftCode.amount,
      status: 'COMPLETED',
      description: `Gift code redemption: ${giftCode.code}`
    }
  });

  // Get updated user balance for real-time update
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBetting: true, walletGaming: true, bonusBalance: true },
  });

  // Emit balance update to user via socket
  const { SocketService } = await import('../websocket/SocketService');
  const socketService = SocketService.getInstance();
  if (socketService) {
    await socketService.notifyUser(userId, 'user_balance_update', {
      bettingWallet: Number(updatedUser?.walletBetting || 0),
      gamingWallet: Number(updatedUser?.walletGaming || 0),
      bonusBalance: Number(updatedUser?.bonusBalance || 0),
    });
  }

  res.json(createSuccessResponse({
    code: giftCode.code,
    amount: giftCode.amount,
    message: `Gift code redeemed successfully! ₹${giftCode.amount} added to your gaming wallet.`
  }, 'Gift code redeemed successfully'));
}));

// User: Get gift code redemption history
router.get('/user/history', authenticateToken, requireUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { page = 1, pageSize = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);

  const redemptions = await prisma.giftCodeRedemption.findMany({
    where: { userId },
    include: {
      giftCode: {
        select: { code: true, amount: true }
      }
    },
    orderBy: { redeemedAt: 'desc' },
    skip,
    take: Number(pageSize)
  });

  const total = await prisma.giftCodeRedemption.count({
    where: { userId }
  });

  res.json(createSuccessResponse({
    items: redemptions,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / Number(pageSize))
  }, 'Gift code history retrieved successfully'));
}));

export default router;
