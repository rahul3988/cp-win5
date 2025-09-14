import { EventEmitter } from 'events';
import { GamePhase, GAME_CONFIG } from '@win5x/common';
import { logger } from '../utils/logger';

export interface PhaseUpdate {
  phase: GamePhase;
  timeRemaining: number;
  roundNumber: number;
  phaseStartTime: Date;
  phaseEndTime: Date;
}

export class GamePhaseManager extends EventEmitter {
  private currentPhase: GamePhase = GamePhase.BETTING;
  private currentRoundNumber: number = 1;
  private timeRemaining: number = GAME_CONFIG.DEFAULT_BETTING_DURATION;
  private phaseStartTime: Date = new Date();
  private phaseEndTime: Date = new Date(Date.now() + GAME_CONFIG.DEFAULT_BETTING_DURATION * 1000);
  private phaseTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private winningNumber: number | null = null;
  private betDistribution: Record<string, number> = {};
  private forcedWin: { number: number; targetRound?: number } | null = null;

  constructor() {
    super();
    // Removed auto-start to prevent race conditions
    // this.startPhaseCycle();
  }

  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  public getCurrentRoundNumber(): number {
    return this.currentRoundNumber;
  }

  public getWinningNumber(): number | null {
    return this.winningNumber;
  }

  public getPhaseUpdate(): PhaseUpdate {
    return {
      phase: this.currentPhase,
      timeRemaining: this.timeRemaining,
      roundNumber: this.currentRoundNumber,
      phaseStartTime: this.phaseStartTime,
      phaseEndTime: this.phaseEndTime,
    };
  }

  public setWinningNumber(winningNumber: number): void {
    this.winningNumber = winningNumber;
    logger.info(`Winning number set to: ${winningNumber}`);
  }

  public forceNextWinningNumber(number: number, targetRoundNumber?: number): void {
    this.forcedWin = { number, targetRound: targetRoundNumber };
    logger.warn(`Forcing winning number ${number} for ${targetRoundNumber ? 'round ' + targetRoundNumber : 'next round'}`);
  }

  public setBetDistribution(distribution: Record<string, number>): void {
    this.betDistribution = distribution;
  }

  public getBetDistribution(): Record<string, number> {
    return this.betDistribution;
  }

  public startPhaseCycle(): void {
    if (this.isRunning) {
      this.stopPhaseCycle();
    }

    this.isRunning = true;
    this.currentPhase = GamePhase.BETTING;
    this.timeRemaining = GAME_CONFIG.DEFAULT_BETTING_DURATION;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + GAME_CONFIG.DEFAULT_BETTING_DURATION * 1000);
    this.winningNumber = null;

    logger.info(`Starting new round ${this.currentRoundNumber} - Phase: ${this.currentPhase}`);
    this.emitPhaseUpdate();
    this.startPhaseTimer();
  }

  public stopPhaseCycle(): void {
    this.isRunning = false;
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = null;
    }
    logger.info('Game phase cycle stopped');
  }

  private startPhaseTimer(): void {
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
    }

    this.phaseTimer = setInterval(() => {
      this.timeRemaining--;

      if (this.timeRemaining <= 0) {
        this.transitionToNextPhase();
      } else {
        this.emitPhaseUpdate();
      }
    }, 1000);
  }

  private transitionToNextPhase(): void {
    switch (this.currentPhase) {
      case GamePhase.BETTING:
        this.transitionToSpinPreparation();
        break;
      case GamePhase.SPIN_PREPARATION:
        this.transitionToSpinning();
        break;
      case GamePhase.SPINNING:
        this.transitionToResult();
        break;
      case GamePhase.RESULT:
        this.transitionToTransition();
        break;
      case GamePhase.TRANSITION:
        this.transitionToNewRound();
        break;
    }
  }

  private transitionToSpinPreparation(): void {
    this.currentPhase = GamePhase.SPIN_PREPARATION;
    this.timeRemaining = GAME_CONFIG.DEFAULT_SPIN_PREPARATION_DURATION;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + GAME_CONFIG.DEFAULT_SPIN_PREPARATION_DURATION * 1000);

    logger.info(`Phase transition: BETTING → SPIN_PREPARATION (Round ${this.currentRoundNumber})`);
    this.emitPhaseUpdate();
    // If admin forced a win, set it now
    if (this.forcedWin && (!this.forcedWin.targetRound || this.currentRoundNumber === this.forcedWin.targetRound)) {
      this.winningNumber = this.forcedWin.number;
      this.forcedWin = null; // one-time
    }

    this.emit('phase_transition', {
      from: GamePhase.BETTING,
      to: GamePhase.SPIN_PREPARATION,
      roundNumber: this.currentRoundNumber,
    });
  }

  private transitionToSpinning(): void {
    this.currentPhase = GamePhase.SPINNING;
    this.timeRemaining = GAME_CONFIG.DEFAULT_SPINNING_DURATION;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + GAME_CONFIG.DEFAULT_SPINNING_DURATION * 1000);

    logger.info(`Phase transition: SPIN_PREPARATION → SPINNING (Round ${this.currentRoundNumber})`);
    this.emitPhaseUpdate();
    this.emit('phase_transition', {
      from: GamePhase.SPIN_PREPARATION,
      to: GamePhase.SPINNING,
      roundNumber: this.currentRoundNumber,
    });
  }

  private transitionToResult(): void {
    this.currentPhase = GamePhase.RESULT;
    this.timeRemaining = GAME_CONFIG.DEFAULT_RESULT_DURATION;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + GAME_CONFIG.DEFAULT_RESULT_DURATION * 1000);

    logger.info(`Phase transition: SPINNING → RESULT (Round ${this.currentRoundNumber})`);
    this.emitPhaseUpdate();
    this.emit('phase_transition', {
      from: GamePhase.SPINNING,
      to: GamePhase.RESULT,
      roundNumber: this.currentRoundNumber,
      winningNumber: this.winningNumber,
    });
  }

  private transitionToTransition(): void {
    this.currentPhase = GamePhase.TRANSITION;
    this.timeRemaining = GAME_CONFIG.DEFAULT_TRANSITION_DURATION;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + GAME_CONFIG.DEFAULT_TRANSITION_DURATION * 1000);

    logger.info(`Phase transition: RESULT → TRANSITION (Round ${this.currentRoundNumber})`);
    this.emitPhaseUpdate();
    this.emit('phase_transition', {
      from: GamePhase.RESULT,
      to: GamePhase.TRANSITION,
      roundNumber: this.currentRoundNumber,
    });
  }

  private transitionToNewRound(): void {
    this.currentRoundNumber++;
    this.currentPhase = GamePhase.BETTING;
    this.timeRemaining = GAME_CONFIG.DEFAULT_BETTING_DURATION;
    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + GAME_CONFIG.DEFAULT_BETTING_DURATION * 1000);
    this.winningNumber = null;
    this.betDistribution = {};

    logger.info(`Phase transition: TRANSITION → BETTING (New Round ${this.currentRoundNumber})`);
    this.emitPhaseUpdate();
    this.emit('phase_transition', {
      from: GamePhase.TRANSITION,
      to: GamePhase.BETTING,
      roundNumber: this.currentRoundNumber,
    });
  }

  private emitPhaseUpdate(): void {
    const phaseUpdate: PhaseUpdate = {
      phase: this.currentPhase,
      timeRemaining: this.timeRemaining,
      roundNumber: this.currentRoundNumber,
      phaseStartTime: this.phaseStartTime,
      phaseEndTime: this.phaseEndTime,
    };

    this.emit('phase_update', phaseUpdate);
    logger.debug(`Phase update: ${this.currentPhase} - ${this.timeRemaining}s remaining`);
  }

  public forcePhaseTransition(targetPhase: GamePhase): void {
    if (!this.isRunning) {
      logger.warn('Cannot force phase transition - game is not running');
      return;
    }

    const previousPhase = this.currentPhase;
    this.currentPhase = targetPhase;

    switch (targetPhase) {
      case GamePhase.BETTING:
        this.timeRemaining = GAME_CONFIG.DEFAULT_BETTING_DURATION;
        break;
      case GamePhase.SPIN_PREPARATION:
        this.timeRemaining = GAME_CONFIG.DEFAULT_SPIN_PREPARATION_DURATION;
        break;
      case GamePhase.SPINNING:
        this.timeRemaining = GAME_CONFIG.DEFAULT_SPINNING_DURATION;
        break;
      case GamePhase.RESULT:
        this.timeRemaining = GAME_CONFIG.DEFAULT_RESULT_DURATION;
        break;
      case GamePhase.TRANSITION:
        this.timeRemaining = GAME_CONFIG.DEFAULT_TRANSITION_DURATION;
        break;
    }

    this.phaseStartTime = new Date();
    this.phaseEndTime = new Date(Date.now() + this.timeRemaining * 1000);

    logger.info(`Forced phase transition: ${previousPhase} → ${targetPhase}`);
    this.emitPhaseUpdate();
    this.emit('phase_transition', {
      from: previousPhase,
      to: targetPhase,
      roundNumber: this.currentRoundNumber,
      forced: true,
    });
  }

  public destroy(): void {
    this.stopPhaseCycle();
    this.removeAllListeners();
    logger.info('GamePhaseManager destroyed');
  }
}
