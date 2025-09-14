import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { exportToCSV } from '../utils/export';

const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data, isLoading } = useQuery<{ items: any[]; total: number; totalPages: number; page: number }>({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => apiService.getAuditLogs({ page, pageSize }),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Audit Logs</h3>
          <p className="card-description">
            System activity logs and security audit trail
          </p>
          <div className="mt-2">
            <button className="btn btn-outline btn-sm" onClick={() => {
              const rows = (data?.items || []).map((l: any) => ({ id: l.id, action: l.action, target: l.target, targetId: l.targetId, admin: l.admin?.username, createdAt: l.createdAt }));
              exportToCSV('audit-logs.csv', ['id','action','target','targetId','admin','createdAt'], rows);
            }}>Export CSV</button>
          </div>
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading logs...</div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Time</th>
                      <th className="text-left">Admin</th>
                      <th className="text-left">Action</th>
                      <th className="text-left">Target</th>
                      <th className="text-left">Target ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items || []).map((l: any) => (
                      <tr key={l.id}>
                        <td className="text-left text-gray-700">{new Date(l.createdAt).toLocaleString()}</td>
                        <td className="text-left">{l.admin?.username || '-'}</td>
                        <td className="text-left">{l.action}</td>
                        <td className="text-left">{l.target || '-'}</td>
                        <td className="text-left">{l.targetId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.items || data.items.length === 0) && (
                  <div className="text-center py-12 text-gray-500">No logs found.</div>
                )}
              </div>
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
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

export default AuditLogsPage;