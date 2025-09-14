import React from 'react';
import { getTotalBet, calculateIndividualBetAmounts, getExpandedBetDetails } from '../utils/betCalculations';

interface TotalBetDisplayProps {
  bets: Record<string, number>;
  className?: string;
  showDetails?: boolean;
}

const TotalBetDisplay: React.FC<TotalBetDisplayProps> = ({
  bets,
  className = '',
  showDetails = false,
}) => {
  const totalBet = getTotalBet(bets);
  const individualBets = calculateIndividualBetAmounts(bets);
  const expandedBets = getExpandedBetDetails(bets);
  
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '0';
    }
    return Number(amount).toLocaleString();
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-600 ${className}`}>
      {/* Main Total Display */}
      <div className="flex justify-between items-center text-sm sm:text-base mb-2">
        <span className="text-gray-300 font-medium">Your Total Bet:</span>
        <span className="text-gold-400 font-bold text-lg">
          ₹{formatCurrency(totalBet)}
        </span>
      </div>
      
      {/* Potential Payout */}
      <div className="flex justify-between items-center text-xs sm:text-sm mb-2">
        <span className="text-gray-300">Potential Payout:</span>
        <span className="text-green-400 font-bold">
          ₹{formatCurrency(totalBet * 5)}
        </span>
      </div>
      
      {/* Details Section */}
      {showDetails && totalBet > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-2">Bet Breakdown:</div>
          
          {/* Individual Number Bets */}
          <div className="grid grid-cols-5 gap-1 text-xs">
            {Object.entries(individualBets)
              .filter(([_, amount]) => amount > 0)
              .map(([number, amount]) => (
                <div key={number} className="bg-gray-700 rounded px-1 py-1 text-center">
                  <div className="font-semibold text-white">{number}</div>
                  <div className="text-gold-400">₹{formatCurrency(amount)}</div>
                </div>
              ))}
          </div>
          
          {/* Source Information */}
          {expandedBets.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              <div className="mb-1">Sources:</div>
              <div className="space-y-1">
                {Object.entries(bets)
                  .filter(([_, amount]) => amount > 0)
                  .map(([betKey, amount]) => {
                    const [betType, betValue] = betKey.split('_');
                    return (
                      <div key={betKey} className="flex justify-between">
                        <span>
                          {betType === 'single' ? `Number ${betValue}` : 
                           betType === 'odd' ? 'Odd numbers' : 
                           betType === 'even' ? 'Even numbers' : betKey}
                        </span>
                        <span className="text-gold-400">₹{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Footer Info */}
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="text-xs text-gray-400 text-center">
          All bets pay 5x
        </div>
      </div>
    </div>
  );
};

export default TotalBetDisplay;
