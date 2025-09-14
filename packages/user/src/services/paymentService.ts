import { authService } from './authService';

const api = authService.getApi();

export const paymentService = {
  // Payment methods
  async getPaymentMethods() {
    const response = await api.get('/api/payment/methods');
    return response.data.data;
  },

  async getPaymentOptions() {
    const response = await api.get('/api/payment/options');
    return response.data.data;
  },

  async getPaymentMethodDetails(id: string) {
    const response = await api.get(`/api/payment/methods/${id}/details`);
    return response.data.data;
  },

  // Deposits
  async createDepositRequest(data: {
    channel: string;
    amount: number;
    currency: string;
    transactionId: string;
    inrAmount: number;
    paymentMethodId: string;
  }) {
    // Convert new format to backend expected format
    const backendData = {
      paymentMethodId: data.paymentMethodId, // Use actual payment method ID
      amount: data.inrAmount, // Send INR amount as the main amount
      utrCode: data.channel === 'UPI' ? data.transactionId : undefined, // UTR for UPI
      usdtHash: data.channel === 'USDT' ? data.transactionId : undefined, // USDT hash for USDT
      originalAmount: data.amount, // Store original amount
      originalCurrency: data.currency, // Store original currency
    };
    
    const response = await api.post('/api/payment/deposit', backendData);
    return response.data.data;
  },

  async submitUtr(data: {
    paymentMethodId: string;
    amount: number;
    utrCode: string;
  }) {
    const response = await api.post('/api/payment/utr/submit', data);
    return response.data.data;
  },

  async submitTxId(data: {
    paymentMethodId: string;
    amount: number;
    usdtHash: string;
  }) {
    const response = await api.post('/api/payment/txid/submit', data);
    return response.data.data;
  },

  async getUserDeposits(params: {
    page?: number;
    pageSize?: number;
  } = {}) {
    const response = await api.get('/api/payment/deposits', { params });
    return response.data.data;
  },

  // Withdrawals
  async createWithdrawalRequest(data: {
    amount: number;
    paymentMethod: string;
    password: string;
    accountDetails: any;
  }) {
    const response = await api.post('/api/payment/withdraw', data);
    return response.data.data;
  },

  async getUserWithdrawals(params: {
    page?: number;
    pageSize?: number;
  } = {}) {
    const response = await api.get('/api/payment/withdrawals', { params });
    return response.data.data;
  },

  // Admin functions
  async getAllPaymentMethods() {
    const response = await api.get('/api/payment/admin/methods');
    return response.data.data;
  },

  async updatePaymentMethod(id: string, data: any) {
    const response = await api.put(`/api/payment/admin/methods/${id}`, data);
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
};