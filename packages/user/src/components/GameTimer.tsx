import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Trophy } from 'lucide-react';

interface GameTimerProps {
  phase: 'betting' | 'spin_preparation' | 'spinning' | 'result' | 'transition';
  timeRemaining: number;
  roundNumber?: number;
  gameState?: any;
  canBet?: boolean;
  isConnected?: boolean;
  betCount?: number;
}

const GameTimer: React.FC<GameTimerProps> = ({
  phase,
  timeRemaining,
  roundNumber,
  gameState,
  canBet,
  isConnected,
  betCount,
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);

  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const getPhaseConfig = () => {
    switch (phase) {
      case 'betting':
        return {
          title: 'Place Your Bets',
          icon: Clock,
          color: 'text-green-400',
          bgColor: 'bg-green-900/50',
          borderColor: 'border-green-400',
          maxTime: 30,
        };
      case 'spin_preparation':
        return {
          title: 'Preparing Spin...',
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/50',
          borderColor: 'border-yellow-400',
          maxTime: 10,
        };
      case 'spinning':
        return {
          title: 'Spinning...',
          icon: Play,
          color: 'text-gold-400',
          bgColor: 'bg-gold-900/50',
          borderColor: 'border-gold-400',
          maxTime: 11,
        };
      case 'result':
        return {
          title: 'Results',
          icon: Trophy,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/50',
          borderColor: 'border-blue-400',
          maxTime: 9,
        };
      case 'transition':
        return {
          title: 'Next Round...',
          icon: Clock,
          color: 'text-purple-400',
          bgColor: 'bg-purple-900/50',
          borderColor: 'border-purple-400',
          maxTime: 3,
        };
      default:
        return {
          title: 'Waiting...',
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/50',
          borderColor: 'border-gray-400',
          maxTime: 30,
        };
    }
  };

  const config = getPhaseConfig();
  const Icon = config.icon;
  const isLowTime = displayTime <= 5 && phase === 'betting';
  const progressPercentage = Math.max(0, Math.min(1, displayTime / config.maxTime));

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Round Number */}
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gold-400 mb-2">
          Round #{roundNumber || 0}
        </h2>
        

      </div>

      {/* Timer Container */}
      <div className="relative flex items-center justify-center">
        {/* Progress Ring */}
        <svg className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 transform -rotate-90" viewBox="0 0 120 120">
          {/* Background Circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            stroke="rgba(255, 215, 0, 0.2)"
            strokeWidth="8"
            fill="none"
          />
          
          {/* Progress Circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            stroke="rgb(255, 215, 0)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            style={{
              strokeDashoffset: `${2 * Math.PI * 45 * (1 - progressPercentage)}`,
            }}
          />
        </svg>

        {/* Timer Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Time Display */}
          <div className="text-center">
            <div className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-mono ${
              timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          </div>

        </div>
      </div>

      {/* Phase Title below the ring to avoid overflow */}
      <div className="mt-2 sm:mt-3">
        <div className="text-center">
          <h3 className="text-xs sm:text-sm md:text-base font-semibold text-white uppercase tracking-wide leading-none truncate max-w-xs mx-auto">
            {config.title}
          </h3>
        </div>
      </div>

      {/* Low Time Warning below the ring to avoid overflow */}
      {timeRemaining <= 5 && (
        <div className="mt-2">
          <div className="text-center text-xs sm:text-sm text-red-400 font-semibold animate-pulse leading-none">
            {timeRemaining <= 3 ? 'HURRY!' : 'ENDING SOON!'}
          </div>
        </div>
      )}

      {/* Phase Progress Indicators */}
      <div className="flex justify-center mt-4 sm:mt-6 space-x-1 sm:space-x-2">
        <div className={`flex flex-col items-center ${phase === 'betting' ? 'text-gold-400' : 'text-gray-500'}`}>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 ${
            phase === 'betting' ? 'bg-gold-400' : 'bg-gray-600'
          }`} />
          <span className="text-xs font-medium hidden sm:block">Bet</span>
        </div>
        <div className={`flex flex-col items-center ${phase === 'spin_preparation' ? 'text-gold-400' : 'text-gray-500'}`}>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 ${
            phase === 'spin_preparation' ? 'bg-gold-400' : 'bg-gray-600'
          }`} />
          <span className="text-xs font-medium hidden sm:block">Prep</span>
        </div>
        <div className={`flex flex-col items-center ${phase === 'spinning' ? 'text-gold-400' : 'text-gray-500'}`}>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 ${
            phase === 'spinning' ? 'bg-gold-400' : 'bg-gray-600'
          }`} />
          <span className="text-xs font-medium hidden sm:block">Spin</span>
        </div>
        <div className={`flex flex-col items-center ${phase === 'result' ? 'text-gold-400' : 'text-gray-500'}`}>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 ${
            phase === 'result' ? 'bg-gold-400' : 'bg-gray-600'
          }`} />
          <span className="text-xs font-medium hidden sm:block">Result</span>
        </div>
        <div className={`flex flex-col items-center ${phase === 'transition' ? 'text-gold-400' : 'text-gray-500'}`}>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 ${
            phase === 'transition' ? 'bg-gold-400' : 'bg-gray-600'
          }`} />
          <span className="text-xs font-medium hidden sm:block">Next</span>
        </div>
      </div>

      {/* Mobile Phase Indicator */}
      <div className="sm:hidden mt-3">
        <div className="text-center">
          <span className="text-sm text-gray-400">
            {phase === 'betting' ? '1' : 
             phase === 'spin_preparation' ? '2' : 
             phase === 'spinning' ? '3' : 
             phase === 'result' ? '4' : '5'} of 5
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameTimer;