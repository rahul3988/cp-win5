import jwt from 'jsonwebtoken';
import { JWTPayload } from '@win5x/common';

export class JWTGenerator {
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
  }

  /**
   * Generate access and refresh tokens for a user
   */
  generateUserTokens(userId: string, username: string): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      {
        userId,
        username,
        type: 'user' as const,
      },
      this.jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as any
    );

    const refreshToken = jwt.sign(
      {
        userId,
        type: 'user' as const,
      },
      this.jwtRefreshSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );

    return { accessToken, refreshToken };
  }

  /**
   * Generate access and refresh tokens for an admin
   */
  generateAdminTokens(
    userId: string, 
    username: string, 
    role: string, 
    permissions: string[] = []
  ): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      {
        userId,
        username,
        type: 'admin' as const,
        role,
        permissions,
      },
      this.jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as any
    );

    const refreshToken = jwt.sign(
      {
        userId,
        type: 'admin' as const,
      },
      this.jwtRefreshSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as any
    );

    return { accessToken, refreshToken };
  }

  /**
   * Generate a custom token with custom payload
   */
  generateCustomToken(payload: Record<string, any>, expiresIn: string = '1h'): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn } as any);
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error(`Token verification failed: ${error}`);
    }
  }

  /**
   * Verify a refresh token
   */
  verifyRefreshToken(token: string): { userId: string; type: 'user' | 'admin' } {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as { userId: string; type: 'user' | 'admin' };
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error}`);
    }
  }

  /**
   * Decode a JWT token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error(`Token decoding failed: ${error}`);
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return new Date() > expiration;
  }
}

// Export singleton instance
export const jwtGenerator = new JWTGenerator();
