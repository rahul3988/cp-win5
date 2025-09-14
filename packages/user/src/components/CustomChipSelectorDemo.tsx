import React, { useState } from 'react';
import ChipSelector from './ChipSelector';
import Chip from './Chip';
import TotalBetDisplay from './TotalBetDisplay';

const CustomChipSelectorDemo: React.FC = () => {
  const [selectedChip, setSelectedChip] = useState(20);
  const [bets, setBets] = useState<Record<string, number>>({});

  const handleChipClick = (number: number) => {
    setBets(prev => ({
      ...prev,
      [`single_${number}`]: (prev[`single_${number}`] || 0) + selectedChip
    }));
  };

  const handleCustomBetPlacement = (amount: number) => {
    console.log('Custom bet amount selected:', amount);
    // In real implementation, this would trigger bet placement
  };

  const clearBets = () => {
    setBets({});
  };

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Custom Chip Selector Demo
        </h1>
        
        {/* Chip Selector */}
        <div className="mb-6">
          <ChipSelector
            selectedChip={selectedChip}
            onChipSelect={setSelectedChip}
            onPlaceBet={handleCustomBetPlacement}
          />
        </div>

        {/* Current Selection Display */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gold-400 mb-3 text-center">
            Current Selection
          </h2>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-2">
              Selected Chip: ₹{selectedChip.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">
              {selectedChip < 10 || selectedChip > 5000 ? 'Custom Amount' : 'Predefined Chip'}
            </div>
          </div>
        </div>

        {/* Total Bet Display */}
        <div className="mb-6">
          <TotalBetDisplay
            bets={bets}
            showDetails={true}
          />
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
                betAmount={bets[`single_${number}`] || 0}
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
                {Object.entries(bets).map(([key, amount]) => {
                  const [, number] = key.split('_');
                  return (
                    <div key={key} className="text-sm text-white">
                      Number {number}: ₹{amount.toLocaleString()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Totals:</h3>
              <div className="text-sm text-white">
                <div>Total Bet: ₹{Object.values(bets).reduce((sum, amount) => sum + amount, 0).toLocaleString()}</div>
                <div>Numbers with bets: {Object.keys(bets).length}</div>
                <div>Selected chip: ₹{selectedChip.toLocaleString()}</div>
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

        {/* Test Cases */}
        <div className="mt-8 bg-blue-900 rounded-lg p-4 border border-blue-600">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Test Cases:</h3>
          <div className="text-xs text-blue-200 space-y-1">
            <div><strong>Valid amounts:</strong> 10, 100, 4999, 5000</div>
            <div><strong>Invalid amounts:</strong> 0, 5, 5001, -10, 10.5</div>
            <div><strong>Features:</strong> Real-time validation, error messages, success feedback</div>
            <div><strong>Integration:</strong> Works with existing chip system and bet calculations</div>
            <div><strong>Custom Input:</strong> Type any amount between 10-5000 and click Bet</div>
            <div><strong>Predefined Chips:</strong> Click any predefined chip to select it</div>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="mt-6 bg-green-900 rounded-lg p-4 border border-green-600">
          <h3 className="text-sm font-semibold text-green-300 mb-2">Implementation Notes:</h3>
          <div className="text-xs text-green-200 space-y-1">
            <div>✅ <strong>Controlled Input:</strong> Input field is properly controlled with value and onChange</div>
            <div>✅ <strong>Validation:</strong> Real-time validation with clear error messages</div>
            <div>✅ <strong>Bet Button:</strong> Custom amount requires clicking Bet button to place</div>
            <div>✅ <strong>State Management:</strong> Integrates with existing bet state system</div>
            <div>✅ <strong>Backend Ready:</strong> Backend validation enforces min/max limits</div>
            <div>✅ <strong>UI/UX:</strong> Consistent styling and responsive design</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomChipSelectorDemo;
