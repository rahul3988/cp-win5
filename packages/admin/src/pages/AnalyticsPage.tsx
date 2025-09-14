import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { exportToCSV } from '../utils/export';

const AnalyticsPage: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['analytics-export','daily'],
    queryFn: () => apiService.getAnalytics('daily'),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Analytics & Reports</h3>
          <p className="card-description">
            Detailed analytics and business intelligence
          </p>
          <div className="mt-2">
            <button className="btn btn-outline btn-sm" onClick={() => {
              const rows = data ? Object.entries(data).map(([k,v]) => ({ metric: k, value: JSON.stringify(v) })) : [];
              exportToCSV('analytics.csv', ['metric','value'], rows as any);
            }}>Export CSV</button>
          </div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold">₹{(data as any)?.summary?.revenue?.toLocaleString('en-IN') || 0}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Total Payout</div>
              <div className="text-2xl font-bold">₹{(data as any)?.summary?.payout?.toLocaleString('en-IN') || 0}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">House Profit/Loss</div>
              <div className="text-2xl font-bold">₹{(data as any)?.summary?.houseProfitLoss?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-2xl font-bold">{(data as any)?.summary?.totalUsers || 0}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Active Users</div>
              <div className="text-2xl font-bold">{(data as any)?.summary?.activeUsers || 0}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Total Rounds</div>
              <div className="text-2xl font-bold">{(data as any)?.summary?.totalRounds || 0}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Total Bets</div>
              <div className="text-2xl font-bold">{(data as any)?.summary?.totalBets || 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Pending Deposits</div>
              <div className="text-2xl font-bold">{(data as any)?.pending?.deposits || 0}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-sm text-gray-500">Pending Withdrawals</div>
              <div className="text-2xl font-bold">{(data as any)?.pending?.withdrawals || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;