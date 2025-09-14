import { GAME_CONFIG, expandBet, BET_TYPES } from '@win5x/common';

/**
 * Calculate total bet amount from expanded bets
 * @param bets - Record of bet keys to amounts
 * @returns Total bet amount
 */
export function getTotalBet(bets: Record<string, number>): number {
  return Object.values(bets).reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate individual bet amounts for each number based on current bets
 * @param bets - Record of bet keys to amounts
 * @returns Record of number to total bet amount
 */
export function calculateIndividualBetAmounts(bets: Record<string, number>): Record<number, number> {
  const individualBets: Record<number, number> = {};
  
  // Initialize all numbers with 0
  for (let i = 0; i <= 9; i++) {
    individualBets[i] = 0;
  }
  
  // Process each bet
  Object.entries(bets).forEach(([betKey, amount]) => {
    if (amount <= 0) return;
    
    const [betType, betValue] = betKey.split('_');
    
    switch (betType) {
      case 'single':
        const number = parseInt(betValue);
        if (!isNaN(number)) {
          individualBets[number] += amount;
        }
        break;
        
      case 'odd':
        // Expand odd bet to all odd numbers
        GAME_CONFIG.oddNumbers.forEach(num => {
          individualBets[num] += amount;
        });
        break;
        
      case 'even':
        // Expand even bet to all even numbers
        GAME_CONFIG.evenNumbers.forEach(num => {
          individualBets[num] += amount;
        });
        break;
    }
  });
  
  return individualBets;
}

/**
 * Calculate total bet amount from individual number bets
 * @param individualBets - Record of number to bet amount
 * @returns Total bet amount
 */
export function getTotalFromIndividualBets(individualBets: Record<number, number>): number {
  return Object.values(individualBets).reduce((sum, amount) => sum + amount, 0);
}

/**
 * Get expanded bet details for display
 * @param bets - Record of bet keys to amounts
 * @returns Array of expanded bet objects
 */
export function getExpandedBetDetails(bets: Record<string, number>) {
  const expandedBets: Array<{ number: number; amount: number; source: string }> = [];
  
  Object.entries(bets).forEach(([betKey, amount]) => {
    if (amount <= 0) return;
    
    const [betType, betValue] = betKey.split('_');
    
    switch (betType) {
      case 'single':
        const number = parseInt(betValue);
        if (!isNaN(number)) {
          expandedBets.push({ number, amount, source: 'single' });
        }
        break;
        
      case 'odd':
        GAME_CONFIG.oddNumbers.forEach(num => {
          expandedBets.push({ number: num, amount, source: 'odd' });
        });
        break;
        
      case 'even':
        GAME_CONFIG.evenNumbers.forEach(num => {
          expandedBets.push({ number: num, amount, source: 'even' });
        });
        break;
    }
  });
  
  return expandedBets;
}
