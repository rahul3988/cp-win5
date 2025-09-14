import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  CreditCard, ArrowUpCircle, ArrowDownCircle, Clock, Wallet
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { userService } from '../services/userService';
import { formatCurrency } from '@win5x/common';

const TransactionsPage: React.FC = () => {
  const location = useLocation() as any;
  const [walletFilter, setWalletFilter] = useState<'ALL' | 'BETTING' | 'GAMING'>('ALL');
  
  const { data: txData, isLoading } = useQuery({
    queryKey: ['user-transactions', walletFilter],
    queryFn: () => userService.getTransactions({ pageSize: 50, wallet: walletFilter === 'ALL' ? undefined : walletFilter }),
    refetchInterval: 30000,
  });

  const { data: activeBets } = useQuery({
    queryKey: ['user-active-bets'],
    queryFn: () => userService.getActiveBets(),
    refetchInterval: 5000,
  });

  const { data: totals } = useQuery({
    queryKey: ['user-transactions-summary'],
    queryFn: () => userService.getTransactionSummary(),
    refetchInterval: 30000,
  });

  const combined = useMemo(() => {
    // Show all transactions for complete wallet history
    const base = (txData?.items || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      wallet: t.wallet,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt,
    }));
    return base;
  }, [txData]);

  const summary = useMemo(() => {
    if (totals) return totals;
    const items = combined || [];
    const deposits = items.filter((t: any) => t.type === 'DEPOSIT' && t.status === 'COMPLETED');
    const withdrawals = items.filter((t: any) => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED');
    const depositsSum = deposits.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const withdrawalsSum = withdrawals.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
    return { depositsSum, withdrawalsSum };
  }, [combined, totals]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">Transactions</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your deposits, withdrawals, and betting history</p>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Link to="/deposit" className="btn btn-success btn-sm sm:btn-md flex items-center justify-center gap-2 w-full sm:w-auto">
              <ArrowDownCircle className="h-4 w-4" />
              <span>Deposit</span>
            </Link>
            <Link to="/withdraw" className="btn btn-warning btn-sm sm:btn-md flex items-center justify-center gap-2 w-full sm:w-auto">
              <ArrowUpCircle className="h-4 w-4" />
              <span>Withdraw</span>
            </Link>
          </div>
        </div>

        {/* Wallet Filter */}
        <div className="card">
          <div className="card-content">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Wallet History</h3>
                <p className="text-gray-400 text-sm">Filter transactions by wallet type</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setWalletFilter('ALL')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    walletFilter === 'ALL'
                      ? 'bg-gold-500 text-black'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Wallets
                </button>
                <button
                  onClick={() => setWalletFilter('BETTING')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    walletFilter === 'BETTING'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  Betting Wallet
                </button>
                <button
                  onClick={() => setWalletFilter('GAMING')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    walletFilter === 'GAMING'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  Gaming Wallet
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeout notice */}
        {location.state?.notice === 'deposit_timeout' && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm">Your last deposit session expired (no UTR submitted within 5 minutes). If money was debited, please contact support with your UTR.</p>
          </div>
        )}
        {location.state?.notice === 'deposit_submitted' && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">Deposit submitted. Status: <span className="font-semibold">PENDING</span>. You'll be notified when it is approved or rejected.</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-600 rounded-lg">
                  <ArrowDownCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.depositsSum || 0, '₹')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-600 rounded-lg">
                  <ArrowUpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.withdrawalsSum || 0, '₹')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Recent Transactions</p>
                  <p className="text-2xl font-bold text-blue-400">{(combined || []).length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Present: Active Bets */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Bets (Present)</h3>
            <p className="card-description">Bets currently in progress</p>
          </div>
          <div className="card-content">
            {!(activeBets && activeBets.length) ? (
              <div className="text-sm text-gray-500">No active bets</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Round</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Value</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Placed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(activeBets || []).map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2 text-sm text-gray-300">{b.round?.roundNumber ?? '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{b.betType}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{b.betValue}</td>
                        <td className="px-4 py-2 text-sm text-gray-300 text-right">{formatCurrency(b.amount, '₹')}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{b.placedAt ? new Date(b.placedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History (Past) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {walletFilter === 'ALL' ? 'Transaction History (Past)' : 
               walletFilter === 'BETTING' ? 'Betting Wallet History' : 
               'Gaming Wallet History'}
            </h3>
            <p className="card-description">
              {walletFilter === 'ALL' ? 'Your completed deposits and withdrawals' :
               walletFilter === 'BETTING' ? 'All transactions related to your betting wallet' :
               'All transactions related to your gaming wallet'}
            </p>
          </div>
          <div className="card-content">
            {isLoading ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Loading transactions...</p>
              </div>
            ) : (combined?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Wallet</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {combined.map((t: any) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2 text-sm text-gray-300">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{t.type}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            t.wallet === 'BETTING' ? 'bg-blue-500/10 text-blue-400' :
                            t.wallet === 'GAMING' ? 'bg-green-500/10 text-green-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {t.wallet || 'N/A'}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-sm font-semibold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(Math.abs(t.amount), '₹')}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            t.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                            t.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-300' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400 max-w-[12rem] truncate" title={t.description}>{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Your transaction history will appear here once you start playing
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionsPage;