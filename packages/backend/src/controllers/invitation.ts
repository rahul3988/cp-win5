import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireUser, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { 
  ValidationError,
  createSuccessResponse 
} from '@win5x/common';

const router: Router = Router();
const prisma = new PrismaClient();

// Get user's invitation information (simple version without bonuses)
router.get('/stats', authenticateToken, requireUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get user's referral code
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, username: true }
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  // Generate referral code if not exists
  let referralCode = user.referralCode;
  if (!referralCode) {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    referralCode = `${user.username.substring(0, 3).toUpperCase()}${randomSuffix}`;
    
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode }
    });
  }

  // Get all referrals
  const referrals = await prisma.referral.findMany({
    where: { parentId: userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          referralCode: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  res.json(createSuccessResponse({
    referralCode,
    invitationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`,
    totalReferrals: referrals.length,
    recentReferrals: referrals.map(ref => ({
      id: ref.id,
      username: ref.user.username,
      referralCode: ref.user.referralCode,
      joinedAt: ref.createdAt
    }))
  }, 'Invitation information retrieved successfully'));
}));

// Get invitation records
router.get('/records', authenticateToken, requireUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { page = 1, limit = 20 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const referrals = await prisma.referral.findMany({
    where: { parentId: userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          referralCode: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(limit)
  });

  const total = await prisma.referral.count({
    where: { parentId: userId }
  });

  const records = referrals.map(ref => ({
    id: ref.id,
    username: ref.user.username,
    email: ref.user.email,
    referralCode: ref.user.referralCode,
    joinedAt: ref.createdAt
  }));

  res.json(createSuccessResponse({
    records,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  }, 'Invitation records retrieved successfully'));
}));

export default router;