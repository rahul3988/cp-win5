import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireUser, 
  requireAdmin, 
  requirePermission,
  validateUserStatus, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { PaymentService } from '../services/PaymentService';
import { withdrawalSecurityService } from '../services/WithdrawalSecurityService';
import { 
  ValidationError,
  createSuccessResponse,
  paginationSchema 
} from '@win5x/common';
import { z } from 'zod';
import { logger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router: Router = Router();
const prisma = new PrismaClient();
const paymentService = new PaymentService(prisma);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Validation schemas
const depositRequestSchema = z.object({
  paymentMethodId: z.string().uuid('Invalid payment method'),
  amount: z.number().min(10, 'Minimum deposit is ₹10').max(100000, 'Maximum deposit is ₹100,000'),
  utrCode: z.string().min(5, 'UTR code must be at least 5 characters').max(50, 'UTR code too long').optional(),
  usdtHash: z.string().min(10, 'USDT hash must be at least 10 characters').max(100, 'USDT hash too long').optional(),
}).refine((data) => data.utrCode || data.usdtHash, {
  message: 'Either UTR code or USDT hash is required',
});

const withdrawalRequestSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is ₹100'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  password: z.string().min(1, 'Password is required for withdrawal'),
  accountDetails: z.object({
    upiId: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    walletAddress: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
});

const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

// User Routes
router.use(authenticateToken);

// Get payment options (UPI and USDT only)
router.get('/options', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const options = await paymentService.getPaymentOptions();
  res.json(createSuccessResponse(options));
}));

// Get all active payment methods
router.get('/methods', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const methods = await paymentService.getActivePaymentMethods();
  res.json(createSuccessResponse(methods));
}));

// Get payment method details (including QR code and UPI ID)
router.get('/methods/:id/details', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const paymentMethod = await paymentService.getPaymentMethodById(id);
  
  if (!paymentMethod) {
    throw new ValidationError('Payment method not found');
  }
  
  res.json(createSuccessResponse(paymentMethod));
}));

// Upload QR code image
router.post('/methods/:id/upload-qr', requireAdmin, upload.single('qrCode'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }
  
  // Generate a unique filename
  const fileExtension = req.file.originalname.split('.').pop() || 'png';
  const fileName = `qr-${id}-${Date.now()}.${fileExtension}`;
  
  // Save file to uploads directory
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, req.file.buffer);
  
  // Generate URL for the uploaded file
  const qrCodeUrl = `/uploads/${fileName}`;
  
  // Update payment method with new QR code URL
  await paymentService.updatePaymentMethod(id, { qrCodeUrl });
  
  res.json(createSuccessResponse({ qrCodeUrl }, 'QR code uploaded successfully'));
}));

// Submit UTR for UPI payment
router.post('/utr/submit', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const utrSubmitSchema = z.object({
    paymentMethodId: z.string().uuid('Invalid payment method'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    utrCode: z.string().regex(/^\d{12}$/, 'UTR must be exactly 12 digits'),
  });
  
  const validatedData = utrSubmitSchema.parse(req.body);
  
  try {
    const depositRequest = await paymentService.createDepositRequest(
      req.user!.id,
      validatedData.paymentMethodId,
      validatedData.amount,
      validatedData.utrCode,
      undefined
    );

    res.status(201).json(createSuccessResponse(depositRequest, 'UTR submitted successfully'));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Submit TxID for USDT payment
router.post('/txid/submit', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const txidSubmitSchema = z.object({
    paymentMethodId: z.string().uuid('Invalid payment method'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    usdtHash: z.string().min(10, 'USDT hash must be at least 10 characters').max(100, 'USDT hash too long'),
  });
  
  const validatedData = txidSubmitSchema.parse(req.body);
  
  try {
    const depositRequest = await paymentService.createDepositRequest(
      req.user!.id,
      validatedData.paymentMethodId,
      validatedData.amount,
      undefined,
      validatedData.usdtHash
    );

    res.status(201).json(createSuccessResponse(depositRequest, 'Transaction ID submitted successfully'));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// User withdrawal request
router.post('/withdraw', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = withdrawalRequestSchema.parse(req.body);
  const userId = req.user!.id;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    // Check if user is locked out due to too many failed attempts
    const lockoutStatus = await withdrawalSecurityService.isUserLockedOut(userId, ipAddress);
    if (lockoutStatus.locked) {
      const remainingTime = withdrawalSecurityService.formatLockoutTime(lockoutStatus.remainingTime!);
      await withdrawalSecurityService.recordAttempt(userId, ipAddress, false, 'Account locked due to too many failed attempts');
      throw new ValidationError(`Account temporarily locked. Please try again in ${remainingTime}.`);
    }

    // Verify password
    const isPasswordValid = await withdrawalSecurityService.verifyPassword(userId, validatedData.password);
    if (!isPasswordValid) {
      await withdrawalSecurityService.recordAttempt(userId, ipAddress, false, 'Invalid password');
      
      // Check if this was the final attempt before lockout
      const updatedLockoutStatus = await withdrawalSecurityService.isUserLockedOut(userId, ipAddress);
      if (updatedLockoutStatus.attemptsLeft === 1) {
        throw new ValidationError('Invalid password. This is your final attempt before account lockout.');
      } else {
        throw new ValidationError(`Invalid password. ${updatedLockoutStatus.attemptsLeft} attempts remaining.`);
      }
    }

    // Record successful password verification
    await withdrawalSecurityService.recordAttempt(userId, ipAddress, true);

    // Create withdrawal request
    const withdrawalRequest = await paymentService.createWithdrawalRequest(
      userId,
      validatedData.amount,
      validatedData.paymentMethod,
      validatedData.accountDetails
    );

    logger.info(`Withdrawal request created successfully: User ${userId}, Amount: ₹${validatedData.amount}, Method: ${validatedData.paymentMethod}`);

    res.status(201).json(createSuccessResponse(withdrawalRequest, 'Withdrawal request submitted successfully'));
  } catch (error: any) {
    logger.error(`Withdrawal request failed: User ${userId}, Error: ${error.message}`);
    throw new ValidationError(error.message);
  }
}));

// Get user's deposit history
router.get('/deposits', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  
  const result = await paymentService.getDepositRequests({
    userId: req.user!.id,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.json(createSuccessResponse(result));
}));

// Get user's withdrawal history
router.get('/withdrawals', requireUser, validateUserStatus, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  
  const result = await paymentService.getWithdrawalRequests({
    userId: req.user!.id,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.json(createSuccessResponse(result));
}));

// Admin Routes
router.use(requireAdmin);
router.use(validateUserStatus);

// Get all payment methods (admin)
router.get('/admin/methods', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const paymentMethods = await paymentService.getAllPaymentMethods();
  res.json(createSuccessResponse(paymentMethods));
}));

// Update payment method (admin)
router.put('/admin/methods/:id', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedMethod = await paymentService.updatePaymentMethod(id, updateData);
    res.json(createSuccessResponse(updatedMethod, 'Payment method updated successfully'));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get all deposit requests (admin)
router.get('/admin/deposits', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.extend({
    status: z.string().optional(),
    userId: z.string().uuid().optional(),
  }).parse(req.query);
  
  const result = await paymentService.getDepositRequests({
    status: query.status as string | undefined,
    userId: query.userId as string | undefined,
    page: query.page as number | undefined,
    pageSize: query.pageSize as number | undefined,
  });

  res.json(createSuccessResponse(result));
}));

// Approve/reject deposit request (admin)
router.put('/admin/deposits/:id', requirePermission('MANAGE_DEPOSITS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const validatedData = adminActionSchema.parse(req.body);

  try {
    let result;
    if (validatedData.action === 'approve') {
      result = await paymentService.approveDepositRequest(id, req.user!.id, validatedData.notes);
    } else {
      if (!validatedData.reason) {
        throw new ValidationError('Rejection reason is required');
      }
      result = await paymentService.rejectDepositRequest(id, req.user!.id, validatedData.reason);
    }

    res.json(createSuccessResponse(result, `Deposit request ${validatedData.action}d successfully`));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get all withdrawal requests (admin)
router.get('/admin/withdrawals', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.extend({
    status: z.string().optional(),
    userId: z.string().uuid().optional(),
  }).parse(req.query);
  
  const result = await paymentService.getWithdrawalRequests({
    status: query.status as string | undefined,
    userId: query.userId as string | undefined,
    page: query.page as number | undefined,
    pageSize: query.pageSize as number | undefined,
  });

  res.json(createSuccessResponse(result));
}));

// Approve/reject withdrawal request (admin)
router.put('/admin/withdrawals/:id', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const validatedData = adminActionSchema.parse(req.body);

  try {
    let result;
    if (validatedData.action === 'approve') {
      result = await paymentService.approveWithdrawalRequest(id, req.user!.id, validatedData.notes);
    } else {
      if (!validatedData.reason) {
        throw new ValidationError('Rejection reason is required');
      }
      result = await paymentService.rejectWithdrawalRequest(id, req.user!.id, validatedData.reason);
    }

    res.json(createSuccessResponse(result, `Withdrawal request ${validatedData.action}d successfully`));
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
}));

// Get payment statistics (admin)
router.get('/admin/stats', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const stats = await paymentService.getPaymentStats();
  res.json(createSuccessResponse(stats));
}));

// Get withdrawal security statistics (admin)
router.get('/admin/withdrawal-security', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.query;
  const stats = await withdrawalSecurityService.getAttemptStats(userId as string);
  res.json(createSuccessResponse(stats));
}));

// Clear failed withdrawal attempts (admin)
router.post('/admin/withdrawal-security/clear-attempts', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, ipAddress } = req.body;
  
  if (!userId) {
    throw new ValidationError('User ID is required');
  }
  
  await withdrawalSecurityService.clearFailedAttempts(userId, ipAddress);
  res.json(createSuccessResponse(null, 'Failed attempts cleared successfully'));
}));

export { router as paymentRoutes };