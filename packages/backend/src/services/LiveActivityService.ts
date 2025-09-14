import { RedisService } from './RedisService';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface LiveActivityEvent {
  type: 'bet_placed' | 'user_joined' | 'user_left';
  username: string;
  betType?: string;
  betValue?: string | number;
  amount?: number;
  timestamp: Date;
}

export interface LiveStats {
  currentPlayers: number;
  peakToday: number;
  totalBets: number;
  recentActivity: LiveActivityEvent[];
}

export class LiveActivityService extends EventEmitter {
  private redis: RedisService;
  private currentPlayers: Set<string> = new Set();
  private peakToday: number = 0;
  private totalBets: number = 0;
  private recentActivity: LiveActivityEvent[] = [];
  private activityUpdateInterval: NodeJS.Timeout | null = null;

  constructor(redis: RedisService) {
    super();
    this.redis = redis;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load existing stats from Redis
      const savedStats = await this.redis.get('live_stats');
      if (savedStats) {
        // RedisService.get() already parses JSON, so we don't need to parse again
        const stats = savedStats as any;
        this.peakToday = stats.peakToday || 0;
        this.totalBets = stats.totalBets || 0;
      }

      // Start activity update interval (2 bet names per second)
      this.activityUpdateInterval = setInterval(() => {
        this.emitActivityUpdate();
      }, 500); // Every 500ms = 2 updates per second

      logger.info('Live Activity Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Live Activity Service:', error);
    }
  }

  // User joins the game
  userJoined(userId: string, username: string): void {
    this.currentPlayers.add(userId);
    
    const event: LiveActivityEvent = {
      type: 'user_joined',
      username,
      timestamp: new Date(),
    };

    this.addActivityEvent(event);
    this.updatePeakToday();
    this.emitStatsUpdate();
  }

  // User leaves the game
  userLeft(userId: string, username: string): void {
    this.currentPlayers.delete(userId);
    
    const event: LiveActivityEvent = {
      type: 'user_left',
      username,
      timestamp: new Date(),
    };

    this.addActivityEvent(event);
    this.emitStatsUpdate();
  }

  // Bet placed
  betPlaced(userId: string, username: string, betType: string, betValue: string | number, amount: number): void {
    this.totalBets++;
    
    const event: LiveActivityEvent = {
      type: 'bet_placed',
      username,
      betType,
      betValue,
      amount,
      timestamp: new Date(),
    };

    this.addActivityEvent(event);
    this.emitStatsUpdate();
  }

  private addActivityEvent(event: LiveActivityEvent): void {
    // Check for duplicate events (same user, same type, within 1 second)
    const recentEvent = this.recentActivity.find(prev => 
      prev.username === event.username && 
      prev.type === event.type && 
      Math.abs(prev.timestamp.getTime() - event.timestamp.getTime()) < 1000
    );
    
    if (recentEvent) {
      return; // Skip duplicate event
    }
    
    this.recentActivity.push(event);
    
    // Keep only last 50 events
    if (this.recentActivity.length > 50) {
      this.recentActivity = this.recentActivity.slice(-50);
    }
  }

  private updatePeakToday(): void {
    const currentCount = this.currentPlayers.size;
    if (currentCount > this.peakToday) {
      this.peakToday = currentCount;
      logger.info(`New peak today: ${this.peakToday} players`);
    }
  }

  private emitActivityUpdate(): void {
    if (this.recentActivity.length > 0) {
      // Get the most recent activity event
      const latestEvent = this.recentActivity[this.recentActivity.length - 1];
      this.emit('activity_update', latestEvent);
    }
  }

  private emitStatsUpdate(): void {
    const stats: LiveStats = {
      currentPlayers: this.currentPlayers.size,
      peakToday: this.peakToday,
      totalBets: this.totalBets,
      recentActivity: this.recentActivity.slice(-10), // Last 10 events
    };

    // Save to Redis
    this.redis.set('live_stats', JSON.stringify(stats), 3600); // 1 hour cache
    
    this.emit('stats_update', stats);
  }

  // Get current stats
  getStats(): LiveStats {
    return {
      currentPlayers: this.currentPlayers.size,
      peakToday: this.peakToday,
      totalBets: this.totalBets,
      recentActivity: this.recentActivity.slice(-10),
    };
  }

  // Reset daily stats (call this daily)
  resetDailyStats(): void {
    this.peakToday = 0;
    this.totalBets = 0;
    this.recentActivity = [];
    this.emitStatsUpdate();
  }

  // Cleanup
  destroy(): void {
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
    }
  }
}

