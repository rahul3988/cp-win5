import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

const FeedbacksPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: () => apiService.getFeedbacks({ pageSize: 100 }),
    refetchInterval: 30000,
  });

  const respond = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => apiService.respondToNotification(id, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feedbacks'] })
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">User Feedback</h3>
          <p className="card-description">View and respond to feedback</p>
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3"></th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="btn btn-outline btn-sm" onClick={() => {
                          const msg = prompt('Reply message');
                          if (!msg) return;
                          respond.mutate({ id: r.id, message: msg });
                        }}>Respond</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbacksPage;


