import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const PAGE_SIZE = 20;

const UserDetailsPage: React.FC = () => {
  const { userId } = useParams();
  const [betsPage, setBetsPage] = useState(1);
  const [txPage, setTxPage] = useState(1);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-details', userId],
    queryFn: () => apiService.getUserById(userId as string),
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: betsData } = useQuery({
    queryKey: ['user-bets', userId, betsPage],
    queryFn: () => apiService.getBets({ page: betsPage, pageSize: PAGE_SIZE, userId: userId as string }),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const { data: txData } = useQuery({
    queryKey: ['user-transactions', userId, txPage],
    queryFn: () => apiService.getTransactions({ page: txPage, pageSize: PAGE_SIZE, userId: userId as string }),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const bets = betsData?.items || [];
  const txs = txData?.items || [];

  const { data: wallets } = useQuery({
    queryKey: ['user-wallets', userId],
    queryFn: () => apiService.getUserWallets(userId as string),
    enabled: !!userId,
    staleTime: 30000,
  });
  const [coinAdjust, setCoinAdjust] = useState({ amount: 0, reason: '' });

  const summary = useMemo(() => {
    const totalBetAmount = bets.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const totalBets = bets.length;
    const wonBets = bets.filter((b: any) => String(b.status).toUpperCase() === 'WON').length;
    const lostBets = bets.filter((b: any) => String(b.status).toUpperCase() === 'LOST').length;
    const pendingBets = bets.filter((b: any) => String(b.status).toUpperCase() === 'PENDING').length;
    const cashback = txs
      .filter((t: any) => String(t.type).includes('CASHBACK'))
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    return { totalBetAmount, totalBets, wonBets, lostBets, pendingBets, cashback };
  }, [bets, txs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Details</h2>
          <p className="text-sm text-gray-500">Betting history, outcomes, and wallet flow</p>
        </div>
        <Link to="/users" className="btn btn-outline btn-sm">Back to Users</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Profile</h3>
          </div>
          <div className="card-content space-y-2">
            {userLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : user ? (
              <>
                <div><span className="text-gray-500">Username:</span> {user.username}</div>
                <div><span className="text-gray-500">Email:</span> {user.email}</div>
                <div><span className="text-gray-500">Betting Wallet:</span> ₹{(user.walletBetting ?? 0).toLocaleString('en-IN')}</div>
                <div><span className="text-gray-500">Gaming Wallet:</span> ₹{(user.walletGaming ?? 0).toLocaleString('en-IN')}</div>
                <div><span className="text-gray-500">Status:</span> {user.isActive ? 'Active' : 'Inactive'}</div>
              </>
            ) : (
              <div className="text-red-500">User not found</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bet Summary</h3>
          </div>
          <div className="card-content space-y-1">
            <div><span className="text-gray-500">Total Bets:</span> {summary.totalBets}</div>
            <div><span className="text-gray-500">Total Amount Bet:</span> ₹{summary.totalBetAmount.toLocaleString('en-IN')}</div>
            <div><span className="text-gray-500">Won:</span> {summary.wonBets}</div>
            <div><span className="text-gray-500">Lost:</span> {summary.lostBets}</div>
            <div><span className="text-gray-500">Pending:</span> {summary.pendingBets}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cashback & Credits</h3>
          </div>
          <div className="card-content space-y-1">
            <div><span className="text-gray-500">Cashback Total:</span> ₹{summary.cashback.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Wallets</h3>
          </div>
          <div className="card-content space-y-1">
            <div><span className="text-gray-500">Real:</span> ₹{(wallets?.real ?? 0).toLocaleString('en-IN')}</div>
            <div><span className="text-gray-500">Bonus:</span> ₹{(wallets?.bonus ?? 0).toLocaleString('en-IN')}</div>
            <div><span className="text-gray-500">Coins:</span> {(wallets?.coins ?? 0).toLocaleString('en-IN')}</div>
            <div><span className="text-gray-500">Gaming:</span> ₹{(wallets?.gaming ?? 0).toLocaleString('en-IN')}</div>
            <div className="text-sm text-gray-500">Wagering: {(wallets?.wageringProgress ?? 0)} / {(wallets?.wageringRequired ?? 0)}</div>
            <form className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2" onSubmit={async (e) => {
              e.preventDefault();
              if (!userId) return;
              await apiService.adjustUserCoins(userId, coinAdjust.amount, coinAdjust.reason || 'Admin coin adjustment');
              setCoinAdjust({ amount: 0, reason: '' });
              window.alert('Coins updated');
            }}>
              <input type="number" step="1" className="form-input" placeholder="Coins +/-" value={coinAdjust.amount} onChange={(e) => setCoinAdjust({ ...coinAdjust, amount: Number(e.target.value) })} />
              <input type="text" className="form-input" placeholder="Reason" value={coinAdjust.reason} onChange={(e) => setCoinAdjust({ ...coinAdjust, reason: e.target.value })} />
              <button className="btn btn-primary">Update Coins</button>
            </form>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Bets</h3>
          <p className="card-description">Recent bets placed by this user</p>
        </div>
        <div className="card-content overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left">Round</th>
                <th className="text-left">Type</th>
                <th className="text-left">Value</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Potential Payout</th>
                <th className="text-center">Status</th>
                <th className="text-left">Placed At</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b: any) => (
                <tr key={b.id}>
                  <td className="text-left">{b.round?.roundNumber ?? '-'}</td>
                  <td className="text-left">{String(b.betType).toUpperCase()}</td>
                  <td className="text-left">{(() => { try { const v = JSON.parse(b.betValue || 'null'); return typeof v === 'object' ? JSON.stringify(v) : String(v); } catch { return String(b.betValue); } })()}</td>
                  <td className="text-right">₹{(b.amount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="text-right">₹{(b.potentialPayout ?? 0).toLocaleString('en-IN')}</td>
                  <td className="text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${String(b.status).toUpperCase() === 'WON' ? 'bg-green-100 text-green-800' : String(b.status).toUpperCase() === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {String(b.status).toUpperCase()}
                    </span>
                  </td>
                  <td className="text-left">{b.placedAt ? new Date(b.placedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bets.length === 0 && (
            <div className="text-center py-8 text-gray-500">No bets found.</div>
          )}
          <div className="flex items-center justify-end gap-2 mt-3">
            <button className="btn btn-outline btn-sm" disabled={betsPage <= 1} onClick={() => setBetsPage(p => Math.max(1, p - 1))}>Prev</button>
            <span className="text-sm text-gray-500">Page {betsPage} / {betsData?.totalPages || 1}</span>
            <button className="btn btn-outline btn-sm" disabled={betsPage >= (betsData?.totalPages || 1)} onClick={() => setBetsPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transactions</h3>
          <p className="card-description">Deposits, withdrawals, bet flows, cashback, etc.</p>
        </div>
        <div className="card-content overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left">Type</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Status</th>
                <th className="text-left">Description</th>
                <th className="text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t: any) => (
                <tr key={t.id}>
                  <td className="text-left">{String(t.type).toUpperCase()}</td>
                  <td className="text-right">₹{(t.amount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${String(t.status).toUpperCase() === 'COMPLETED' ? 'bg-green-100 text-green-800' : String(t.status).toUpperCase() === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {String(t.status).toUpperCase()}
                    </span>
                  </td>
                  <td className="text-left">{t.description || '-'}</td>
                  <td className="text-left">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && (
            <div className="text-center py-8 text-gray-500">No transactions found.</div>
          )}
          <div className="flex items-center justify-end gap-2 mt-3">
            <button className="btn btn-outline btn-sm" disabled={txPage <= 1} onClick={() => setTxPage(p => Math.max(1, p - 1))}>Prev</button>
            <span className="text-sm text-gray-500">Page {txPage} / {txData?.totalPages || 1}</span>
            <button className="btn btn-outline btn-sm" disabled={txPage >= (txData?.totalPages || 1)} onClick={() => setTxPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Invite & Earn</h3>
          <p className="card-description">Referral system and earnings (same as User Panel)</p>
        </div>
        <div className="card-content space-y-6">
          <p className="text-gray-600">User details and management options will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;


