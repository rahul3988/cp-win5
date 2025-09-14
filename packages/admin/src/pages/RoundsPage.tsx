import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { exportToCSV } from '../utils/export';
import { useSocket } from '../contexts/SocketContext';

const RoundsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-rounds', page],
    queryFn: () => apiService.getRounds({ page, pageSize }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!socket) return;
    const onCompleted = () => queryClient.invalidateQueries({ queryKey: ['admin-rounds'] });
    const onWinner = () => queryClient.invalidateQueries({ queryKey: ['admin-rounds'] });
    socket.on('round_completed', onCompleted);
    socket.on('round_winner', onWinner);
    return () => {
      socket.off('round_completed', onCompleted);
      socket.off('round_winner', onWinner);
    };
  }, [socket, queryClient, isConnected]);
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Game Rounds</h3>
          <p className="card-description">
            View game round history and statistics
          </p>
          <div className="mt-2">
            <button className="btn btn-outline btn-sm" onClick={() => {
              const rows = (data?.items || []).map((r: any) => ({ id: r.id, number: r.roundNumber, winningNumber: r.winningNumber, totalBetAmount: r.totalBetAmount, totalPayout: r.totalPayout, status: r.status }));
              exportToCSV('rounds.csv', ['id','number','winningNumber','totalBetAmount','totalPayout','status'], rows);
            }}>Export CSV</button>
          </div>
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading rounds...</div>
          ) : (
            <>
              {(data?.items && data.items.length > 0) && (
                <div className="mb-6 p-4 rounded-lg border bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Latest Round</div>
                      <div className="text-xl font-semibold">#{data.items[0].roundNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Winning Number</div>
                      <div className="text-3xl font-bold text-gray-900">{data.items[0].winningNumber ?? '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Round</th>
                      <th className="text-left">Winning</th>
                      <th className="text-right">Total Bet</th>
                      <th className="text-right">Total Payout</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items || []).map((r: any) => (
                      <tr key={r.id}>
                        <td className="text-left">#{r.roundNumber}</td>
                        <td className="text-left">{r.winningNumber ?? '-'}</td>
                        <td className="text-right">₹{(r.totalBetAmount ?? 0).toLocaleString('en-IN')}</td>
                        <td className="text-right">₹{(r.totalPayout ?? 0).toLocaleString('en-IN')}</td>
                        <td className="text-left">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.items || data.items.length === 0) && (
                  <div className="text-center py-12 text-gray-500">No rounds found.</div>
                )}
              </div>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>Previous</button>
                  <div className="text-sm text-gray-500">Page {page} of {data.totalPages}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(data.totalPages, p+1))} disabled={page>=data.totalPages}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundsPage;