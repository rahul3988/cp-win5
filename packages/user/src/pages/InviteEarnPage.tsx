import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { toast } from 'react-hot-toast';
import { 
  Copy, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ReferralStats {
  referralCode: string;
  invitationLink: string;
  totalReferrals: number;
  recentReferrals: Array<{
    id: string;
    username: string;
    referralCode: string;
    joinedAt: string;
  }>;
}

const InvitePage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  // Fetch referral stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['referralStats'],
    queryFn: userService.getReferralStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Copy referral code to clipboard
  const copyReferralCode = async () => {
    if (stats?.referralCode) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(stats.referralCode);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = stats.referralCode;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        setCopied(true);
        toast.success('Referral code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy referral code');
      }
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    if (stats?.invitationLink) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(stats.invitationLink);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = stats.invitationLink;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy referral link');
      }
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">Failed to load referral information</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const referralData = stats as ReferralStats;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-8 mb-6">
            <h1 className="text-4xl font-bold mb-2">🎯 Invite Friends</h1>
            <p className="text-purple-100 text-lg">Share your referral link and invite friends to join!</p>
            <div className="mt-4 flex justify-center items-center space-x-4">
              <div className="bg-white/20 rounded-full px-4 py-2">
                <span className="text-sm font-medium">🔗 Easy Sharing</span>
              </div>
              <div className="bg-white/20 rounded-full px-4 py-2">
                <span className="text-sm font-medium">📊 Track Referrals</span>
              </div>
              <div className="bg-white/20 rounded-full px-4 py-2">
                <span className="text-sm font-medium">👥 Build Community</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-200 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-100">Total Referrals</p>
                <p className="text-2xl font-bold">{referralData?.totalReferrals || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Referral Information</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referral Code
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={referralData?.referralCode || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-900 font-mono"
                />
                <button
                  onClick={copyReferralCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 flex items-center"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referral Link
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={referralData?.invitationLink || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-900 text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 flex items-center"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Recent Referrals */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">👥 Recent Referrals</h2>
            <div className="ml-4 bg-gradient-to-r from-blue-400 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              {referralData?.recentReferrals?.length || 0} Total
            </div>
          </div>
          {referralData?.recentReferrals && referralData.recentReferrals.length > 0 ? (
            <div className="space-y-3">
              {referralData.recentReferrals.slice(0, 5).map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{referral.username}</p>
                      <p className="text-sm text-gray-500">
                        Joined {new Date(referral.joinedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        Referral Code: {referral.referralCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200">
                      ✅ Referred
                    </span>
                  </div>
                </div>
              ))}
              {referralData.recentReferrals.length > 5 && (
                <div className="text-center pt-4">
                  <span className="text-sm text-gray-500">
                    And {referralData.recentReferrals.length - 5} more referrals...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No referrals yet</p>
              <p className="text-sm text-gray-400 mt-2">Share your referral link to start building your network!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
