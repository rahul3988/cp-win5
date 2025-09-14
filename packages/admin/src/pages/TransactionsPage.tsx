import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { exportToCSV } from '../utils/export';

const TransactionsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data, isLoading } = useQuery<{ items: any[]; total: number; totalPages: number; page: number }>({
    queryKey: ['admin-transactions', page],
    queryFn: () => apiService.getTransactions({ page, pageSize }),
    refetchInterval: 30000,
  });
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transactions</h3>
          <p className="card-description">
            Manage deposits, withdrawals, and financial transactions
          </p>
          <div className="mt-2">
            <button className="btn btn-outline btn-sm" onClick={() => {
              const rows = (data?.items || []).map((t: any) => ({ id: t.id, user: t.user?.username, type: t.type, amount: t.amount, status: t.status, createdAt: t.createdAt }));
              exportToCSV('transactions.csv', ['id','user','type','amount','status','createdAt'], rows);
            }}>Export CSV</button>
          </div>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data?.items || []).map((t: any) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.user?.username || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">₹{Math.abs(t.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-700">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading ? (
            <div className="py-4 text-center text-gray-500">Loading...</div>
          ) : (data && data.totalPages > 1) ? (
            <div className="flex items-center justify-between mt-3">
              <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>Previous</button>
              <div className="text-sm text-gray-500">Page {page} of {data.totalPages}</div>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(data.totalPages, p+1))} disabled={page>=data.totalPages}>Next</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;