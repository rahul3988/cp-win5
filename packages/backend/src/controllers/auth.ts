import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { 
  loginSchema, 
  registerSchema, 
  ValidationError, 
  AuthenticationError,
  createSuccessResponse 
} from '@win5x/common';
import { logger } from '../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

// User Registration
router.post('/register', asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);
  const { username, email, password, referralCode } = validatedData;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
  });

  if (existingUser) {
    throw new ValidationError('Username or email already exists');
  }

  // Validate referral code if provided
  let referrerId = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true, username: true }
    });

    if (!referrer) {
      throw new ValidationError('Invalid referral code');
    }

    referrerId = referrer.id;
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Generate referral code for new user
  const newReferralCode = generateReferralCode(username);

  // Create user with default avatar
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      avatarUrl: 'avatar-1', // Default avatar
      referralCode: newReferralCode,
      referredById: referrerId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      walletBetting: true,
      walletGaming: true,
      createdAt: true,
    },
  });

  // Create simple referral relationship if referral code was provided
  if (referrerId) {
    await prisma.referral.create({
      data: {
        userId: user.id,
        parentId: referrerId,
        level: 1
      }
    });

    logger.info(`User registered with referral: ${user.username} (${user.id}) referred by ${referrerId}`);
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    username: user.username,
    type: 'user',
  });

  logger.info(`User registered: ${user.username} (${user.id})`);

  res.status(201).json(createSuccessResponse({
    user,
    ...tokens,
  }, 'User registered successfully'));
}));

// Helper function to generate referral code
function generateReferralCode(username: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.toUpperCase()}${randomSuffix}`;
}

// User Login
router.post('/login', asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const { username, password } = validatedData;

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email: username }, // Allow login with email
      ],
      isActive: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    username: user.username,
    type: 'user',
  });

  // Log login activity
  await prisma.securityLog.create({
    data: {
      type: 'login',
      userId: user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`User logged in: ${user.username} (${user.id})`);

  res.json(createSuccessResponse({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      walletBetting: user.walletBetting,
      walletGaming: user.walletGaming,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    ...tokens,
  }, 'Login successful'));
}));

// Admin Login
router.post('/admin/login', asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const { username, password } = validatedData;

  // Find admin (explicitly select password to avoid undefined)
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { username },
        { email: username },
      ],
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      role: true,
      permissions: true,
      isActive: true,
    },
  });

  if (!admin) {
    throw new AuthenticationError('Invalid admin credentials');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, admin.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid admin credentials');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: admin.id,
    username: admin.username,
    type: 'admin',
    role: admin.role,
    permissions: admin.permissions,
  });

  logger.info(`Admin logged in: ${admin.username} (${admin.id})`);

  res.json(createSuccessResponse({
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
    ...tokens,
  }, 'Admin login successful'));
}));

// Refresh Token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    let newTokens;
    
    if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId, isActive: true },
      });

      if (!admin) {
        throw new AuthenticationError('Admin not found or inactive');
      }

      newTokens = generateTokens({
        userId: admin.id,
        username: admin.username,
        type: 'admin',
        role: admin.role,
        permissions: admin.permissions,
      });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true },
        select: {
          id: true,
          username: true,
          email: true,
          walletBetting: true,
          walletGaming: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AuthenticationError('User not found or inactive');
      }

      newTokens = generateTokens({
        userId: user.id,
        username: user.username,
        type: 'user',
      });
    }

    res.json(createSuccessResponse(newTokens, 'Tokens refreshed successfully'));
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
}));

// Logout (optional - mainly for client-side token cleanup)
router.post('/logout', asyncHandler(async (req, res) => {
  // In a more sophisticated implementation, you might want to blacklist tokens
  // For now, we'll just return success and let the client handle token cleanup
  
  res.json(createSuccessResponse(null, 'Logged out successfully'));
}));

// Authenticated Logout (for logging purposes)
router.post('/logout-authenticated', authenticateToken, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  
  // Log logout activity
  await prisma.securityLog.create({
    data: {
      type: 'logout',
      userId: userId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`User logged out: ${req.user.username} (${userId})`);
  
  res.json(createSuccessResponse(null, 'Logged out successfully'));
}));

// Verify Token (for client-side token validation)
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId, isActive: true },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
        },
      });

      if (!admin) {
        throw new AuthenticationError('Admin not found or inactive');
      }

      res.json(createSuccessResponse({
        type: 'admin',
        admin,
      }, 'Token valid'));
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          walletBetting: true,
          walletGaming: true,
          createdAt: true,
          updatedAt: true,
        } as any,
      });

      if (!user) {
        throw new AuthenticationError('User not found or inactive');
      }

      res.json(createSuccessResponse({
        type: 'user',
        user,
      }, 'Token valid'));
    }
  } catch (error) {
    throw new AuthenticationError('Invalid token');
  }
}));

export { router as authRoutes };

// Admin change password
router.post('/admin/change-password', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current and new passwords are required');
  }

  const admin = await prisma.admin.findUnique({ where: { id: (req as any).user.id } });
  if (!admin) {
    throw new AuthenticationError('Admin not found');
  }

  const isValid = await bcrypt.compare(currentPassword, admin.password);
  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashed = await bcrypt.hash(newPassword, saltRounds);

  await prisma.admin.update({ where: { id: admin.id }, data: { password: hashed } });
  logger.info(`Admin changed password: ${admin.username} (${admin.id})`);
  res.json(createSuccessResponse(null, 'Password changed successfully'));
}));