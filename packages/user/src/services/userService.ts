import { authService } from './authService';
import { API_ENDPOINTS } from '@win5x/common';

const api = authService.getApi();

export const userService = {
  async getProfile() {
    const response = await api.get(API_ENDPOINTS.PROFILE);
    return response.data.data;
  },

  async updateProfile(data: { email?: string; username?: string; avatarUrl?: string }) {
    const response = await api.put(API_ENDPOINTS.PROFILE, data);
    return response.data.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.post(API_ENDPOINTS.CHANGE_PASSWORD, data);
    return response.data.data;
  },

  async getBetHistory(params: { page?: number; pageSize?: number; startDate?: string; endDate?: string } = {}) {
    const response = await api.get('/api/user/bets', { params });
    return response.data.data as {
      items: Array<any>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  async getTotalGameHistory(params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get('/api/game/history/total', { params });
    return response.data.data as {
      items: Array<{
        round: number;
        winningNumber: number;
        result: string;
        time: Date;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  async getPlayerBetHistory(userId: string, params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get(`/api/user/history/player/${userId}`, { params });
    return response.data.data as {
      items: Array<{
        round: number;
        bet: string;
        amount: number;
        payout: number;
        cashback: number;
        result: string;
        time: Date;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  async getUserLogs(userId: string, params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get(`/api/user/logs/${userId}`, { params });
    return response.data.data as {
      items: Array<{
        action: string;
        date: string;
        time: string;
        timestamp: Date;
        ipAddress?: string;
        userAgent?: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  async logoutAuthenticated() {
    const response = await api.post('/api/auth/logout-authenticated');
    return response.data.data;
  },

  async getActiveBets() {
    const response = await api.get('/api/user/active-bets');
    return response.data.data as Array<any>;
  },

  async getTransactions(params: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    wallet?: string;
  } = {}) {
    const response = await api.get('/api/user/transactions', { params });
    return response.data.data as {
      items: Array<any>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  async getTransactionSummary() {
    const response = await api.get('/api/user/transactions/summary');
    return response.data.data as { depositsSum: number; withdrawalsSum: number };
  },

  async getPromotions() {
    const response = await api.get('/api/user/promotions');
    return response.data.data as any[];
  },

  async getWallets() {
    const response = await api.get('/api/user/wallets');
    return response.data.data as { real: number; bonus: number; coins: number; gaming: number; wageringProgress: number; wageringRequired: number; updatedAt: string };
  },

  async getWalletHistory(params: { page?: number; pageSize?: number; type?: string; status?: string; startDate?: string; endDate?: string } = {}) {
    const response = await api.get('/api/user/wallets/history', { params });
    return response.data.data as {
      items: Array<any>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },


  async getAttendance() {
    const response = await api.get('/api/user/attendance');
    return response.data.data as { attendanceStreak: number; lastAttendanceAt: string | null };
  },
  async pingAttendance() {
    const response = await api.post('/api/user/attendance/ping', {});
    return response.data.data as { attendanceStreak: number };
  },
  async claimAttendance() {
    const response = await api.post('/api/user/attendance/claim', {});
    return response.data.data as { reward: number };
  },

  // Safe functionality
  async getSafeBalance() {
    const response = await api.get('/api/user/safe/balance');
    return response.data.data as { balance: number; generatedRevenue: number; accumulatedRevenue: number; interestRate: number };
  },

  async transferToSafe(amount: number) {
    const response = await api.post('/api/user/safe/transfer-in', { amount });
    return response.data.data;
  },

  async transferFromSafe(amount: number) {
    const response = await api.post('/api/user/safe/transfer-out', { amount });
    return response.data.data;
  },

  async getSafeHistory(params: { page?: number; pageSize?: number; startDate?: string; endDate?: string } = {}) {
    const response = await api.get('/api/user/safe/history', { params });
    return response.data.data as {
      items: Array<any>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  // Notifications
  async getNotifications(params: { page?: number; pageSize?: number; type?: string; read?: boolean } = {}) {
    const response = await api.get('/api/user/notifications', { params });
    return response.data.data as {
      items: Array<any>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },

  async markNotificationAsRead(notificationId: string) {
    const response = await api.put(`/api/user/notifications/${notificationId}/read`);
    return response.data.data;
  },

  async updateNotificationSettings(settings: any) {
    const response = await api.put('/api/user/notifications/settings', settings);
    return response.data.data;
  },

  // Messages
  async getMessages(params: { page?: number; pageSize?: number; type?: 'notice' | 'news' } = {}) {
    const response = await api.get('/api/user/messages', { params });
    return response.data.data as {
      items: Array<any>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  },


  // Game statistics
  async getGameStatistics(params: { timeRange?: 'today' | 'week' | 'month' | 'all'; startDate?: string; endDate?: string } = {}) {
    const response = await api.get('/api/user/game-statistics', { params });
    return response.data.data as {
      totalBets: number;
      totalWins: number;
      totalLosses: number;
      winRate: number;
      totalWagered: number;
      totalWon: number;
      netProfit: number;
      biggestWin: number;
      biggestLoss: number;
      averageBet: number;
      longestWinStreak: number;
      longestLossStreak: number;
      gamesPlayed: number;
      favoriteNumber: number;
      lastPlayed: string;
      dailyStats: Array<{ date: string; bets: number; wins: number; wagered: number; won: number }>;
    };
  },

  // Settings
  async updateSettings(settings: { notifications?: any; privacy?: any; security?: any }) {
    const response = await api.put('/api/user/settings', settings);
    return response.data.data;
  },

  async getSettings() {
    const response = await api.get('/api/user/settings');
    return response.data.data;
  },

  // Referral System
  async getReferralStats() {
    const response = await api.get('/api/invitation/stats');
    return response.data.data;
  },

  async getReferralRecords(params: { page?: number; limit?: number } = {}) {
    const response = await api.get('/api/referral/records', { params });
    return response.data.data;
  },

  async claimReferralBonus(tierId: number) {
    const response = await api.post(`/api/invitation/claim/${tierId}`);
    return response.data.data;
  },

  async getReferralLink() {
    const response = await api.get('/api/referral/link');
    return response.data.data;
  },

  // Invitation System (alias for referral system)
  async getInvitationStats() {
    const response = await api.get('/api/invitation/stats');
    return response.data.data;
  },

  async getInvitationRecords(params: { page?: number; limit?: number } = {}) {
    const response = await api.get('/api/invitation/records', { params });
    return response.data.data;
  },

  async claimInvitationBonus(tierId: number) {
    const response = await api.post(`/api/invitation/claim/${tierId}`);
    return response.data.data;
  },

  // Gift Code System
  async redeemGiftCode(code: string) {
    const response = await api.post('/api/gift-code/user/redeem-code', { code });
    return response.data.data;
  },

  async getGiftCodeHistory(params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get('/api/gift-code/user/history', { params });
    return response.data.data;
  },

  async getPromotionsConfig() {
    const response = await api.get('/api/user/promotions/config');
    return response.data.data;
  },

  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const response = await api.get(`/api/user/leaderboard?period=${period}`);
    return response.data.data;
  },

  async getAttendanceConfig() {
    const response = await api.get('/api/user/attendance/config');
    return response.data.data;
  },

  async refundBet(amount: number, useGamingWallet: boolean = false) {
    const response = await api.post('/api/user/refund-bet', { amount, useGamingWallet });
    return response.data.data;
  },
};


