// Chip styling constants
export const CHIP_STYLES = {
  BADGE: {
    BACKGROUND_COLOR: '#FFD700', // Golden
    TEXT_COLOR: '#000000', // Black
    BORDER_COLOR: '#DAA520', // Darker gold
    SHADOW: '0 2px 4px rgba(0, 0, 0, 0.3)',
    FONT_SIZE: 'text-xs',
    FONT_WEIGHT: 'font-bold',
    PADDING: 'px-1.5 py-0.5',
    BORDER_RADIUS: 'rounded-full',
    MIN_WIDTH: 'min-w-[20px]',
    Z_INDEX: 'z-10',
  },
  POSITIONING: {
    TOP: '-top-1 sm:-top-2',
    RIGHT: '-right-1 sm:-right-2',
    ABSOLUTE: 'absolute',
  },
  RESPONSIVE: {
    SMALL: {
      BADGE_SIZE: 'text-xs px-1 py-0.5 min-w-[16px]',
      POSITION: '-top-1 -right-1',
    },
    MEDIUM: {
      BADGE_SIZE: 'text-xs px-1.5 py-0.5 min-w-[20px]',
      POSITION: '-top-2 -right-2',
    },
  },
} as const;
