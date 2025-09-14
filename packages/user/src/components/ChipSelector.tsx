import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from '@win5x/common';

interface ChipSelectorProps {
  selectedChip: number;
  onChipSelect: (amount: number) => void;
  onPlaceBet?: (amount: number) => void;
  disabled?: boolean;
  className?: string;
}

const ChipSelector: React.FC<ChipSelectorProps> = ({
  selectedChip,
  onChipSelect,
  onPlaceBet,
  disabled = false,
  className = '',
}) => {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');
  const [isCustomSelected, setIsCustomSelected] = useState<boolean>(false);
  const [isCustomFocused, setIsCustomFocused] = useState<boolean>(false);

  const predefinedChips = [10, 20, 50, 100, 200, 500, 1000, 2000];

  // Validate custom amount
  const validateCustomAmount = useCallback((value: string): string => {
    if (!value.trim()) return '';
    
    const numValue = parseInt(value);
    
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    
    if (numValue < GAME_CONFIG.minBet) {
      return `Minimum bet is ₹${GAME_CONFIG.minBet}`;
    }
    
    if (numValue > GAME_CONFIG.maxBet) {
      return `Maximum bet is ₹${GAME_CONFIG.maxBet}`;
    }
    
    return '';
  }, []);

  // Handle custom amount input
  const handleCustomAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numbers and empty string
    if (value && !/^\d+$/.test(value)) {
      return;
    }
    
    setCustomAmount(value);
    setCustomError(validateCustomAmount(value));
    
    // If user is typing, mark as custom selected and update selected chip
    if (value) {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= GAME_CONFIG.minBet && numValue <= GAME_CONFIG.maxBet) {
        setIsCustomSelected(true);
        onChipSelect(numValue);
      }
    }
  }, [validateCustomAmount, onChipSelect]);

  // Handle predefined chip selection
  const handlePredefinedChipClick = useCallback((chip: number) => {
    onChipSelect(chip);
    setIsCustomSelected(true);
    setCustomAmount(chip.toString());
    setCustomError('');
    setIsCustomFocused(false);
  }, [onChipSelect]);

  // Handle custom bet placement
  const handleCustomBetClick = useCallback(() => {
    if (!customAmount.trim()) {
      setCustomError('Please enter an amount');
      return;
    }

    const error = validateCustomAmount(customAmount);
    if (error) {
      setCustomError(error);
      return;
    }

    const numValue = parseInt(customAmount);
    onChipSelect(numValue);
    setIsCustomSelected(true);
    
    // Place the bet if onPlaceBet is provided
    if (onPlaceBet) {
      onPlaceBet(numValue);
    }
  }, [customAmount, validateCustomAmount, onChipSelect, onPlaceBet]);

  // Handle input focus
  const handleCustomFocus = useCallback(() => {
    setIsCustomFocused(true);
  }, []);

  // Handle input blur
  const handleCustomBlur = useCallback(() => {
    setIsCustomFocused(false);
  }, []);

  // Sync with selected chip from parent
  useEffect(() => {
    const isCustom = !predefinedChips.includes(selectedChip);
    setIsCustomSelected(isCustom);
    
    if (selectedChip > 0) {
      setCustomAmount(selectedChip.toString());
      setCustomError('');
    }
  }, [selectedChip]);


  // Check if custom amount is valid
  const isCustomValid = customAmount && !customError && parseInt(customAmount) >= GAME_CONFIG.minBet && parseInt(customAmount) <= GAME_CONFIG.maxBet;

  return (
    <div className={`bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 shadow-lg ${className}`}>
      <h3 className="text-sm sm:text-base font-semibold text-gold-400 mb-3 text-center">
        Select Chip
      </h3>
      
      {/* Predefined Chips */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
        {predefinedChips.map((chip) => (
          <motion.button
            key={chip}
            className={`p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              selectedChip === chip
                ? 'bg-gold-500 text-black ring-2 ring-gold-300'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => handlePredefinedChipClick(chip)}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
          >
            ₹{chip.toLocaleString()}
          </motion.button>
        ))}
      </div>

      {/* Custom Amount Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customAmount}
              onChange={handleCustomAmountChange}
              onFocus={handleCustomFocus}
              onBlur={handleCustomBlur}
              placeholder="Enter Amount (10 - 5000)"
              className={`w-full p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm transition-all border-2 ${
                (isCustomSelected || customAmount) && !customError
                  ? 'bg-gold-500 text-black border-gold-300 ring-2 ring-gold-300'
                  : customError
                  ? 'bg-red-100 text-red-900 border-red-500'
                  : isCustomFocused
                  ? 'bg-gray-600 text-white border-gold-400'
                  : 'bg-gray-700 text-white border-gray-600 hover:border-gray-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
              disabled={disabled}
              maxLength={4} // Max 4 digits for 5000
              autoComplete="off"
            />
            {isCustomSelected && !customError && (
              <div className="absolute -top-1 -right-1 bg-gold-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                ✓
              </div>
            )}
          </div>
          
          {/* Bet Button */}
          <motion.button
            onClick={handleCustomBetClick}
            disabled={disabled || !isCustomValid}
            className={`px-4 py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              isCustomValid
                ? 'bg-gold-500 text-black hover:bg-gold-400'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            whileHover={{ scale: disabled || !isCustomValid ? 1 : 1.05 }}
            whileTap={{ scale: disabled || !isCustomValid ? 1 : 0.95 }}
          >
            Bet
          </motion.button>
        </div>
        
        {/* Error Message */}
        {customError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400 text-center"
          >
            {customError}
          </motion.div>
        )}
        
        {/* Success Message */}
        {(isCustomSelected || customAmount) && !customError && customAmount && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-gold-400 text-center"
          >
            Amount selected: ₹{parseInt(customAmount).toLocaleString()}
          </motion.div>
        )}
      </div>

      {/* Validation Info */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="text-xs text-gray-400 text-center">
          Valid range: ₹{GAME_CONFIG.minBet} - ₹{GAME_CONFIG.maxBet}
        </div>
      </div>
    </div>
  );
};

export default ChipSelector;
