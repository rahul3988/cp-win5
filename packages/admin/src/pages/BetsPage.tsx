import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { exportToCSV } from '../utils/export';

const BetsPage: React.FC = () => {
  const [filters, setFilters] = useState({ userId: '', roundId: '', betType: '' });
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data, isLoading } = useQuery<{ items: any[]; total: number; totalPages: number; page: number }>({
    queryKey: ['admin-bets', filters, page],
    queryFn: async () => {
      let resolvedUserId = filters.userId?.trim() || '';
      let resolvedRoundId = filters.roundId?.trim() || '';

      // If userId isn't a UUID format, try resolving by username/email
      if (resolvedUserId && !/^[0-9a-fA-F-]{10,}$/.test(resolvedUserId)) {
        try {
          const users = await apiService.getUsers({ pageSize: 1, search: resolvedUserId });
          if (users.items?.length) {
            resolvedUserId = users.items[0].id;
          }
        } catch {}
      }

      // If roundId isn't UUID, try treating it as round number and resolve to id
      if (resolvedRoundId && !/^[0-9a-fA-F-]{10,}$/.test(resolvedRoundId)) {
        const n = Number(resolvedRoundId);
        if (!Number.isNaN(n) && Number.isFinite(n)) {
          try {
            // Note: backend rounds list is paginated; quick resolve by searching latest pages is non-trivial.
            // Fallback: leave roundId empty if not a UUID; admins can copy the round ID from Rounds page.
          } catch {}
          resolvedRoundId = '';
        }
      }

      return apiService.getBets({
        page,
        pageSize,
        userId: resolvedUserId || undefined,
        roundId: resolvedRoundId || undefined,
        betType: filters.betType || undefined,
      });
    },
    refetchInterval: 30000,
  });

  const grouped = useMemo(() => {
    const items = data?.items || [];
    const map: Record<string, { username: string; total: number; byNumber: Record<string, { amount: number; count: number }> }> = {};
    for (const bet of items) {
      const userId = bet.userId || bet.user?.id || 'unknown';
      const username = bet.user?.username || 'unknown';
      if (!map[userId]) map[userId] = { username, total: 0, byNumber: {} };
      const key = `${bet.betType}:${bet.betValue}`;
      if (!map[userId].byNumber[key]) map[userId].byNumber[key] = { amount: 0, count: 0 };
      map[userId].byNumber[key].amount += bet.amount;
      map[userId].byNumber[key].count += 1;
      map[userId].total += bet.amount;
    }
    return map;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Bets Management</h3>
          <p className="card-description">Per-user bet breakdown with filters</p>
          <div className="mt-2">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                const rows = (data?.items || []).map((b: any) => ({
                  id: b.id,
                  user: b.user?.username || b.userId,
                  round: b.round?.roundNumber || b.roundId,
                  type: b.betType,
                  value: b.betValue,
                  amount: b.amount,
                  status: b.status,
                  placedAt: b.placedAt,
                }));
                exportToCSV('bets.csv', ['id','user','round','type','value','amount','status','placedAt'], rows);
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input input-bordered" placeholder="Filter by User ID or username/email" value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))} />
            <input className="input input-bordered" placeholder="Filter by Round ID" value={filters.roundId}
              onChange={(e) => setFilters((f) => ({ ...f, roundId: e.target.value }))} />
            <select className="select select-bordered" value={filters.betType}
              onChange={(e) => setFilters((f) => ({ ...f, betType: e.target.value }))}>
              <option value="">All Bet Types</option>
              <option value="NUMBER">NUMBER</option>
              <option value="COLOR">COLOR</option>
              <option value="ODD_EVEN">ODD_EVEN</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading bets...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([userId, u]) => (
                <div key={userId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">{u.username}</div>
                    <div className="text-sm text-gray-500">User ID: {userId}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th className="text-left">Bet</th>
                          <th className="text-right">Amount</th>
                          <th className="text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(u.byNumber).map(([key, v]) => (
                          <tr key={key}>
                            <td className="text-left">{key}</td>
                            <td className="text-right">₹{v.amount.toLocaleString('en-IN')}</td>
                            <td className="text-right">{v.count}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="text-left font-semibold">Total</td>
                          <td className="text-right font-semibold">₹{u.total.toLocaleString('en-IN')}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <div className="py-8 text-center text-gray-500">No bets found for current filters.</div>
              )}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>Previous</button>
                  <div className="text-sm text-gray-500">Page {page} of {data.totalPages}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(data.totalPages, p+1))} disabled={page>=data.totalPages}>Next</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetsPage;