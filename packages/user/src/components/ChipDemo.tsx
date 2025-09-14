import React, { useState } from 'react';
import Chip from './Chip';

const ChipDemo: React.FC = () => {
  const [selectedChip, setSelectedChip] = useState(20);
  const [bets, setBets] = useState<Record<number, number>>({});

  const handleChipClick = (number: number) => {
    setBets(prev => ({
      ...prev,
      [number]: (prev[number] || 0) + selectedChip
    }));
  };

  const clearBets = () => {
    setBets({});
  };

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Chip Component Demo
        </h1>
        
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
            Number Chips (Click to place bets)
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {numbers.map((number) => (
              <Chip
                key={number}
                number={number}
                betAmount={bets[number] || 0}
                onClick={() => handleChipClick(number)}
              />
            ))}
          </div>
        </div>

        {/* Bet Summary */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gold-400 mb-3 text-center">
            Bet Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Individual Bets:</h3>
              <div className="space-y-1">
                {Object.entries(bets).map(([number, amount]) => (
                  <div key={number} className="text-sm text-white">
                    Number {number}: ₹{amount.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Totals:</h3>
              <div className="text-sm text-white">
                <div>Total Bet: ₹{Object.values(bets).reduce((sum, amount) => sum + amount, 0).toLocaleString()}</div>
                <div>Numbers with bets: {Object.keys(bets).length}</div>
              </div>
            </div>
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
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Instructions:</h3>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Select a chip value from the top row</li>
            <li>• Click on any number chip to place a bet</li>
            <li>• Golden badges show the bet amount on each chip</li>
            <li>• Red numbers (1,3,5,7,9) have red background</li>
            <li>• Black numbers (0,2,4,6,8) have gray background</li>
            <li>• Badges are positioned at the top-right corner</li>
            <li>• Badges only appear when bet amount &gt; 0</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChipDemo;
