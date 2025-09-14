import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const SupportRequestsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-requests', page],
    queryFn: () => apiService.getSupportRequests({ page, pageSize }),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Support Requests</h3>
          <p className="card-description">User help/support submissions</p>
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(data?.items || []).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{r.user?.username || '—'}</div>
                          <div className="text-xs text-gray-500">{r.user?.email || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.title}</td>
                        <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-700">{r.message}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && (data as any).totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>Previous</button>
                  <div className="text-sm text-gray-500">Page {page} of {(data as any).totalPages}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min((data as any).totalPages, p+1))} disabled={page>=(data as any).totalPages}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportRequestsPage;


