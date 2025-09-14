import React from 'react';
import { motion } from 'framer-motion';
import { getNumberColor } from '@win5x/common';
import { CHIP_STYLES } from '../constants/chipStyles';

export interface ChipProps {
  number: number;
  betAmount?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  showDistribution?: boolean;
  distributionAmount?: number;
  distributionCount?: number;
}

const Chip: React.FC<ChipProps> = ({
  number,
  betAmount = 0,
  onClick,
  disabled = false,
  className = '',
  showDistribution = false,
  distributionAmount = 0,
  distributionCount = 0,
}) => {
  const color = getNumberColor(number);
  const isRed = color === 'red';
  const hasBet = betAmount > 0;
  const hasDistribution = showDistribution && distributionAmount > 0;

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '0';
    }
    return Number(amount).toLocaleString();
  };

  const baseClasses = `w-full h-12 sm:h-14 md:h-16 lg:h-18 rounded-lg font-bold text-sm sm:text-base md:text-lg lg:text-xl transition-all text-white relative ${
    isRed ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-900 hover:bg-gray-800'
  } ${hasBet ? 'ring-2 sm:ring-4 ring-gold-400' : ''} ${
    hasDistribution ? 'ring-1 sm:ring-2 ring-white/30' : ''
  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`;

  return (
    <div className="relative">
      <motion.button
        className={baseClasses}
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        {/* Number in center */}
        <span className="font-bold">{number}</span>
        
        {/* Golden bet amount badge */}
        {hasBet && (
          <motion.div
            className={`${CHIP_STYLES.POSITIONING.ABSOLUTE} ${CHIP_STYLES.POSITIONING.TOP} ${CHIP_STYLES.POSITIONING.RIGHT} ${CHIP_STYLES.BADGE.FONT_SIZE} ${CHIP_STYLES.BADGE.FONT_WEIGHT} ${CHIP_STYLES.BADGE.PADDING} ${CHIP_STYLES.BADGE.BORDER_RADIUS} ${CHIP_STYLES.BADGE.MIN_WIDTH} ${CHIP_STYLES.BADGE.Z_INDEX}`}
            style={{
              backgroundColor: CHIP_STYLES.BADGE.BACKGROUND_COLOR,
              color: CHIP_STYLES.BADGE.TEXT_COLOR,
              border: `1px solid ${CHIP_STYLES.BADGE.BORDER_COLOR}`,
              boxShadow: CHIP_STYLES.BADGE.SHADOW,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            ₹{formatCurrency(betAmount)}
          </motion.div>
        )}
        
        {/* Distribution info (if enabled) */}
        {hasDistribution && (
          <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-1 sm:px-2 py-1 rounded z-10">
            <div className="text-center">
              <div className="font-bold">₹{formatCurrency(distributionAmount)}</div>
              {distributionCount > 1 && (
                <div className="text-xs opacity-75">{distributionCount} bets</div>
              )}
            </div>
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default Chip;
