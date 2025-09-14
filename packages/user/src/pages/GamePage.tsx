import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { gameService } from '../services/gameService';
import { userService } from '../services/userService';
import GameWheel from '../components/GameWheel';
import BettingChips from '../components/BettingChips';
import BettingBoard from '../components/BettingBoard';
import GameControls from '../components/GameControls';
import GameTimer from '../components/GameTimer';
import LiveViewers from '../components/LiveViewers';
import ActivityBooster from '../components/ActivityBooster';
import LoadingSpinner from '../components/LoadingSpinner';
import TotalBetDisplay from '../components/TotalBetDisplay';
import ChipSelector from '../components/ChipSelector';
import { formatCurrency, GAME_CONFIG, expandBet, BET_TYPES } from '@win5x/common';
import { calculateIndividualBetAmounts } from '../utils/betCalculations';

const GamePage: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Game state
  const [selectedChip, setSelectedChip] = useState(20);
  // Persisted UI bets for the current round only
  const [uiBets, setUiBets] = useState<Record<string, number>>({});
  const [useGamingWallet, setUseGamingWallet] = useState(false);
  // Track total amount deducted for current round bets (for refund on clear)
  const [totalBetAmount, setTotalBetAmount] = useState(0);
  const lastRoundIdRef = useRef<string | null>(null);
  const winnerToastRoundRef = useRef<number | null>(null);
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [betDistribution, setBetDistribution] = useState<any>(null);
  const [timerState, setTimerState] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [previousRoundId, setPreviousRoundId] = useState<string | null>(null);
  const [autoRebet, setAutoRebet] = useState(false);
  const autoRebetRef = useRef(false);
  const lastBetsRef = useRef<Record<string, number>>({});
  // Schedule a one-time rebet for the NEXT round when user clicks Rebet
  const rebetOnceRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    autoRebetRef.current = autoRebet;
  }, [autoRebet]);

  useEffect(() => {
    lastBetsRef.current = lastBets;
  }, [lastBets]);

  // Fetch current game state
  const { data: currentGame, isLoading } = useQuery({
    queryKey: ['current-game'],
    queryFn: () => gameService.getCurrentRound(),
    refetchInterval: 30000,
  });

  const isBettingPhase = () => {
    const p = (timerState?.phase || gameState?.status || '').toString().toLowerCase();
    return p === 'betting';
  };

  // Calculate individual bet amounts for all numbers
  const individualBetAmounts = calculateIndividualBetAmounts(uiBets);
  
  // Get bet amount for a specific number
  const getNumberBetAmount = (number: number): number => {
    return individualBetAmounts[number] || 0;
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('round_update', (round) => {
      const incomingRoundId = (round && (round.id || (round as any).roundId)) || null;
      console.log('GamePage: Round update received', { 
        status: round.status, 
        roundNumber: round.roundNumber,
        roundId: incomingRoundId 
      });
      
      // Check if this is a new round (round ID changed)
      const isNewRound = previousRoundId !== null && incomingRoundId !== null && previousRoundId !== incomingRoundId;
      if (isNewRound || lastRoundIdRef.current === null || (incomingRoundId !== null && lastRoundIdRef.current !== incomingRoundId)) {
        console.log('GamePage: New round detected, resetting chip selection and bets');
        // Reset chip selection to default
        setSelectedChip(20);
        // Reset UI bets strictly at round change
        setUiBets({});
        // Reset total bet amount for new round
        setTotalBetAmount(0);
        lastRoundIdRef.current = incomingRoundId;
      }
      
      setPreviousRoundId(incomingRoundId);
      // Normalize game state to always include id
      setGameState({ id: incomingRoundId, ...round });
      
      const status = (round.status || '').toString().toLowerCase();
      if (status === 'spin_preparation') {
        console.log('GamePage: Spin preparation phase started', { roundId: round.id, roundNumber: round.roundNumber });
        setIsSpinning(false);
        setWinningNumber(null);
        // Defer auto rebet to BETTING phase to ensure server accepts bets
      } else if (status === 'spinning') {
        console.log('GamePage: Spinning phase started', { roundId: round.id, roundNumber: round.roundNumber });
        setIsSpinning(true);
        setWinningNumber(null);
        // No state change to bets here; we render bets tied to current round id
      } else if (status === 'result') {
        console.log('GamePage: Result phase started', { roundId: round.id, roundNumber: round.roundNumber });
        setWinningNumber(round.winningNumber);
        setIsSpinning(false);
        
        // Keep last bets for rebet convenience
        if (Object.keys(uiBets).length > 0) setLastBets({ ...uiBets });
        // We'll clear after transition only
      } else if (status === 'betting') {
        console.log('GamePage: Betting phase started', { roundId: round.id, roundNumber: round.roundNumber });
        setWinningNumber(null);
        setIsSpinning(false);
        // nothing to do for bets; we always render by round id
        // Small delay so backend is fully ready to accept bets for new round
        setTimeout(() => {
          if (!incomingRoundId) return;
          // Priority: one-time Rebet for next round if scheduled
          const scheduled = rebetOnceRef.current;
          if (scheduled && Object.keys(scheduled).length > 0) {
            emitBetsForRound(incomingRoundId, scheduled);
            rebetOnceRef.current = null; // consume one-time rebet
            return;
          }
          // Otherwise, apply Auto rebet if enabled
          if (autoRebetRef.current && Object.keys(lastBetsRef.current).length > 0) {
            emitBetsForRound(incomingRoundId, lastBetsRef.current);
          }
        }, 400);
      } else if (status === 'transition') {
        console.log('GamePage: Transition phase started', { roundId: round.id, roundNumber: round.roundNumber });
        setWinningNumber(null);
        setIsSpinning(false);
        setResultMessage(null);
        // Do not clear bets in transition; clear only when next round starts
      }
    });

    socket.on('round_winner', (result) => {
      console.log('GamePage: Winner revealed', { result });
      // Only set winning number when it's revealed (during result phase)
      setWinningNumber((prev) => (prev === null ? result.winningNumber : prev));
      
      // Show winner notification exactly once per round
      if (winnerToastRoundRef.current !== result.roundNumber) {
        winnerToastRoundRef.current = result.roundNumber;
        toast.success(`Round ${result.roundNumber} Winner: ${result.winningNumber}!`);
      }
      // Compute win/lose message for the user
      const shownBets = uiBets;
      const totalOnWinningNumber = Object.entries(shownBets)
        .filter(([k]) => k === `number_${result.winningNumber}`)
        .reduce((s, [, v]) => s + v, 0);
      if (totalOnWinningNumber > 0) {
        setResultMessage('Congratulations! You have winning bets');
      } else if (Object.keys(shownBets).length > 0) {
        setResultMessage('Better luck next time');
      } else {
        setResultMessage(null);
      }
    });

    socket.on('bet_distribution', (distribution) => {
      setBetDistribution(distribution);
    });

    socket.on('timer_update', (timer) => {
      setTimerState(timer);
    });

    socket.on('phase_update', (phaseUpdate) => {
      const phase = phaseUpdate.phase.toLowerCase();
      
      console.log('GamePage: Phase update received', { 
        phase: phaseUpdate.phase,
        timeRemaining: phaseUpdate.timeRemaining,
        roundNumber: phaseUpdate.roundNumber
      });
      
      setTimerState({
        phase: phase,
        timeRemaining: phaseUpdate.timeRemaining,
        roundNumber: phaseUpdate.roundNumber,
      });
    });

    socket.on('user_balance_update', (balanceUpdate) => {
      console.log('GamePage: Balance update received', balanceUpdate);
      // Update user balance in auth context
      if (setUser) {
        setUser(prev => prev ? {
          ...prev,
          walletBetting: balanceUpdate.bettingWallet !== undefined ? balanceUpdate.bettingWallet : prev.walletBetting,
          walletGaming: balanceUpdate.gamingWallet !== undefined ? balanceUpdate.gamingWallet : prev.walletGaming,
        } : null);
      }
    });

    socket.on('bet_placed', (bet) => {
      toast.success(`Bet placed: ₹${bet.amount} on ${bet.betType}`);
    });

    socket.on('error', (error) => {
      toast.error(error.message);
    });

    return () => {
      socket.off('round_update');
      socket.off('round_result');
      socket.off('round_winner');
      socket.off('bet_distribution');
      socket.off('timer_update');
      socket.off('phase_update');
      socket.off('user_balance_update');
      socket.off('bet_placed');
      socket.off('error');
    };
  }, [socket, uiBets, previousRoundId]);

  // Place bet with custom amount (for chip selector)
  const handleCustomBetPlacement = async (amount: number) => {
    // This function is called when user clicks the "Bet" button in custom input
    // The amount is already set as selectedChip, so we just need to log it
    console.log('Custom bet amount selected:', amount);
    // The actual bet placement will be handled when user clicks on a number/odd/even
  };

  // Place bet handler
  const handlePlaceBet = async (betType: string, betValue: string | number) => {
    console.log('GamePage: Attempting to place bet', {
      betType,
      betValue,
      gameStateStatus: gameState?.status,
      timerStatePhase: timerState?.phase,
      canBet
    });

    // Check if betting is allowed (this should be the only check needed)
    if (!canBet) {
      console.log('GamePage: Bet blocked - betting not allowed', { 
        gameStateStatus: gameState?.status,
        isConnected,
        canBet 
      });
      toast.error('Betting is not available right now');
      return;
    }

    // Check dual wallet balance logic
    if (!user) {
      toast.error('User not found');
      return;
    }

    const bettingWalletBalance = user.walletBetting || 0;
    const gamingWalletBalance = user.walletGaming || 0;
    const totalAvailable = bettingWalletBalance + gamingWalletBalance;

    if (totalAvailable < selectedChip) {
      toast.error('Insufficient total balance');
      return;
    }

    // Check if Gaming Wallet option should be available
    const shouldShowGamingWallet = bettingWalletBalance <= 10;
    
    if (useGamingWallet && !shouldShowGamingWallet) {
      toast.error('Gaming Wallet option is only available when Betting Wallet is ≤ ₹10');
      return;
    }

    if (useGamingWallet && totalAvailable < selectedChip) {
      toast.error('Insufficient combined balance for this bet');
      return;
    }

    if (!useGamingWallet && bettingWalletBalance < selectedChip) {
      toast.error('Insufficient Betting Wallet balance');
      return;
    }

    if (selectedChip <= 0) {
      toast.error('Please select a chip value');
      return;
    }

    try {
      // Support single, odd, and even bets
      if (betType !== 'single' && betType !== 'odd' && betType !== 'even') {
        toast.error('Only single number and odd/even bets are supported');
        return;
      }
      const betKey = `${betType}_${betValue}`;
      const currentAmount = (uiBets[betKey] || 0);
      
      // Place bet via socket
      socket?.emit('place_bet', {
        roundId: gameState.id,
        betType,
        betValue,
        amount: selectedChip,
        useGamingWallet: useGamingWallet,
      });

      // Update UI bets immediately for UX
      setUiBets(prev => ({ ...prev, [betKey]: currentAmount + selectedChip }));
      
      // Track total bet amount for potential refund
      setTotalBetAmount(prev => prev + selectedChip);

    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  // Emit bets for a specific round id
  const emitBetsForRound = (roundId: string, betsMap: Record<string, number>) => {
    if (!socket) return;
    const entries = Object.entries(betsMap);
    // Frontend guard for bulk operations
    const categorize = (t: string): 'number' | 'color' | 'odd_even' => {
      const k = t.toLowerCase();
      if (k === 'number') return 'number';
      if (k === 'color') return 'color';
      return 'odd_even';
    };
    const bulkCats = new Set(entries.map(([k]) => categorize(k.split('_')[0])));
    if (bulkCats.size > 2) {
      toast.error('Your selection spans more than two categories; adjust and try again');
      return;
    }
    for (const [key, amount] of entries) {
      const [betType, betValue] = key.split('_');
      const parsedValue = isNaN(Number(betValue)) ? betValue : Number(betValue);
      if (amount > 0) {
        socket.emit('place_bet', {
          roundId,
          betType,
          betValue: parsedValue,
          amount,
        });
      }
    }
    // Merge into UI bets for the current round
    setUiBets(prev => {
      const next = { ...prev } as Record<string, number>;
      for (const [k, a] of entries) next[k] = (next[k] || 0) + (a as number);
      return next;
    });
    
    // Track total bet amount for potential refund
    const totalAmount = entries.reduce((sum, [, amount]) => sum + (amount as number), 0);
    setTotalBetAmount(prev => prev + totalAmount);
  };

  // Bulk place multiple bets (used by Rebet/2x/Auto)
  const bulkPlaceBets = (betsMap: Record<string, number>, explicitRoundId?: string) => {
    const roundId = explicitRoundId || gameState?.id;
    if (!canBet || !socket || !roundId) return;
    emitBetsForRound(roundId, betsMap);
  };

  // Clear all bets
  const handleClearBets = async () => {
    if (totalBetAmount > 0) {
      try {
        // Refund the bet amount back to user's wallet
        await userService.refundBet(totalBetAmount, useGamingWallet);
        
        // Update user balance in real-time
        if (setUser) {
          setUser(prev => prev ? {
            ...prev,
            walletBetting: prev.walletBetting + totalBetAmount,
          } : null);
        }
        
        toast.success(`All bets cleared and ₹${totalBetAmount} refunded`);
      } catch (error) {
        console.error('Failed to refund bet amount:', error);
        toast.error('Failed to refund bet amount');
      }
    }
    
    setUiBets({});
    setTotalBetAmount(0);
    // Also clear chip selection so no chip appears active
    setSelectedChip(0);
    
    if (totalBetAmount === 0) {
      toast.success('All bets cleared');
    }
  };

  // Undo last bet
  const handleUndoLastBet = () => {
    const betKeys = Object.keys(uiBets);
    if (betKeys.length === 0) return;

    const lastBetKey = betKeys[betKeys.length - 1];
    const newBets: Record<string, number> = { ...uiBets };
    
    if (newBets[lastBetKey] > selectedChip) {
      newBets[lastBetKey] -= selectedChip;
    } else {
      delete newBets[lastBetKey];
    }
    
    setUiBets(newBets);
    toast.success('Last bet undone');
  };

  // Rebet schedules your selected (last round or current) bets to be placed at the next betting phase
  const handleRebetLast = () => {
    const source = Object.keys(lastBets).length > 0 ? lastBets : uiBets;
    if (Object.keys(source).length === 0) {
      toast.error('No bets to repeat');
      return;
    }
    rebetOnceRef.current = { ...source };
    toast.success('Rebet scheduled for next round');
  };

  const handleDoubleBets = () => {
    if (Object.keys(uiBets).length === 0) {
      toast.error('No current bets to 2x');
      return;
    }
    const doubled: Record<string, number> = {};
    for (const [k, a] of Object.entries(uiBets)) doubled[k] = a as number; // add same amounts again
    bulkPlaceBets(doubled);
    toast.success('Bets doubled (2x)');
  };

  // Allow betting only during BETTING phase and more than 1s remaining
  const canBet = Boolean(isConnected && (timerState?.phase === 'betting') && (Number(timerState?.timeRemaining || 0) > 1));
  
  // Debug logging for betting state
  console.log('GamePage: Betting state', {
    gameStateStatus: gameState?.status,
    isConnected,
    canBet,
    timerStatePhase: timerState?.phase,
    currentBets: Object.keys(uiBets).length
  });
  const hasBets = Object.keys(uiBets).length > 0;
  const hasLastBets = Object.keys(lastBets).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gold-400">Win5x</h1>
            <div className="hidden sm:flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-xs font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right">
              <div className="text-xs sm:text-sm text-gray-400">Betting Wallet</div>
              <div className="text-sm sm:text-base font-bold text-green-400">
                {formatCurrency(user?.walletBetting ?? 0)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm text-gray-400">Gaming Wallet</div>
              <div className="text-sm sm:text-base font-bold text-gold-400">
                {formatCurrency(user?.walletGaming ?? 0)}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="px-2 sm:px-3 py-1 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm rounded font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 flex gap-4 sm:gap-6">
        {/* Main Game Area */}
        <main className="flex-1 space-y-4 sm:space-y-6">
        {/* Wheel at the Top */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 shadow-lg flex flex-col items-center">
          <GameWheel
            gamePhase={timerState?.phase || gameState?.status}
            winningNumber={winningNumber}
            onSpinComplete={() => setIsSpinning(false)}
            showWinnerLabel={false}
          />
          {/* Centered Winner under Wheel */}
          { ((timerState?.phase || gameState?.status) === 'result') && winningNumber !== null && (
            <div className="mt-6 w-full max-w-sm">
              <div className={`px-4 py-2 rounded-full text-white font-bold text-xl shadow-lg text-center ${
                (winningNumber % 2 === 0) ? 'bg-red-600' : 'bg-gray-900'
              }`}>
                Winner: {winningNumber}
              </div>
            </div>
          )}
          {/* Round number removed per request */}
        </div>

        {/* Timer under the wheel */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
          <GameTimer
            phase={timerState?.phase || gameState?.status}
            timeRemaining={timerState?.timeRemaining || 0}
            roundNumber={gameState?.roundNumber || 0}
            gameState={gameState}
            canBet={canBet}
            isConnected={isConnected}
            betCount={Object.keys(uiBets).length}
          />
        </div>

        {/* Number Selector */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg relative">
          <BettingBoard
            selectedChip={selectedChip}
            bets={uiBets}
            onPlaceBet={handlePlaceBet}
            disabled={!canBet}
            getNumberBetAmount={getNumberBetAmount}
          />
          {!canBet && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-gray-900/80 border border-gray-700 text-xs sm:text-sm text-gold-300">Betting closed</div>
            </div>
          )}
          {resultMessage && (timerState?.phase || gameState?.status) !== 'result' && (
            <div className="p-3 text-center">
              <div className={`inline-block px-4 py-2 rounded-full text-sm sm:text-base font-semibold ${
                resultMessage.startsWith('Congrat') ? 'bg-green-600 text-white' : 'bg-gray-700 text-gold-300'
              }`}>
                {resultMessage}
              </div>
            </div>
          )}
        </div>

        {/* Total Bet Display */}
        <TotalBetDisplay 
          bets={uiBets} 
          className="mb-4"
          showDetails={true}
        />

        {/* Gaming Wallet Toggle */}
        {user && (user.walletBetting || 0) <= 10 && (user.walletGaming || 0) > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useGamingWallet"
                    checked={useGamingWallet}
                    onChange={(e) => setUseGamingWallet(e.target.checked)}
                    className="w-4 h-4 text-gold-500 bg-gray-700 border-gray-600 rounded focus:ring-gold-500 focus:ring-2"
                  />
                  <label htmlFor="useGamingWallet" className="text-sm font-medium text-gray-300">
                    Use Gaming Wallet
                  </label>
                </div>
                <div className="text-xs text-gray-400">
                  Combine both wallets for this bet
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Available</div>
                <div className="text-sm font-semibold text-gold-400">
                  {formatCurrency((user.walletBetting || 0) + (user.walletGaming || 0))}
                </div>
              </div>
            </div>
            {useGamingWallet && (
              <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="text-xs text-yellow-300">
                  <strong>Warning:</strong> If you win, the full payout goes to your Betting Wallet and Gaming Wallet becomes ₹0. 
                  If you lose, you'll receive 10% cashback in your Gaming Wallet.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chip Selector */}
        <ChipSelector
          selectedChip={selectedChip}
          onChipSelect={setSelectedChip}
          onPlaceBet={handleCustomBetPlacement}
          disabled={!canBet}
          className="mb-4"
        />

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 shadow-lg">
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <motion.button
              className="min-h-11 p-2 rounded-lg font-bold text-sm bg-gold-500 text-black"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRebetLast}
              disabled={!canBet || (!hasLastBets && !hasBets)}
              aria-label="Rebet"
            >
              Rebet
            </motion.button>
            <motion.button
              className="min-h-11 p-2 rounded-lg font-bold text-sm bg-blue-500 text-white"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDoubleBets}
              disabled={!canBet || !hasBets}
              aria-label="Double bets"
            >
              2x
            </motion.button>
            <motion.button
              className={`min-h-11 p-2 rounded-lg font-bold text-sm ${autoRebet ? 'bg-green-600 text-white' : 'bg-gray-700 text-white border border-gray-500'}`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setAutoRebet((v) => !v)}
              aria-pressed={autoRebet}
              aria-label="Auto rebet toggle"
            >
              Auto
            </motion.button>
            <motion.button
              className="min-h-11 p-2 rounded-lg font-bold text-sm bg-red-600 text-white"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClearBets}
              disabled={!hasBets}
              aria-label="Clear bets"
            >
              Clear
            </motion.button>
          </div>
          <div className="text-[10px] sm:text-xs text-center text-gray-400 mt-2">
            Auto rebet repeats previous bets when a new round starts
          </div>
        </div>


        {/* Live Activity at the Bottom */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg md:max-h-64 overflow-auto">
          <LiveViewers />
        </div>
        </main>

      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto mb-4"></div>
            <p className="text-white">Loading game...</p>
          </div>
        </div>
      )}

      {/* Removed modal to avoid duplicate notifications */}
    </div>
  );
};

export default GamePage;