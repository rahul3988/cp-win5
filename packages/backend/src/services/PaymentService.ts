import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { WalletService } from './WalletService';

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  // Payment Methods Management
  async getActivePaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getPaymentOptions() {
    const upiMethods = await this.prisma.paymentMethod.findMany({
      where: { 
        name: { in: ['phonepe', 'googlepay', 'paytm'] },
        isActive: true 
      },
      orderBy: { name: 'asc' },
    });

    const usdtMethod = await this.prisma.paymentMethod.findFirst({
      where: { 
        name: 'usdt',
        isActive: true 
      },
    });

    // Get conversion rate from admin config (default 1 USDT = 83 INR)
    const config = await this.prisma.adminConfig.findFirst();
    const usdtToInrRate = config?.usdtToInrRate || 83;

    return {
      upi: {
        methods: upiMethods,
        minAmount: upiMethods.length > 0 ? Math.min(...upiMethods.map(m => m.minAmount)) : 100,
        maxAmount: upiMethods.length > 0 ? Math.max(...upiMethods.map(m => m.maxAmount)) : 100000,
        currency: 'INR',
        quickAmounts: [100, 200, 500, 1000, 2000, 5000]
      },
      usdt: usdtMethod ? {
        method: usdtMethod,
        minAmount: usdtMethod.minAmount,
        maxAmount: usdtMethod.maxAmount,
        currency: 'USD',
        conversionRate: usdtToInrRate,
        quickAmounts: [10, 25, 50, 100, 250, 500]
      } : null
    };
  }

  async getAllPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPaymentMethodById(id: string) {
    return this.prisma.paymentMethod.findUnique({
      where: { id },
    });
  }

  async updatePaymentMethod(id: string, data: {
    displayName?: string;
    isActive?: boolean;
    qrCodeUrl?: string;
    qrCodeData?: string;
    upiId?: string;
    walletAddress?: string;
    instructions?: string;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const oldMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });

    const updatedMethod = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Log the change
    await this.logPaymentAudit({
      entityType: 'payment_method',
      entityId: id,
      action: 'updated',
      oldData: oldMethod,
      newData: updatedMethod,
    });

    return updatedMethod;
  }

  // Deposit Management
  async createDepositRequest(
    userId: string,
    paymentMethodId: string,
    amount: number,
    utrCode?: string,
    usdtHash?: string
  ) {
    // Get payment method to determine validation type
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, isActive: true },
    });

    if (!paymentMethod) {
      throw new Error('Invalid payment method');
    }

    // Validate based on payment method type
    if (paymentMethod.name === 'usdt' && usdtHash) {
      // Check if USDT hash already exists (any status)
      const existingDeposit = await this.prisma.depositRequest.findFirst({
        where: {
          usdtHash: {
            equals: usdtHash.toLowerCase(),
          },
        },
      });

      if (existingDeposit) {
        throw new Error('Duplicate USDT Hash not allowed');
      }
    } else if (utrCode) {
      // Check if UTR code already exists (any status)
      const existingDeposit = await this.prisma.depositRequest.findFirst({
        where: {
          utrCode: utrCode.toUpperCase(),
        },
      });

      if (existingDeposit) {
        throw new Error('Duplicate UTR not allowed');
      }
    } else {
      throw new Error('UTR code or USDT hash is required');
    }

    // Validate amount
    if (amount < paymentMethod.minAmount || amount > paymentMethod.maxAmount) {
      throw new Error(
        `Amount must be between ₹${paymentMethod.minAmount} and ₹${paymentMethod.maxAmount}`
      );
    }

    const depositRequest = await this.prisma.depositRequest.create({
      data: {
        userId,
        paymentMethodId,
        amount,
        utrCode: utrCode ? utrCode.toUpperCase() : null,
        usdtHash: usdtHash ? usdtHash.toLowerCase() : null,
        status: 'PENDING',
      },
      include: {
        user: { select: { username: true, email: true } },
        paymentMethod: { select: { name: true, displayName: true } },
      },
    });

    // Log the deposit request
    await this.logPaymentAudit({
      entityType: 'deposit_request',
      entityId: depositRequest.id,
      action: 'created',
      newData: depositRequest,
      userId,
    });

    logger.info(`Deposit request created: ${depositRequest.id} for user ${userId}`);
    return depositRequest;
  }

  async approveDepositRequest(
    depositId: string,
    adminId: string,
    adminNotes?: string
  ) {
    const deposit = await this.prisma.depositRequest.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new Error('Deposit request not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit request is not pending');
    }

    // Check if this UTR/Hash has already been approved before
    const whereClause: any = {
      status: 'APPROVED',
      id: { not: depositId }, // Exclude current deposit
    };

    if (deposit.utrCode) {
      whereClause.utrCode = {
        equals: deposit.utrCode,
      };
    }
    if (deposit.usdtHash) {
      whereClause.usdtHash = {
        equals: deposit.usdtHash,
      };
    }

    const existingApprovedDeposit = await this.prisma.depositRequest.findFirst({
      where: whereClause,
    });

    if (existingApprovedDeposit) {
      const duplicateType = deposit.utrCode ? 'UTR' : 'USDT Hash';
      // Auto-reject this deposit with warning
      await this.prisma.depositRequest.update({
        where: { id: depositId },
        data: {
          status: 'REJECTED',
          rejectedReason: `Duplicate ${duplicateType} already approved`,
          adminNotes: `Auto-rejected: This ${duplicateType} has already been approved for another deposit`,
        },
      });

      // Log the auto-rejection
      await this.logPaymentAudit({
        entityType: 'deposit_request',
        entityId: depositId,
        action: 'auto_rejected_duplicate',
        oldData: deposit,
        newData: { ...deposit, status: 'REJECTED', rejectedReason: `Duplicate ${duplicateType} already approved` },
        adminId,
      });

      throw new Error(`Duplicate ${duplicateType} already approved - Deposit auto-rejected`);
    }

    // Capture starting balance for detailed logging
    const beforeBalanceUser = await this.prisma.user.findUnique({ where: { id: deposit.userId }, select: { walletBetting: true } });

    // Update deposit status and credit user balance
    const [updatedDeposit, afterUser, depositTx] = await this.prisma.$transaction([
      this.prisma.depositRequest.update({
        where: { id: depositId },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          adminNotes,
        },
      }),
      this.prisma.user.update({
        where: { id: deposit.userId },
        data: {
          walletBetting: { increment: deposit.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: deposit.userId,
          type: 'DEPOSIT',
          amount: deposit.amount,
          status: 'COMPLETED',
          description: `Deposit approved - UTR: ${deposit.utrCode}`,
          approvedBy: adminId,
        },
      }),
    ] as const);

    // Deposit bonus to bonus wallet (for all UPI and Win5x coin deposits)
    try {
      const paymentMethod = await this.prisma.paymentMethod.findUnique({
        where: { id: deposit.paymentMethodId },
      });

      // Apply bonus for UPI methods (phonepe, googlepay, paytm) and win5x-coin
      const upiMethods = ['phonepe', 'googlepay', 'paytm'];
      const shouldApplyBonus = paymentMethod && (
        upiMethods.includes(paymentMethod.name) || 
        paymentMethod.name === 'win5x-coin'
      );

      if (shouldApplyBonus) {
        const cfg = await this.prisma.adminConfig.findFirst();
        const pct = (cfg?.depositBonusPct ?? 5) / 100;
        const bonus = Math.round(deposit.amount * pct * 100) / 100;
        
        if (bonus > 0) {
          const methodName = paymentMethod?.displayName || paymentMethod?.name || 'Unknown';
          
          // Update betting wallet with bonus amount
          await this.prisma.user.update({
            where: { id: deposit.userId },
            data: { 
              walletBetting: { increment: bonus }
            }
          });
          
          // Create bonus transaction
          await this.prisma.transaction.create({
            data: {
              userId: deposit.userId,
              type: 'BONUS_CREDIT',
              amount: bonus,
              wallet: 'BETTING',
              status: 'COMPLETED',
              description: `Deposit bonus (${pct * 100}%) for ${methodName} deposit`,
              approvedBy: adminId,
            },
          });

          logger.info(`Deposit bonus credited: ${bonus} to betting wallet for user ${deposit.userId} for ${methodName} deposit of ${deposit.amount}`);
        }
      }
    } catch (e) {
      logger.error('Failed to credit deposit bonus', e);
    }

    // Send real-time balance update to user
    try {
      const { SocketService } = await import('../websocket/SocketService');
      const socketService = SocketService.getInstance();
      if (socketService) {
        // Get updated user balance
        const updatedUser = await this.prisma.user.findUnique({
          where: { id: deposit.userId },
          select: { walletBetting: true, walletGaming: true, username: true },
        });

        if (updatedUser) {
          // Notify user of balance update
          await socketService.notifyUser(deposit.userId, 'user_balance_update', {
            bettingWallet: Number(updatedUser.walletBetting || 0),
            gamingWallet: Number(updatedUser.walletGaming || 0),
          });

          // Notify admins of deposit approval
          await socketService.notifyAdmins('admin_notification', {
            type: 'deposit_approved',
            message: `Deposit of ₹${deposit.amount} approved for user ${updatedUser.username}`,
            data: {
              userId: deposit.userId,
              username: updatedUser.username,
              amount: deposit.amount,
              newBalance: updatedUser.walletBetting,
            },
          });

          // Broadcast updated analytics to admins
          await socketService.broadcastAnalyticsUpdate();

          logger.info(`Balance update sent to user ${deposit.userId} via socket`);
        }
      }
    } catch (e) {
      logger.error('Failed to send balance update via socket', e);
    }


    // Log the approval
    await this.logPaymentAudit({
      entityType: 'deposit_request',
      entityId: depositId,
      action: 'approved',
      oldData: deposit,
      newData: updatedDeposit,
      adminId,
    });

    logger.info(`Deposit approved: ${depositId} by admin ${adminId}`, {
      userId: deposit.userId,
      amount: deposit.amount,
      txId: depositTx.id,
      balanceBefore: Number(beforeBalanceUser?.walletBetting || 0),
      balanceAfter: Number((afterUser as any)?.walletBetting || 0),
    });
    return updatedDeposit;
  }

  async rejectDepositRequest(
    depositId: string,
    adminId: string,
    rejectedReason: string
  ) {
    const deposit = await this.prisma.depositRequest.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error('Deposit request not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit request is not pending');
    }

    const updatedDeposit = await this.prisma.depositRequest.update({
      where: { id: depositId },
      data: {
        status: 'REJECTED',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectedReason,
      },
    });

    // Log the rejection
    await this.logPaymentAudit({
      entityType: 'deposit_request',
      entityId: depositId,
      action: 'rejected',
      oldData: deposit,
      newData: updatedDeposit,
      adminId,
    });

    logger.info(`Deposit rejected: ${depositId} by admin ${adminId}`);
    return updatedDeposit;
  }

  async getDepositRequests(filters: {
    status?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, userId, page = 1, pageSize = 20 } = filters;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [deposits, total] = await Promise.all([
      this.prisma.depositRequest.findMany({
        where,
        include: {
          user: { select: { username: true, email: true } },
          paymentMethod: { select: { name: true, displayName: true } },
          approver: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.depositRequest.count({ where }),
    ]);

    return {
      deposits,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Withdrawal Management
  async createWithdrawalRequest(
    userId: string,
    amount: number,
    paymentMethod: string,
    accountDetails: any
  ) {
    // Check user balance and wagering requirement
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBetting: true, wageringRequired: true, wageringProgress: true },
    });

    if (!user || Number(user.walletBetting) < amount) {
      throw new Error('Insufficient balance');
    }

    // Enforce wagering requirement
    const req = user.wageringRequired || 0;
    const prog = user.wageringProgress || 0;
    if (req > 0 && prog < req) {
      const remaining = Math.max(0, req - prog);
      throw new Error(`Wagering requirement not met. Remaining: ₹${remaining.toFixed(2)}`);
    }

    // Deduct amount from user balance immediately (hold it)
    const withdrawalRequest = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { walletBetting: { decrement: amount } },
      }),
      this.prisma.withdrawalRequest.create({
        data: {
          userId,
          amount,
          paymentMethod,
          accountDetails: JSON.stringify(accountDetails),
          status: 'PENDING',
        },
        include: {
          user: { select: { username: true, email: true } },
        },
      }),
    ]);

    const withdrawal = withdrawalRequest[1];

    // Log the withdrawal request
    await this.logPaymentAudit({
      entityType: 'withdrawal_request',
      entityId: withdrawal.id,
      action: 'created',
      newData: withdrawal,
      userId,
    });

    logger.info(`Withdrawal request created: ${withdrawal.id} for user ${userId}`);
    return withdrawal;
  }

  async approveWithdrawalRequest(
    withdrawalId: string,
    adminId: string,
    adminNotes?: string
  ) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal request is not pending');
    }

    const updatedWithdrawal = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          adminNotes,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL',
          amount: -withdrawal.amount,
          status: 'COMPLETED',
          description: `Withdrawal approved to ${withdrawal.paymentMethod}`,
          approvedBy: adminId,
        },
      }),
    ] as const);

    // Log the approval
    await this.logPaymentAudit({
      entityType: 'withdrawal_request',
      entityId: withdrawalId,
      action: 'approved',
      oldData: withdrawal,
      newData: updatedWithdrawal[0],
      adminId,
    });

    logger.info(`Withdrawal approved: ${withdrawalId} by admin ${adminId}`, {
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      txId: (updatedWithdrawal[1] as any).id,
    });
    return updatedWithdrawal[0];
  }

  async rejectWithdrawalRequest(
    withdrawalId: string,
    adminId: string,
    rejectionReason: string
  ) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal request is not pending');
    }

    // Refund the amount back to user balance
    const beforeBalanceUser = await this.prisma.user.findUnique({ where: { id: withdrawal.userId }, select: { walletBetting: true } });
    const updatedWithdrawal = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          approvedBy: adminId,
          approvedAt: new Date(),
          rejectionReason,
        },
      }),
      this.prisma.user.update({
        where: { id: withdrawal.userId },
        data: { walletBetting: { increment: withdrawal.amount } },
      }),
    ] as const);

    // Log the rejection
    await this.logPaymentAudit({
      entityType: 'withdrawal_request',
      entityId: withdrawalId,
      action: 'rejected',
      oldData: withdrawal,
      newData: updatedWithdrawal[0],
      adminId,
    });

    logger.info(`Withdrawal rejected: ${withdrawalId} by admin ${adminId}`, {
      userId: withdrawal.userId,
      amountRefunded: withdrawal.amount,
      balanceBefore: Number(beforeBalanceUser?.walletBetting || 0),
      balanceAfter: (updatedWithdrawal[1] as any)?.balance,
    });
    return updatedWithdrawal[0];
  }

  async getWithdrawalRequests(filters: {
    status?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, userId, page = 1, pageSize = 20 } = filters;
    
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          user: { select: { username: true, email: true } },
          approver: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      withdrawals,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Audit Logging
  private async logPaymentAudit(data: {
    entityType: string;
    entityId: string;
    action: string;
    oldData?: any;
    newData?: any;
    adminId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.paymentAuditLog.create({
        data: {
          ...data,
          oldData: data.oldData ? JSON.stringify(data.oldData) : null,
          newData: data.newData ? JSON.stringify(data.newData) : null,
        },
      });
    } catch (error) {
      logger.error('Failed to create payment audit log:', error);
    }
  }

  // Statistics
  async getPaymentStats() {
    const [
      totalDeposits,
      totalWithdrawals,
      pendingDeposits,
      pendingWithdrawals,
      approvedDeposits,
      approvedWithdrawals,
    ] = await Promise.all([
      this.prisma.depositRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.depositRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.withdrawalRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.depositRequest.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true, approvedAt: true },
        orderBy: { approvedAt: 'desc' },
        take: 10,
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { status: 'APPROVED' },
        select: { amount: true, approvedAt: true },
        orderBy: { approvedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalDeposits: {
        amount: totalDeposits._sum.amount || 0,
        count: totalDeposits._count,
      },
      totalWithdrawals: {
        amount: totalWithdrawals._sum.amount || 0,
        count: totalWithdrawals._count,
      },
      pending: {
        deposits: pendingDeposits,
        withdrawals: pendingWithdrawals,
      },
      recent: {
        // For frontend compatibility, expose approvedAt as createdAt
        deposits: approvedDeposits.map((d: any) => ({ amount: d.amount, createdAt: d.approvedAt })),
        withdrawals: approvedWithdrawals.map((w: any) => ({ amount: w.amount, createdAt: w.approvedAt })),
      },
    };
  }
}