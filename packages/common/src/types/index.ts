// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string; // Avatar image URL
  mustChangePassword?: boolean;
  walletBetting: number; // Betting Wallet - for deposits, withdrawals, and betting
  walletGaming: number;  // Gaming Wallet - for cashback, referrals, and bonuses
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export type AdminPermission = 
  | 'MANAGE_BETS' 
  | 'MANAGE_USERS' 
  | 'MANAGE_WITHDRAWALS' 
  | 'MANAGE_DEPOSITS'
  | 'VIEW_ANALYTICS'
  | 'EMERGENCY_CONTROLS'
  | 'MANAGE_TIMERS'
  | 'GIFT_CODES';

// Game Types
export interface GameRound {
  id: string;
  roundNumber: number;
  status: GameRoundStatus;
  bettingStartTime: Date;
  bettingEndTime: Date;
  spinStartTime: Date | null;
  resultTime: Date | null;
  winningNumber: number | null;
  winningColor: 'red' | 'black' | null;
  isWinningOdd: boolean | null;
  totalBetAmount: number;
  totalPayout: number;
  houseProfitLoss: number;
  createdAt: Date;
  updatedAt: Date;
}

export type GameRoundStatus = 
  | 'betting' 
  | 'betting_closed' 
  | 'spinning' 
  | 'completed' 
  | 'cancelled';

export interface Bet {
  id: string;
  userId: string;
  roundId: string;
  betType: BetType;
  betValue: number | string; // number for specific numbers, 'odd'/'even', 'red'/'black'
  amount: number;
  potentialPayout: number;
  isWinner: boolean | null;
  actualPayout: number;
  status: BetStatus;
  walletType: WalletType; // Track which wallet was used for the bet
  placedAt: Date;
  settledAt: Date | null;
}

export type BetType = 'number' | 'odd_even';
export type BetStatus = 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
export type WalletType = 'betting' | 'gaming';

// Transaction Types
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  wallet: WalletType; // Which wallet was affected
  status: TransactionStatus;
  description: string;
  reference?: string; // External payment reference
  approvedBy?: string; // Admin ID who approved
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'bet_placed' 
  | 'bet_won' 
  | 'bet_lost'
  | 'cashback'
  | 'admin_adjustment';

export type TransactionStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'completed' 
  | 'cancelled';

// WebSocket Event Types
export interface SocketEvents {
  // Client to Server
  'join_room': { room: string };
  'leave_room': { room: string };
  'place_bet': PlaceBetData;
  'admin_action': AdminActionData;

  // Server to Client
  'round_update': GameRound;
  'bet_update': Bet[];
  'timer_update': TimerUpdate;
  'bet_distribution': BetDistribution;
  'user_balance_update': { balance: number; gameCredit: number };
  'error': { message: string; code?: string };
  'admin_notification': AdminNotification;
}

export interface PlaceBetData {
  roundId: string;
  betType: BetType;
  betValue: number | string;
  amount: number;
}

export interface AdminActionData {
  action: 'emergency_stop' | 'manual_spin' | 'extend_betting' | 'cancel_round';
  data?: any;
}

export interface TimerUpdate {
  roundId: string;
  phase: 'betting' | 'spinning' | 'result';
  timeRemaining: number; // in seconds
}

export interface BetDistribution {
  roundId: string;
  numbers: Record<string, { count: number; amount: number }>;
  oddEven: { odd: { count: number; amount: number }; even: { count: number; amount: number } };
}

export interface AdminNotification {
  type: 'withdrawal_request' | 'high_exposure' | 'system_alert';
  message: string;
  data?: any;
  timestamp: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Game Configuration
export interface GameConfig {
  bettingDuration: number; // seconds
  spinDuration: number; // seconds
  resultDuration: number; // seconds
  minBetAmount: number;
  maxBetAmount: number;
  payoutMultiplier: number; // 5x
  cashbackPercentage: number; // 10%
  maxExposure: number; // Maximum house exposure per round
}

// Analytics Types
export interface AnalyticsData {
  period: string;
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalRounds: number;
    totalBets: number;
    revenue: number;
    payout: number;
    houseProfitLoss: number;
    houseEdge: number;
  };
  pending: {
    withdrawals: number;
    deposits: number;
  };
  recentActivity: Array<{
    roundNumber: number;
    winningNumber: number;
    totalBetAmount: number;
    totalPayout: number;
    houseProfitLoss: number;
    resultTime: string;
    _count: { bets: number };
  }>;
  generatedAt: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalWinnings: number;
  totalBets: number;
  winRate: number;
}

export interface Leaderboard {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role?: AdminRole;
  permissions?: AdminPermission[];
  type: 'user' | 'admin';
  iat: number;
  exp: number;
}

// Error Types
export class Win5xError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'Win5xError';
  }
}

export class ValidationError extends Win5xError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends Win5xError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends Win5xError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class GameError extends Win5xError {
  constructor(message: string, code: string = 'GAME_ERROR') {
    super(message, code, 400);
  }
}