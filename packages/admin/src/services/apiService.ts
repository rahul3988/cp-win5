import { authService } from './authService';
import { 
  User, 
  Bet, 
  GameRound, 
  Transaction, 
  AnalyticsData,
  PaginatedResponse,
  API_ENDPOINTS
} from '@win5x/common';

const api = authService.getApi();

export const apiService = {
  // Analytics
  async getAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<AnalyticsData> {
    const response = await api.get(`${API_ENDPOINTS.ANALYTICS}?period=${period}`);
    return response.data.data;
  },

  // Users
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<User>> {
    const response = await api.get(API_ENDPOINTS.USERS, { params });
    return response.data.data;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await api.get(`${API_ENDPOINTS.USERS}/${userId}`);
    return response.data.data;
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await api.put(`${API_ENDPOINTS.USERS}/${userId}/status`, {
      isActive,
    });
    return response.data.data;
  },

  async adjustUserBalance(userId: string, amount: number, reason: string): Promise<User> {
    const response = await api.post(`${API_ENDPOINTS.USERS}/${userId}/balance`, {
      amount,
      reason,
    });
    return response.data.data;
  },

  // Transactions
  async getTransactions(params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedResponse<Transaction>> {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS_ADMIN, { params });
    return response.data.data;
  },

  async approveTransaction(transactionId: string, status: 'APPROVED' | 'REJECTED', reason?: string): Promise<Transaction> {
    const response = await api.put(`${API_ENDPOINTS.TRANSACTIONS_ADMIN}/${transactionId}`, {
      status,
      reason,
    });
    return response.data.data;
  },

  // Bets
  async getBets(params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    roundId?: string;
    betType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedResponse<Bet>> {
    const response = await api.get(API_ENDPOINTS.BETS, { params });
    return response.data.data;
  },

  // Rounds
  async getRounds(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<GameRound>> {
    const response = await api.get(API_ENDPOINTS.ROUNDS, { params });
    return response.data.data;
  },


  // Emergency Controls
  async emergencyStop(reason?: string): Promise<void> {
    await api.post(API_ENDPOINTS.EMERGENCY_STOP, { reason });
  },

  async manualSpin(): Promise<void> {
    await api.post(API_ENDPOINTS.MANUAL_SPIN);
  },

  // Audit Logs
  async getAuditLogs(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<any>> {
    const response = await api.get('/api/admin/audit-logs', { params });
    return response.data.data;
  },

  // System Status
  async getSystemStatus(): Promise<{
    gameEngine: {
      isRunning: boolean;
      currentRound: number | null;
    };
    database: {
      connected: boolean;
    };
    uptime: number;
    memory: any;
    timestamp: string;
  }> {
    const response = await api.get('/api/admin/system-status');
    return response.data.data;
  },

  // Game (public endpoints used by admin for read-only data)
  async getCurrentRoundSummary(): Promise<{
    round: any;
    distribution: { numbers: Record<string, { count: number; amount: number }>, oddEven: any, colors: any };
    totalBets: number;
    totalAmount: number;
  } | null> {
    const response = await api.get('/api/game/current-round');
    return response.data.data;
  },

  // Support Requests
  async getSupportRequests(params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get('/api/admin/support-requests', { params });
    return response.data.data as { items: any[]; total: number; page: number; pageSize: number; totalPages: number };
  },

  // Password management
  async setTemporaryPassword(userId: string, tempPassword: string) {
    const response = await api.post(`/api/admin/users/${userId}/set-temp-password`, { tempPassword });
    return response.data.data;
  },

  async changeOwnPassword(currentPassword: string, newPassword: string) {
    const response = await api.post('/api/auth/admin/change-password', { currentPassword, newPassword });
    return response.data.data;
  },

  // Payment Management
  async getAllPaymentMethods() {
    const response = await api.get('/api/payment/admin/methods');
    return response.data.data;
  },

  async getPaymentOptions() {
    const response = await api.get('/api/payment/options');
    return response.data.data;
  },

  async updatePaymentMethod(id: string, data: any) {
    const response = await api.put(`/api/payment/admin/methods/${id}`, data);
    return response.data.data;
  },

  async uploadQrCode(methodId: string, file: File) {
    const formData = new FormData();
    formData.append('qrCode', file);
    
    const response = await api.post(`/api/payment/methods/${methodId}/upload-qr`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async getAdminDeposits(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
  } = {}) {
    const response = await api.get('/api/payment/admin/deposits', { params });
    return response.data.data;
  },

  async processDepositRequest(id: string, action: 'approve' | 'reject', notes?: string, reason?: string) {
    const response = await api.put(`/api/payment/admin/deposits/${id}`, {
      action,
      notes,
      reason,
    });
    return response.data.data;
  },

  async getAdminWithdrawals(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
  } = {}) {
    const response = await api.get('/api/payment/admin/withdrawals', { params });
    return response.data.data;
  },

  async processWithdrawalRequest(id: string, action: 'approve' | 'reject', notes?: string, reason?: string) {
    const response = await api.put(`/api/payment/admin/withdrawals/${id}`, {
      action,
      notes,
      reason,
    });
    return response.data.data;
  },

  async getPaymentStats() {
    const response = await api.get('/api/payment/admin/stats');
    return response.data.data;
  },

  // Feedback & Support
  async getFeedbacks(params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get('/api/admin/feedbacks', { params });
    return response.data.data as { items: any[]; total: number; page: number; pageSize: number; totalPages: number };
  },

  async respondToNotification(id: string, message: string) {
    const response = await api.post(`/api/admin/notifications/${id}/respond`, { message });
    return response.data.data;
  },

  // Notifications
  async getAdminNotifications() {
    const response = await api.get('/api/admin/notifications');
    return response.data.data as any[];
  },

  // Promotions (admin)
  async getPromotions(params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get('/api/admin/promotions', { params });
    return response.data.data as { items: any[]; total: number; page: number; pageSize: number; totalPages: number };
  },
  async createPromotion(data: { title: string; content: string; imageUrl?: string; isActive?: boolean }) {
    const response = await api.post('/api/admin/promotions', data);
    return response.data.data;
  },
  async updatePromotion(id: string, data: { title?: string; content?: string; imageUrl?: string; isActive?: boolean }) {
    const response = await api.put(`/api/admin/promotions/${id}`, data);
    return response.data.data;
  },
  async deletePromotion(id: string) {
    const response = await api.delete(`/api/admin/promotions/${id}`);
    return response.data.data;
  },

  // Admin Config (referral percentages, attendance)
  async getAdminConfig() {
    const response = await api.get('/api/admin/config');
    return response.data.data as { referralLevel1Pct: number; referralLevel2Pct: number; referralLevel3Pct: number; attendanceDay7Amt: number };
  },
  async updateAdminConfig(data: Partial<{ referralLevel1Pct: number; referralLevel2Pct: number; referralLevel3Pct: number; attendanceDay7Amt: number }>) {
    const response = await api.put('/api/admin/config', data);
    return response.data.data;
  },

  // User wallets (admin view)
  async getUserWallets(userId: string) {
    const response = await api.get(`/api/admin/wallets/${userId}`);
    return response.data.data as { real: number; bonus: number; coins: number; gaming: number; wageringProgress: number; wageringRequired: number; updatedAt: string };
  },
  async getUserWalletHistory(userId: string, params: { page?: number; pageSize?: number; type?: string; status?: string; startDate?: string; endDate?: string } = {}) {
    const response = await api.get(`/api/admin/wallets/${userId}/history`, { params });
    return response.data.data as PaginatedResponse<Transaction>;
  },

  async adjustUserCoins(userId: string, amount: number, reason: string) {
    const response = await api.post(`/api/admin/coins/${userId}/adjust`, { amount, reason });
    return response.data.data as { userId: string; delta: number; coins: number };
  },

  // Referral System (admin view)
  async getReferralStats(userId: string) {
    const response = await api.get(`/api/admin/referral/stats/${userId}`);
    return response.data.data;
  },

  async getReferralRecords(userId: string, params: { page?: number; limit?: number } = {}) {
    const response = await api.get(`/api/admin/referral/records/${userId}`, { params });
    return response.data.data;
  },

  // Gift Code System (admin)
  async getGiftCodes(params: { page?: number; pageSize?: number } = {}) {
    const response = await api.get('/api/gift-code/admin/gift-codes', { params });
    return response.data.data;
  },

  async createGiftCode(data: { code: string; amount: number; usageLimit: number; expiryDate: string }) {
    const response = await api.post('/api/gift-code/admin/gift-codes', data);
    return response.data.data;
  },

  async updateGiftCode(id: string, data: { status?: string }) {
    const response = await api.put(`/api/gift-code/admin/gift-codes/${id}`, data);
    return response.data.data;
  },

  async deleteGiftCode(id: string) {
    const response = await api.delete(`/api/gift-code/admin/gift-codes/${id}`);
    return response.data.data;
  },
};