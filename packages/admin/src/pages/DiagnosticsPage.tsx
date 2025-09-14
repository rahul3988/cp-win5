import React, { useEffect, useMemo, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { apiService } from '../services/apiService';

const DiagnosticsPage: React.FC = () => {
  const { isConnected } = useSocket();
  const [game, setGame] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const [g, a, p] = await Promise.all([
        apiService.getCurrentRoundSummary(),
        apiService.getAnalytics('daily'),
        apiService.getPaymentStats(),
      ]);
      setGame(g);
      setAnalytics(a);
      setPaymentStats(p);
      setLastPingAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch diagnostics');
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const distributionNumbers = useMemo(() => {
    const numbers = game?.distribution?.numbers || {};
    return Array.from({ length: 10 }).map((_, i) => ({
      key: String(i),
      amount: numbers[String(i)]?.amount || 0,
      count: numbers[String(i)]?.count || 0,
    }));
  }, [game]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Realtime & API Diagnostics</h3>
          <p className="card-description">Quick health snapshot for sockets and key APIs</p>
        </div>
        <div className="card-content space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">Socket:</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>{isConnected ? 'Connected' : 'Disconnected'}</span>
            <button className="btn btn-outline btn-sm ml-auto" onClick={refresh}>Ping Now</button>
            {lastPingAt && <span className="text-gray-500">Last ping: {lastPingAt}</span>}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-3">
              <div className="text-sm font-medium mb-2">Game</div>
              <div className="text-sm text-gray-600">Current Round: {game?.round?.roundNumber ?? 'N/A'}</div>
              <div className="text-sm text-gray-600">Phase: {game?.round?.status ?? 'N/A'}</div>
              <div className="mt-2 text-xs text-gray-500">Distribution (amount):
                <div className="mt-1 grid grid-cols-5 gap-1">
                  {distributionNumbers.map(n => (
                    <div key={n.key} className="p-1 bg-gray-50 rounded border text-center">
                      <div className="text-[10px] text-gray-500">{n.key}</div>
                      <div className="text-[11px]">₹{n.amount.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-gray-500">{n.count} bets</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border rounded p-3">
              <div className="text-sm font-medium mb-2">Payments</div>
              <div className="text-sm text-gray-600">Total Deposits: ₹{(paymentStats?.totalDeposits?.amount || 0).toLocaleString('en-IN')}</div>
              <div className="text-sm text-gray-600">Total Withdrawals: ₹{(paymentStats?.totalWithdrawals?.amount || 0).toLocaleString('en-IN')}</div>
              <div className="text-sm text-gray-600">Pending Deposits: {paymentStats?.pending?.deposits ?? 0}</div>
              <div className="text-sm text-gray-600">Pending Withdrawals: {paymentStats?.pending?.withdrawals ?? 0}</div>
            </div>

            <div className="border rounded p-3">
              <div className="text-sm font-medium mb-2">Analytics</div>
              <div className="text-sm text-gray-600">Users: {analytics?.summary?.totalUsers ?? 0}</div>
              <div className="text-sm text-gray-600">Active Users: {analytics?.summary?.activeUsers ?? 0}</div>
              <div className="text-sm text-gray-600">Revenue: ₹{(analytics?.summary?.revenue || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPage;


