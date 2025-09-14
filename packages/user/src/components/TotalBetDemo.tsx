import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TotalBetDisplay from './TotalBetDisplay';
import Chip from './Chip';

const TotalBetDemo: React.FC = () => {
  const [selectedChip, setSelectedChip] = useState(20);
  const [bets, setBets] = useState<Record<string, number>>({});

  const handleBetClick = (betType: string, betValue: string | number) => {
    const betKey = `${betType}_${betValue}`;
    setBets(prev => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip
    }));
  };

  const clearBets = () => {
    setBets({});
  };

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Total Bet Display Demo
        </h1>
        
        {/* Total Bet Display */}
        <TotalBetDisplay 
          bets={bets} 
          className="mb-6"
          showDetails={true}
        />

        {/* Chip Selector */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gold-400 mb-3 text-center">
            Select Chip Value
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100, 200, 500, 1000, 2000].map((chip) => (
              <button
                key={chip}
                className={`p-2 rounded-lg font-bold text-sm transition-all ${
                  selectedChip === chip
                    ? 'bg-gold-500 text-black ring-2 ring-gold-300'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                onClick={() => setSelectedChip(chip)}
              >
                ₹{chip.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Number Chips */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gold-400 mb-3 text-center">
            Single Number Bets
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {numbers.map((number) => (
              <Chip
                key={number}
                number={number}
                betAmount={bets[`single_${number}`] || 0}
                onClick={() => handleBetClick('single', number)}
              />
            ))}
          </div>
        </div>

        {/* Parity Bets */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gold-400 mb-3 text-center">
            Odd/Even Bets
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              className={`w-full h-16 rounded-lg font-bold text-lg transition-all ${
                bets['odd_odd'] > 0 
                  ? 'bg-gray-900 ring-4 ring-gold-400' 
                  : 'bg-gray-900 hover:bg-gray-800'
              } text-white relative`}
              onClick={() => handleBetClick('odd', 'odd')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-center">
                <div className="font-bold">Odd</div>
                <div className="text-xs opacity-75">1, 3, 5, 7, 9</div>
              </div>
              {bets['odd_odd'] > 0 && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold px-2 py-1 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ₹{bets['odd_odd'].toLocaleString()}
                </motion.div>
              )}
            </motion.button>

            <motion.button
              className={`w-full h-16 rounded-lg font-bold text-lg transition-all ${
                bets['even_even'] > 0 
                  ? 'bg-red-600 ring-4 ring-gold-400' 
                  : 'bg-red-600 hover:bg-red-500'
              } text-white relative`}
              onClick={() => handleBetClick('even', 'even')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-center">
                <div className="font-bold">Even</div>
                <div className="text-xs opacity-75">0, 2, 4, 6, 8</div>
              </div>
              {bets['even_even'] > 0 && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold px-2 py-1 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ₹{bets['even_even'].toLocaleString()}
                </motion.div>
              )}
            </motion.button>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center">
          <button
            onClick={clearBets}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
          >
            Clear All Bets
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900 rounded-lg p-4 border border-blue-600">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">How it works:</h3>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• <strong>Single bets:</strong> Click any number chip to place a bet on that specific number</li>
            <li>• <strong>Odd bets:</strong> Click "Odd" to place the same amount on all odd numbers (1,3,5,7,9)</li>
            <li>• <strong>Even bets:</strong> Click "Even" to place the same amount on all even numbers (0,2,4,6,8)</li>
            <li>• <strong>Total calculation:</strong> The "Your Total Bet" shows the sum of all expanded bets</li>
            <li>• <strong>Example:</strong> ₹10 odd bet = ₹50 total (₹10 on each of 5 odd numbers)</li>
            <li>• <strong>Chip badges:</strong> Each chip shows its individual bet amount in golden badges</li>
            <li>• <strong>Combined bets:</strong> If you bet on both single numbers and parity, amounts are combined</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TotalBetDemo;
