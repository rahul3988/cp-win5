import { Router } from 'express';
import { 
  PaymentGatewayService, 
  createPaymentGatewayService, 
  DEFAULT_PAYMENT_GATEWAY_CONFIG,
  PaymentRequest,
  PaymentVerificationRequest,
  RefundRequest
} from '../services/PaymentGatewayService';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireUser, 
  requireAdmin,
  validateUserStatus, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { ValidationError, createSuccessResponse } from '@win5x/common';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router: Router = Router();

// Initialize payment gateway service
const paymentGateway = createPaymentGatewayService({
  gateway: (process.env.PAYMENT_GATEWAY as any) || 'mock',
  apiKey: process.env.PAYMENT_GATEWAY_API_KEY,
  apiSecret: process.env.PAYMENT_GATEWAY_API_SECRET,
  webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
  merchantId: process.env.PAYMENT_GATEWAY_MERCHANT_ID,
  isTestMode: process.env.NODE_ENV !== 'production',
});

// Validation schemas
const createPaymentSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least ₹1'),
  currency: z.string().default('INR'),
  orderId: z.string().min(1, 'Order ID is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().optional(),
  description: z.string().optional(),
  callbackUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
});

const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  gatewayOrderId: z.string().optional(),
  gatewayTransactionId: z.string().optional(),
  signature: z.string().optional(),
});

const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// User Routes
router.use(authenticateToken);
router.use(requireUser);
router.use(validateUserStatus);

// Create payment request
router.post('/create', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = createPaymentSchema.parse(req.body);
  
  const paymentRequest: PaymentRequest = {
    ...validatedData,
    customerId: req.user!.id,
  };

  try {
    const paymentResponse = await paymentGateway.createPayment(paymentRequest);
    
    logger.info(`Payment created: ${paymentResponse.paymentId} for user ${req.user!.id}`);
    
    res.status(201).json(createSuccessResponse(paymentResponse, 'Payment request created successfully'));
  } catch (error: any) {
    logger.error('Payment creation failed:', error);
    throw new ValidationError(error.message || 'Failed to create payment');
  }
}));

// Verify payment
router.post('/verify', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = verifyPaymentSchema.parse(req.body);
  
  const verificationRequest: PaymentVerificationRequest = {
    ...validatedData,
  };

  try {
    const verificationResponse = await paymentGateway.verifyPayment(verificationRequest);
    
    logger.info(`Payment verified: ${verificationResponse.paymentId} for user ${req.user!.id}`);
    
    res.json(createSuccessResponse(verificationResponse, 'Payment verification completed'));
  } catch (error: any) {
    logger.error('Payment verification failed:', error);
    throw new ValidationError(error.message || 'Failed to verify payment');
  }
}));

// Get payment status
router.get('/status/:paymentId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { paymentId } = req.params;
  
  if (!paymentId) {
    throw new ValidationError('Payment ID is required');
  }

  try {
    // For now, we'll return a mock status
    // In a real implementation, you'd query the payment gateway or your database
    const status = {
      paymentId,
      status: 'pending',
      amount: 0,
      currency: 'INR',
      createdAt: new Date().toISOString(),
    };
    
    res.json(createSuccessResponse(status));
  } catch (error: any) {
    logger.error('Payment status check failed:', error);
    throw new ValidationError(error.message || 'Failed to get payment status');
  }
}));

// Admin Routes
router.use(requireAdmin);

// Process refund
router.post('/refund', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = refundSchema.parse(req.body);
  
  const refundRequest: RefundRequest = {
    ...validatedData,
  };

  try {
    const refundResponse = await paymentGateway.processRefund(refundRequest);
    
    logger.info(`Refund processed: ${refundResponse.refundId} for payment ${refundRequest.paymentId} by admin ${req.user!.id}`);
    
    res.json(createSuccessResponse(refundResponse, 'Refund processed successfully'));
  } catch (error: any) {
    logger.error('Refund processing failed:', error);
    throw new ValidationError(error.message || 'Failed to process refund');
  }
}));

// Get supported gateways
router.get('/gateways', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const gateways = paymentGateway.getSupportedGateways();
  const config = paymentGateway.getGatewayConfig();
  
  res.json(createSuccessResponse({
    supported: gateways,
    current: config.gateway,
    isTestMode: config.isTestMode,
  }));
}));

// Webhook endpoint for payment gateway callbacks
router.post('/webhook/:gateway', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { gateway } = req.params;
  
  if (!paymentGateway.isGatewaySupported(gateway)) {
    throw new ValidationError(`Unsupported gateway: ${gateway}`);
  }

  try {
    // TODO: Implement webhook handling for each gateway
    // This would typically involve:
    // 1. Verifying the webhook signature
    // 2. Parsing the webhook payload
    // 3. Updating the payment status in the database
    // 4. Triggering any necessary business logic
    
    logger.info(`Webhook received from ${gateway}:`, req.body);
    
    res.json(createSuccessResponse({ received: true }, 'Webhook processed successfully'));
  } catch (error: any) {
    logger.error(`Webhook processing failed for ${gateway}:`, error);
    throw new ValidationError(error.message || 'Failed to process webhook');
  }
}));

// Get payment gateway configuration
router.get('/config', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = paymentGateway.getGatewayConfig();
  
  // Don't expose sensitive information
  const publicConfig = {
    gateway: config.gateway,
    isTestMode: config.isTestMode,
    supportedCurrencies: ['INR'],
    supportedMethods: ['upi', 'card', 'netbanking', 'wallet'],
  };
  
  res.json(createSuccessResponse(publicConfig));
}));

export { router as paymentGatewayRoutes };

