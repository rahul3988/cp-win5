import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { Link } from 'react-router-dom';
import { exportToCSV } from '../utils/export';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => apiService.getUsers({ pageSize: 50, search: search || undefined }),
    refetchInterval: 30000,
  });

  const items = data?.items || [];

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success('UID copied to clipboard');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        toast.success('UID copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy UID');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Users Management</h3>
          <p className="card-description">
            Manage user accounts, balances, and permissions
          </p>
          <div className="mt-2 flex gap-2 items-center">
            <input
              className="input input-bordered"
              placeholder="Search username, email, or user ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                const rows = items.map((u: any) => ({
                  id: u.id,
                  username: u.username,
                  email: u.email,
                  balance: u.balance,
                  gameCredit: u.gameCredit,
                  isActive: u.isActive,
                  createdAt: u.createdAt,
                }));
                exportToCSV('users.csv', ['id','username','email','balance','gameCredit','isActive','createdAt'], rows);
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-left">User ID</th>
                    <th className="text-left">Username</th>
                    <th className="text-left">Email</th>
                    <th className="text-right">Betting Wallet</th>
                    <th className="text-right">Gaming Wallet</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u: any) => (
                    <tr key={u.id}>
                      <td className="text-left font-mono text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span>{(() => {
                            try {
                              const hex = String(u.id || '').replace(/-/g, '');
                              const num = BigInt('0x' + hex) % BigInt(100000000);
                              const s = num.toString();
                              return s.padStart(8, '0');
                            } catch {
                              return String(u.id || '').slice(0, 8);
                            }
                          })()}</span>
                          <button
                            onClick={() => copyToClipboard(u.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Copy full UID"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="text-left">
                        <Link className="text-primary-600 hover:underline" to={`/users/${u.id}`}>{u.username}</Link>
                      </td>
                      <td className="text-left">{u.email}</td>
                      <td className="text-right">₹{(u.walletBetting ?? 0).toLocaleString('en-IN')}</td>
                      <td className="text-right">₹{(u.walletGaming ?? 0).toLocaleString('en-IN')}</td>
                      <td className="text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={async () => {
                            const temp = prompt(`Enter temporary password for ${u.username} (min 6 chars)`);
                            if (!temp) return;
                            if (temp.length < 6) {
                              toast.error('Temporary password must be at least 6 characters');
                              return;
                            }
                            try {
                              await apiService.setTemporaryPassword(u.id, temp);
                              toast.success('Temporary password set. Ask user to login and change password.');
                            } catch (err: any) {
                              toast.error(err.response?.data?.error || 'Failed to set temporary password');
                            }
                          }}
                        >
                          Set Temp Password
                        </button>
                        <button
                          className="btn btn-outline btn-xs ml-2"
                          onClick={async () => {
                            const msg = prompt('Send message to user');
                            if (!msg) return;
                            await fetch(`/api/admin/users/${u.id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }), credentials: 'include' });
                            alert('Message sent');
                          }}
                        >
                          Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="text-center py-12 text-gray-500">No users found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;