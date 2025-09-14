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

// Generate referral code
function generateReferralCode(username: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.substring(0, 3).toUpperCase()}${randomSuffix}`;
}

// Get user's referral information (simple version without bonuses)
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
    referralCode = generateReferralCode(user.username);
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode }
    });
  }

  // Get total referrals count
  const totalReferrals = await prisma.referral.count({
    where: { parentId: userId }
  });

  // Get recent referrals
  const recentReferrals = await prisma.referral.findMany({
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

  // Generate invitation link
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const invitationLink = `${baseUrl}/register?ref=${referralCode}`;

  const stats = {
    referralCode,
    invitationLink,
    totalReferrals,
    recentReferrals: recentReferrals.map(ref => ({
      id: ref.id,
      username: ref.user.username,
      referralCode: ref.user.referralCode,
      joinedAt: ref.user.createdAt
    }))
  };

  res.json(createSuccessResponse(stats, 'Referral information retrieved successfully'));
}));

// Get referral records
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
    joinedAt: ref.user.createdAt
  }));

  res.json(createSuccessResponse({
    records,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  }, 'Referral records retrieved successfully'));
}));


// Get invitation link and QR code
router.get('/link', authenticateToken, requireUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, username: true }
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  const referralCode = user.referralCode || generateReferralCode(user.username);
  
  if (!user.referralCode) {
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode }
    });
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const invitationLink = `${baseUrl}/register?ref=${referralCode}`;
  
  // Generate QR code data (you can use a QR code library here)
  const qrCodeData = invitationLink;

  res.json(createSuccessResponse({
    referralCode,
    invitationLink,
    qrCodeData,
    shareText: `Join me on Win5x! Use my referral code: ${referralCode}`
  }, 'Invitation link generated successfully'));
}));

export default router;
