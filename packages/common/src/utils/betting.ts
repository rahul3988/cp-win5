import { GAME_CONFIG } from '../constants';

export const BET_TYPES = {
  SINGLE: 'single',
  ODD: 'odd',
  EVEN: 'even',
} as const;

export interface ExpandedBet {
  number: number;
  bet: number;
}

export interface BetExpansion {
  totalBet: number;
  bets: ExpandedBet[];
  betType: string;
  originalAmount: number;
}

/**
 * Expands a bet according to the betting rules
 * @param betType - Type of bet (single, odd, even)
 * @param number - Number for single bets (ignored for odd/even)
 * @param amount - Amount to bet
 * @returns Expanded bet information
 */
export function expandBet(betType: string, number: number, amount: number): BetExpansion {
  // Validate minimum bet amount
  if (amount < GAME_CONFIG.minBet) {
    throw new Error(`Minimum bet amount is ₹${GAME_CONFIG.minBet}`);
  }

  // Validate maximum bet amount
  if (amount > GAME_CONFIG.maxBet) {
    throw new Error(`Maximum bet amount is ₹${GAME_CONFIG.maxBet}`);
  }

  switch (betType) {
    case BET_TYPES.SINGLE:
      return {
        totalBet: amount,
        bets: [{ number, bet: amount }],
        betType: BET_TYPES.SINGLE,
        originalAmount: amount,
      };

    case BET_TYPES.ODD:
      return {
        totalBet: amount * GAME_CONFIG.oddNumbers.length,
        bets: GAME_CONFIG.oddNumbers.map(num => ({ number: num, bet: amount })),
        betType: BET_TYPES.ODD,
        originalAmount: amount,
      };

    case BET_TYPES.EVEN:
      return {
        totalBet: amount * GAME_CONFIG.evenNumbers.length,
        bets: GAME_CONFIG.evenNumbers.map(num => ({ number: num, bet: amount })),
        betType: BET_TYPES.EVEN,
        originalAmount: amount,
      };

    default:
      throw new Error(`Invalid bet type: ${betType}`);
  }
}

/**
 * Calculates the potential payout for a winning number
 * @param betType - Type of bet
 * @param winningNumber - The winning number
 * @param amount - Original bet amount
 * @returns Potential payout amount
 */
export function calculatePotentialPayout(betType: string, winningNumber: number, amount: number): number {
  switch (betType) {
    case BET_TYPES.SINGLE:
      return amount * GAME_CONFIG.payoutMultiplier;

    case BET_TYPES.ODD:
      return (GAME_CONFIG.oddNumbers as readonly number[]).includes(winningNumber) 
        ? amount * GAME_CONFIG.payoutMultiplier 
        : 0;

    case BET_TYPES.EVEN:
      return (GAME_CONFIG.evenNumbers as readonly number[]).includes(winningNumber) 
        ? amount * GAME_CONFIG.payoutMultiplier 
        : 0;

    default:
      return 0;
  }
}

/**
 * Gets the numbers that would be covered by a bet type
 * @param betType - Type of bet
 * @param number - Number for single bets
 * @returns Array of numbers that would be covered
 */
export function getCoveredNumbers(betType: string, number?: number): number[] {
  switch (betType) {
    case BET_TYPES.SINGLE:
      return number !== undefined ? [number] : [];
    case BET_TYPES.ODD:
      return [...GAME_CONFIG.oddNumbers];
    case BET_TYPES.EVEN:
      return [...GAME_CONFIG.evenNumbers];
    default:
      return [];
  }
}

/**
 * Calculates payout for multiple bets
 * @param bets - Array of expanded bets
 * @param winningNumber - The winning number
 * @returns Total payout amount
 */
export function calculateBetsPayout(bets: ExpandedBet[], winningNumber: number): number {
  return bets.reduce((total, bet) => {
    return total + (bet.number === winningNumber ? bet.bet * GAME_CONFIG.payoutMultiplier : 0);
  }, 0);
}
