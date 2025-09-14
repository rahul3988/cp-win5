import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export interface WithdrawalAttempt {
  userId: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

export class WithdrawalSecurityService {
  private readonly maxAttempts = 5;
  private readonly lockoutDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
  private attempts: Map<string, WithdrawalAttempt[]> = new Map();

  constructor(private prisma: PrismaClient) {}

  /**
   * Verify user password for withdrawal
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, username: true },
      });

      if (!user) {
        logger.warn(`Withdrawal password verification failed: User not found (${userId})`);
        return false;
      }

      const isValid = await bcrypt.compare(password, user.password);
      
      if (isValid) {
        logger.info(`Withdrawal password verification successful: ${user.username} (${userId})`);
      } else {
        logger.warn(`Withdrawal password verification failed: Invalid password for ${user.username} (${userId})`);
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying withdrawal password:', error);
      return false;
    }
  }

  /**
   * Check if user is locked out due to too many failed attempts
   */
  async isUserLockedOut(userId: string, ipAddress: string): Promise<{ locked: boolean; remainingTime?: number; attemptsLeft?: number }> {
    const now = new Date();
    const userKey = `${userId}-${ipAddress}`;
    const attempts = this.attempts.get(userKey) || [];

    // Filter attempts within the lockout window
    const recentAttempts = attempts.filter(
      attempt => now.getTime() - attempt.timestamp.getTime() < this.lockoutDuration
    );

    // Update the attempts map
    this.attempts.set(userKey, recentAttempts);

    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    
    if (failedAttempts.length >= this.maxAttempts) {
      const oldestFailedAttempt = failedAttempts[0];
      const remainingTime = this.lockoutDuration - (now.getTime() - oldestFailedAttempt.timestamp.getTime());
      
      return {
        locked: true,
        remainingTime: Math.max(0, remainingTime)
      };
    }

    return {
      locked: false,
      attemptsLeft: this.maxAttempts - failedAttempts.length
    };
  }

  /**
   * Record a withdrawal attempt
   */
  async recordAttempt(
    userId: string, 
    ipAddress: string, 
    success: boolean, 
    failureReason?: string
  ): Promise<void> {
    const userKey = `${userId}-${ipAddress}`;
    const attempts = this.attempts.get(userKey) || [];
    
    const attempt: WithdrawalAttempt = {
      userId,
      ipAddress,
      timestamp: new Date(),
      success,
      failureReason
    };

    attempts.push(attempt);
    this.attempts.set(userKey, attempts);

    // Log the attempt
    if (success) {
      logger.info(`Withdrawal attempt recorded: SUCCESS - User ${userId} from IP ${ipAddress}`);
    } else {
      logger.warn(`Withdrawal attempt recorded: FAILED - User ${userId} from IP ${ipAddress}, Reason: ${failureReason || 'Unknown'}`);
    }

    // Clean up old attempts (older than 1 hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const cleanedAttempts = attempts.filter(attempt => attempt.timestamp > oneHourAgo);
    this.attempts.set(userKey, cleanedAttempts);
  }

  /**
   * Get withdrawal attempt statistics for admin monitoring
   */
  async getAttemptStats(userId?: string): Promise<{
    totalAttempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    lockedUsers: string[];
    recentAttempts: WithdrawalAttempt[];
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let allAttempts: WithdrawalAttempt[] = [];
    
    // Collect all attempts from the last hour
    for (const [userKey, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(attempt => attempt.timestamp > oneHourAgo);
      allAttempts = allAttempts.concat(recentAttempts);
    }

    // Filter by userId if specified
    if (userId) {
      allAttempts = allAttempts.filter(attempt => attempt.userId === userId);
    }

    const failedAttempts = allAttempts.filter(attempt => !attempt.success);
    const successfulAttempts = allAttempts.filter(attempt => attempt.success);
    
    // Find locked users
    const lockedUsers: string[] = [];
    for (const [userKey, attempts] of this.attempts.entries()) {
      const recentFailedAttempts = attempts.filter(
        attempt => !attempt.success && attempt.timestamp > oneHourAgo
      );
      
      if (recentFailedAttempts.length >= this.maxAttempts) {
        const userId = userKey.split('-')[0];
        if (!lockedUsers.includes(userId)) {
          lockedUsers.push(userId);
        }
      }
    }

    return {
      totalAttempts: allAttempts.length,
      failedAttempts: failedAttempts.length,
      successfulAttempts: successfulAttempts.length,
      lockedUsers,
      recentAttempts: allAttempts.slice(-50) // Last 50 attempts
    };
  }

  /**
   * Clear failed attempts for a user (admin function)
   */
  async clearFailedAttempts(userId: string, ipAddress?: string): Promise<void> {
    if (ipAddress) {
      const userKey = `${userId}-${ipAddress}`;
      this.attempts.delete(userKey);
      logger.info(`Cleared failed attempts for user ${userId} from IP ${ipAddress}`);
    } else {
      // Clear all attempts for this user from all IPs
      for (const [userKey, attempts] of this.attempts.entries()) {
        if (userKey.startsWith(`${userId}-`)) {
          this.attempts.delete(userKey);
        }
      }
      logger.info(`Cleared all failed attempts for user ${userId}`);
    }
  }

  /**
   * Format remaining lockout time for display
   */
  formatLockoutTime(remainingTime: number): string {
    const minutes = Math.ceil(remainingTime / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

// Export singleton instance
export const withdrawalSecurityService = new WithdrawalSecurityService(new PrismaClient());
