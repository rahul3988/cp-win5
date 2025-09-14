// Game Constants
export const GAME_CONFIG = {
  DEFAULT_BETTING_DURATION: 30, // seconds - Players place bets
  DEFAULT_SPIN_PREPARATION_DURATION: 10, // seconds - Analyze bets and prepare wheel
  DEFAULT_SPINNING_DURATION: 11, // seconds - Wheel animates to winning number (10-12 seconds)
  DEFAULT_RESULT_DURATION: 9, // seconds - Display results (8-10 seconds)
  DEFAULT_TRANSITION_DURATION: 3, // seconds - Transition to new round (2-5 seconds)
  MIN_BET_AMOUNT: 10,
  MAX_BET_AMOUNT: 10000,
  PAYOUT_MULTIPLIER: 5,
  CASHBACK_PERCENTAGE: 10,
  MAX_EXPOSURE_MULTIPLIER: 100, // Max exposure as multiplier of max bet
  // Betting configuration
  oddNumbers: [1, 3, 5, 7, 9],
  evenNumbers: [0, 2, 4, 6, 8],
  payoutMultiplier: 5,
  minBet: 10,
  maxBet: 5000,
} as const;

// Game Phase Enum
export enum GamePhase {
  BETTING = "BETTING", // 30 seconds - Players place bets
  SPIN_PREPARATION = "SPIN_PREPARATION", // 10 seconds - Analyze bets and prepare wheel
  SPINNING = "SPINNING", // 10-12 seconds - Wheel animates to winning number
  RESULT = "RESULT", // 8-10 seconds - Display results
  TRANSITION = "TRANSITION", // 2-5 seconds - Transition to new round
}

// Number Colors (red for even, black for odd)
export const NUMBER_COLORS = {
  0: 'red',   // Even - Red
  1: 'black', // Odd - Black
  2: 'red',   // Even - Red
  3: 'black', // Odd - Black
  4: 'red',   // Even - Red
  5: 'black', // Odd - Black
  6: 'red',   // Even - Red
  7: 'black', // Odd - Black
  8: 'red',   // Even - Red
  9: 'black', // Odd - Black
} as const;

// WebSocket Events
export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  PLACE_BET: 'place_bet',
  ADMIN_ACTION: 'admin_action',

  // Server to Client
  ROUND_UPDATE: 'round_update',
  PHASE_UPDATE: 'phase_update',
  BET_UPDATE: 'bet_update',
  TIMER_UPDATE: 'timer_update',
  ROUND_WINNER: 'round_winner',
  BET_DISTRIBUTION: 'bet_distribution',
  USER_BALANCE_UPDATE: 'user_balance_update',
  ERROR: 'error',
  ADMIN_NOTIFICATION: 'admin_notification',
  
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTION_ERROR: 'connect_error',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  VERIFY: '/api/auth/verify',
  ADMIN_SET_TEMP_PASSWORD: '/api/admin/users/:userId/set-temp-password',
  
  // User
  PROFILE: '/api/user/profile',
  CHANGE_PASSWORD: '/api/user/change-password',
  BALANCE: '/api/user/balance',
  TRANSACTIONS: '/api/user/transactions',
  DEPOSIT: '/api/user/deposit',
  WITHDRAW: '/api/user/withdraw',
  BET_HISTORY: '/api/user/bets',
  
  // Game
  CURRENT_ROUND: '/api/game/current-round',
  ROUND_HISTORY: '/api/game/rounds',
  PLACE_BET: '/api/game/bet',
  LEADERBOARD: '/api/game/leaderboard',
  
  // Admin
  ADMIN_LOGIN: '/api/auth/admin/login',
  USERS: '/api/admin/users',
  ROUNDS: '/api/admin/rounds',
  BETS: '/api/admin/bets',
  TRANSACTIONS_ADMIN: '/api/admin/transactions',
  ANALYTICS: '/api/admin/analytics',
  GAME_CONFIG: '/api/admin/game-config',
  EMERGENCY_STOP: '/api/admin/emergency-stop',
  MANUAL_SPIN: '/api/admin/manual-spin',
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_BET_AMOUNT: 'INVALID_BET_AMOUNT',
  INVALID_BET_TYPE: 'INVALID_BET_TYPE',
  
  // Game
  BETTING_CLOSED: 'BETTING_CLOSED',
  ROUND_NOT_FOUND: 'ROUND_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  BET_LIMIT_EXCEEDED: 'BET_LIMIT_EXCEEDED',
  GAME_SUSPENDED: 'GAME_SUSPENDED',
  
  // System
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_DIGIT: true,
    REQUIRE_SPECIAL: false,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  BET_AMOUNT: {
    MIN: 10,
    MAX: 10000,
  },
} as const;

// Socket Rooms
export const SOCKET_ROOMS = {
  GAME: 'game',
  ADMIN: 'admin',
  USER_PREFIX: 'user_',
} as const;

// Cache Keys
export const CACHE_KEYS = {
  CURRENT_ROUND: 'current_round',
  BET_DISTRIBUTION: 'bet_distribution',
  LEADERBOARD_DAILY: 'leaderboard_daily',
  LEADERBOARD_WEEKLY: 'leaderboard_weekly',
  LEADERBOARD_MONTHLY: 'leaderboard_monthly',
  USER_BALANCE: 'user_balance_',
  GAME_CONFIG: 'game_config',
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
