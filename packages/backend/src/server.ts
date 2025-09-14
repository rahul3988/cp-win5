import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Import routes and services
import { authRoutes } from './controllers/auth';
import { userRoutes } from './controllers/user';
import { gameRoutes } from './controllers/game';
import { adminRoutes } from './controllers/admin';
import { paymentRoutes } from './controllers/payment';
import { paymentGatewayRoutes } from './controllers/paymentGateway';
import referralRoutes from './controllers/referral';
import adminReferralRoutes from './controllers/adminReferral';
import invitationRoutes from './controllers/invitation';
import { uploadRoutes } from './controllers/upload';
import giftCodeRoutes from './controllers/giftCode';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { GameEngine } from './services/GameEngine';
import { SocketService } from './websocket/SocketService';
import { RedisService } from './services/RedisService';
import { LiveActivityService } from './services/LiveActivityService';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Create Express app
const app: express.Application = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV === 'production') {
        const envOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
        const allowed = envOrigins
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
        return allowed.includes(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS'));
      }
      // In development, allow all origins to support LAN/mobile testing
      return callback(null, true);
    },
    credentials: true,
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:3001", "https:", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:3001"],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'production') {
      const envOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
      const allowed = envOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      return allowed.includes(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS'));
    }
    // In development, allow all origins to support LAN/mobile testing
    return callback(null, true);
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global limiter only in production to avoid noisy 429s during development
if ((process.env.NODE_ENV || 'development') === 'production') {
  app.use(limiter);
}

// Targeted limiter for login endpoints to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_PER_MIN || '10'),
  message: 'Too many login attempts, please try again shortly.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply login limiter before auth routes
app.use('/api/auth/admin/login', loginLimiter);
app.use('/api/auth/user/login', loginLimiter as any);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Static file serving for uploads (with proper CORS and headers)
app.use('/uploads', (req, res, next) => {
  // Set comprehensive CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Set proper cache and content headers
  res.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  // Static file options
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper Content-Type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

// API routes

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payment-gateway', paymentGatewayRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/admin/referral', adminReferralRoutes);
app.use('/api/invitation', invitationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/gift-code', giftCodeRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Initialize services
let gameEngine: GameEngine;
let socketService: SocketService;
let redisService: RedisService;
let liveActivityService: LiveActivityService;

async function initializeServices() {
  try {
    // Initialize Redis with fallback
    redisService = new RedisService();
    try {
      await redisService.connect();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without Redis:', redisError);
      // Create a mock Redis service that doesn't fail
      redisService = {
        connect: async () => {},
        disconnect: async () => {},
        get: async () => null,
        set: async () => {},
        del: async () => {},
        exists: async () => false,
        incr: async () => 1,
        decr: async () => 0,
      } as any;
    }

    // Initialize Game Engine
    gameEngine = new GameEngine(prisma, redisService);
    await gameEngine.initialize();
    logger.info('Game Engine initialized successfully');

    // Initialize Live Activity Service
    liveActivityService = new LiveActivityService(redisService);
    logger.info('Live Activity Service initialized successfully');

    // Initialize Socket Service
    socketService = SocketService.createInstance(io, gameEngine, prisma, liveActivityService);
    socketService.initialize();
    logger.info('Socket Service initialized successfully');

    // Start the game engine
    gameEngine.start();
    logger.info('Game Engine started successfully');

    // Start rolling cashback scheduler (5 AM daily)
    gameEngine.startRollingCashbackScheduler();

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Starting graceful shutdown...');
  
  try {
    if (gameEngine) {
      gameEngine.stop();
      logger.info('Game Engine stopped');
    }
    
    if (redisService) {
      await redisService.disconnect();
      logger.info('Redis disconnected');
    }
    
    await prisma.$disconnect();
    logger.info('Database disconnected');
    
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize services
    await initializeServices();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🎮 Game Engine: Active`);
      logger.info(`🔌 WebSocket: Active`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { app, io, gameEngine, socketService, redisService, liveActivityService };

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}