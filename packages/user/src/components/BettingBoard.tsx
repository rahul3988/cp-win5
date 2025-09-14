import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getNumberColor, expandBet, getCoveredNumbers, BET_TYPES, GAME_CONFIG } from '@win5x/common';
import Chip from './Chip';

interface BettingBoardProps {
  selectedChip: number;
  bets: Record<string, number>;
  onPlaceBet: (betType: string, betValue: string | number) => void;
  disabled?: boolean;
  betDistribution?: {
    numbers: Record<string, { count: number; amount: number }>;
    oddEven?: { odd: { count: number; amount: number }; even: { count: number; amount: number } };
  };
  getNumberBetAmount?: (number: number) => number;
}

const BettingBoard: React.FC<BettingBoardProps> = ({
  selectedChip,
  bets,
  onPlaceBet,
  disabled = false,
  betDistribution,
  getNumberBetAmount,
}) => {

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getBetAmount = (betType: string, betValue: string | number) => {
    const key = `${betType}_${betValue}`;
    return bets[key] || 0;
  };

  const getDistributionAmount = (betType: string, betValue: string | number) => {
    if (!betDistribution) return 0;
    
    if (betType === 'number') {
      return betDistribution.numbers[betValue.toString()]?.amount || 0;
    }
    
    if (betType === 'odd_even') {
      return betDistribution.oddEven?.[betValue as 'odd' | 'even']?.amount || 0;
    }
    
    return 0;
  };

  const getDistributionCount = (betType: string, betValue: string | number) => {
    if (!betDistribution) return 0;
    
    if (betType === 'number') {
      return betDistribution.numbers[betValue.toString()]?.count || 0;
    }
    
    if (betType === 'odd_even') {
      return betDistribution.oddEven?.[betValue as 'odd' | 'even']?.count || 0;
    }
    
    return 0;
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '0';
    }
    return Number(amount).toLocaleString();
  };

  const [expandedNumbers, setExpandedNumbers] = React.useState<Set<number>>(new Set());

  const toggleNumberExpansion = (number: number) => {
    setExpandedNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(number)) {
        newSet.delete(number);
      } else {
        newSet.add(number);
      }
      return newSet;
    });
  };

  const handleBetClick = (betType: string, betValue: string | number) => {
    onPlaceBet(betType, betValue);
  };


  return (
    <div className="bg-green-900 rounded-lg p-3 sm:p-4 md:p-6 border-2 sm:border-4 border-gold-600 shadow-2xl relative">

      
      {/* Numbers Grid */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-center text-base sm:text-lg font-semibold text-gold-400 mb-3 sm:mb-4">
          Numbers (5x Payout)
        </h3>
        
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {numbers.map((number) => {
            const userBet = getNumberBetAmount ? getNumberBetAmount(number) : getBetAmount('single', number);
            const totalBet = getDistributionAmount('number', number);
            const betCount = getDistributionCount('number', number);
            const isExpanded = expandedNumbers.has(number);
            
            return (
              <div key={number} className="relative">
                <Chip
                  number={number}
                  betAmount={userBet}
                  onClick={() => handleBetClick('single', number)}
                  disabled={disabled || selectedChip === 0}
                  showDistribution={true}
                  distributionAmount={totalBet}
                  distributionCount={betCount}
                />

                {/* Expand button for high bet counts */}
                {betCount > 3 && (
                  <button
                    onClick={() => toggleNumberExpansion(number)}
                    className="absolute -top-1 -left-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-blue-600 z-20"
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                )}

                {/* Expanded bet details */}
                {isExpanded && betCount > 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 bg-gray-800 rounded-lg p-2 mt-1 z-20 shadow-lg"
                  >
                    <div className="text-xs text-gray-300 mb-1">Bet Details:</div>
                    <div className="text-xs text-white">
                      Total: ₹{formatCurrency(totalBet)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Players: {betCount}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Odd/Even Betting */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-center text-base sm:text-lg font-semibold text-gold-400 mb-3 sm:mb-4">
          Odd/Even (5x Payout)
        </h3>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { value: 'odd', label: 'Odd', numbers: GAME_CONFIG.oddNumbers.join(', '), bgColor: 'bg-gray-900 hover:bg-gray-800' },
            { value: 'even', label: 'Even', numbers: GAME_CONFIG.evenNumbers.join(', '), bgColor: 'bg-red-600 hover:bg-red-500' }
          ].map(({ value, label, numbers, bgColor }) => {
            const userBet = getBetAmount('odd_even', value);
            const totalBet = getDistributionAmount('odd_even', value);
            const betCount = getDistributionCount('odd_even', value);
            
            return (
              <div key={value} className="relative">
                <motion.button
                  className={`w-full h-16 sm:h-20 md:h-24 rounded-lg font-bold text-sm sm:text-base md:text-lg transition-all ${bgColor} text-white relative ${userBet > 0 ? 'ring-2 sm:ring-4 ring-gold-400' : ''} ${
                    totalBet > 0 ? 'ring-1 sm:ring-2 ring-white/30' : ''
                  } ${disabled || selectedChip === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => handleBetClick(value, value)}
                  disabled={disabled || selectedChip === 0}
                  whileHover={{ scale: disabled ? 1 : 1.05 }}
                  whileTap={{ scale: disabled ? 1 : 0.95 }}
                >
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl">{label}</div>
                    <div className="text-xs sm:text-sm opacity-75">{numbers}</div>
                  </div>
                  
                  {/* User bet indicator */}
                  {userBet > 0 && (
                    <motion.div 
                      className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-gold-500 text-black text-xs font-bold px-1 rounded-full min-w-[16px] sm:min-w-[20px] z-10"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      ₹{formatCurrency(userBet)}
                    </motion.div>
                  )}
                  
                  {/* Total bet amount */}
                  {totalBet > 0 && (
                    <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-1 sm:px-2 py-1 rounded z-10">
                      <div className="text-center">
                        <div className="font-bold">₹{formatCurrency(totalBet)}</div>
                        {betCount > 1 && (
                          <div className="text-xs opacity-75">{betCount} bets</div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>


    </div>
  );
};

export default BettingBoard;