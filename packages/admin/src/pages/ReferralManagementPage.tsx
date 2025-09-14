import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Users, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const ReferralManagementPage: React.FC = () => {
  const { userId } = useParams();
  const [copied, setCopied] = useState(false);

  const { data: referralStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-referral-stats', userId],
    queryFn: () => apiService.getReferralStats(userId as string),
    enabled: !!userId,
  });

  const { data: referralRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-referral-records', userId],
    queryFn: () => apiService.getReferralRecords(userId as string, { page: 1, limit: 20 }),
    enabled: !!userId,
  });

  const copyReferralLink = async () => {
    try {
      if (referralStats?.invitationLink) {
        await navigator.clipboard.writeText(referralStats.invitationLink);
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      toast.error('Failed to copy referral link');
    }
  };

  if (statsLoading || recordsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Referral Management</h2>
          <p className="text-gray-600">View and manage user referral statistics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Referral Code</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono">
            {referralStats?.referralCode || 'N/A'}
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-green-600" />
            <span className="text-sm font-medium text-green-600">Total Referrals</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {referralStats?.totalReferrals || 0}
          </div>
        </div>
      </div>

      {/* Referral Link */}
      {referralStats?.invitationLink && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral Link</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={referralStats.invitationLink}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
            />
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}


      {/* Recent Referrals */}
      {referralRecords?.records && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Referrals</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referral Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referralRecords.records.map((ref: any) => (
                  <tr key={ref.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ref.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {ref.referralCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ref.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Referred
                      </span>
                    </td>
                  </tr>
                ))}
                {referralRecords.records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No referrals found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralManagementPage;
