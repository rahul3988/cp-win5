import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gameService } from '../services/gameService';

type GamePhase = 'betting' | 'spin_preparation' | 'spinning' | 'result' | 'transition';

interface GameWheelProps {
  gamePhase: GamePhase;
  winningNumber: number | null; // fallback if API fails
  onSpinComplete?: () => void;
  showWinnerLabel?: boolean;
}

const SEGMENTS = 10;
const SEGMENT_DEGREES = 360 / SEGMENTS; // 36°
const FULL_ROTATIONS = 7; // exact whole rotations
const ANIMATION_DURATION_MS = 12000;
const ALIGNMENT_OFFSET_DEGREES = 0; // tweak if pointer artwork is visually offset
const TOLERANCE_DEGREES = 1; // final snap tolerance

const wheelNumbers = Array.from({ length: SEGMENTS }, (_, i) => i);
const getNumberAngle = (n: number) => n * SEGMENT_DEGREES;
const normalize = (deg: number) => ((deg % 360) + 360) % 360;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const GameWheel: React.FC<GameWheelProps> = ({ 
  gamePhase,
  winningNumber, 
  onSpinComplete,
  showWinnerLabel = true,
}) => {
  const [rotation, setRotation] = useState(0);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  const [preCalculatedWinningNumber, setPreCalculatedWinningNumber] = useState<number | null>(null);
  const animationRef = useRef<number | null>(null);

  // Smoothly reset wheel back to 0° over a duration (used during transition)
  const smoothResetToZero = (durationMs: number = 3000) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const startTime = Date.now();
    const startAngle = rotation;
    // Rotate forward (clockwise) to the next 0° alignment to avoid any snap
    const currentNorm = normalize(startAngle);
    const forwardDelta = (360 - currentNorm) % 360; // 0 if already aligned
    const targetAngle = startAngle + forwardDelta; // keep absolute angle increasing

    const animateBack = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      const current = startAngle + (targetAngle - startAngle) * eased;
      setRotation(current);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateBack);
    } else {
        setRotation(targetAngle);
      }
    };

    animationRef.current = requestAnimationFrame(animateBack);
  };

  // Handle phase-based resets and transitions
  useEffect(() => {
    if (gamePhase === 'betting') {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setRotation(0);
      setHighlightedSegment(null);
      setPreCalculatedWinningNumber(null);
    } else if (gamePhase === 'transition') {
      // Start a smooth return to 0° over 3 seconds
      setHighlightedSegment(null);
      smoothResetToZero(3000);
    }
  }, [gamePhase]);

  // Fetch winning number during spin preparation
  useEffect(() => {
    const fetchWinning = async () => {
      if (gamePhase === 'spin_preparation') {
        try {
          const res = await gameService.getWinningNumber();
          setPreCalculatedWinningNumber(res.winningNumber);
        } catch {
          setPreCalculatedWinningNumber(winningNumber ?? null);
        }
      }
    };
    fetchWinning();
  }, [gamePhase, winningNumber]);

  // Highlight the winner in result phase
  useEffect(() => {
    setHighlightedSegment(
      gamePhase === 'result' && (preCalculatedWinningNumber ?? winningNumber) != null
        ? (preCalculatedWinningNumber ?? (winningNumber as number))
        : null
    );
  }, [gamePhase, preCalculatedWinningNumber, winningNumber]);

  // Compute mathematically exact target rotation (clockwise, pointer at top 0°)
  const computeTargetRotation = (winNum: number) => {
    const pos = normalize(getNumberAngle(winNum) - ALIGNMENT_OFFSET_DEGREES);
    return FULL_ROTATIONS * 360 - pos;
  };

  // Start spin with manual rAF timing + easing + invisible teleportation correction
  const startSpin = (winNum: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const targetRotation = computeTargetRotation(winNum);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const eased = easeOutCubic(progress);
      const current = eased * targetRotation;

      // Invisible teleportation blending near the end for pixel-perfect centering
      let corrected = current;
      if (progress > 0.95) {
        const ideal = targetRotation;
        const blendT = (progress - 0.95) / 0.05;
        const blend = easeOutCubic(Math.max(0, Math.min(1, blendT)));
        corrected = current + (ideal - current) * blend;
      }

      setRotation(corrected);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Final snap for absolute precision (covers any floating-point residue)
        const normalizedFinal = normalize(targetRotation);
        const expected = normalize(getNumberAngle(winNum) - ALIGNMENT_OFFSET_DEGREES);
            const delta = Math.min(
          Math.abs(normalizedFinal - expected),
          360 - Math.abs(normalizedFinal - expected)
        );
        setRotation(delta <= TOLERANCE_DEGREES ? targetRotation : targetRotation + (expected - normalizedFinal));
        onSpinComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Trigger spin when entering spinning phase
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (gamePhase === 'spinning') {
      const win = preCalculatedWinningNumber ?? winningNumber;
      if (typeof win === 'number') startSpin(win);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gamePhase, preCalculatedWinningNumber, winningNumber]);

  return (
    <div className="relative flex items-center justify-center w-full max-w-full">
      <div className="relative w-full max-w-[360px] sm:max-w-[420px] md:max-w-[480px]">
        {/* Top pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="relative" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}>
            {/* Arrow shaft (white outline) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 14,
                height: 18,
                background: 'rgba(255,255,255,0.98)',
                borderRadius: 3
              }}
            />
            {/* Arrow shaft (gold) */}
            <div
              style={{
                position: 'absolute',
                top: 1,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 10,
                height: 16,
                background: '#D4AF37',
                borderRadius: 2
              }}
            />
            {/* Arrow tip (white outline) */}
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '16px solid transparent',
                borderRight: '16px solid transparent',
                borderTop: '18px solid rgba(255,255,255,0.98)'
              }}
            />
            {/* Arrow tip (gold) */}
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '14px solid #D4AF37'
              }}
            />
            {/* Inner depth shade on tip */}
            <div
              style={{
                position: 'absolute',
                top: 22,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid #B8860B'
              }}
            />
          </div>
        </div>

        {/* Wheel */}
        <motion.div
          className="wheel-container relative w-full aspect-square"
          animate={{ rotate: rotation }}
          transition={{ duration: 0, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {wheelNumbers.map((n) => {
              const angle = getNumberAngle(n);
              const isRed = n % 2 === 0;
            return (
                <div key={n} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                <div
                  className={`absolute w-full h-1/2 origin-bottom border-r border-gold-400 transition-all duration-500 ${
                      highlightedSegment === n ? 'ring-4 ring-gold-300 ring-opacity-80 shadow-lg' : ''
                    } ${isRed ? 'bg-red-600' : 'bg-gray-900'}`}
                    style={{ clipPath: 'polygon(30% 0%, 70% 0%, 50% 100%)' }}
                  />
                  {highlightedSegment === n && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
                    <div className="w-3 h-3 bg-gold-400 rounded-full animate-pulse shadow-lg border-2 border-white" />
                  </div>
                )}
                  <div
                    className={`absolute font-extrabold text-2xl transition-all duration-500 ${
                      highlightedSegment === n ? 'text-gold-300 drop-shadow-lg' : 'text-white'
                    }`}
                    style={{ top: '10%', left: '50%', transform: 'translate(-50%, 0) rotate(0deg)' }}
                  >
                    {n}
                  </div>
              </div>
            );
            })}
            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gold-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-4 border-gold-600 shadow-lg z-10">
              <div className="w-full h-full bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-gold-700 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Outer ring + glow */}
        <div className="absolute inset-0 w-full h-full rounded-full border-8 border-gold-400 shadow-2xl pointer-events-none" />
        <div className="absolute inset-0 w-full h-full rounded-full glow-gold opacity-50 pointer-events-none" />
      </div>

      {/* Winner label (optional) */}
      {showWinnerLabel && gamePhase === 'result' && (preCalculatedWinningNumber ?? winningNumber) != null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-full max-w-xs"
        >
          <div className={`px-4 py-2 rounded-full text-white font-bold text-xl shadow-lg text-center ${
            ((preCalculatedWinningNumber ?? (winningNumber as number)) % 2 === 0) ? 'bg-red-600' : 'bg-gray-900'
          }`}>
            Winner: {preCalculatedWinningNumber ?? winningNumber}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameWheel;


