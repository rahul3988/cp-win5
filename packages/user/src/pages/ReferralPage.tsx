import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Share2, Copy, Check, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';

const ReferralPage: React.FC = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'records'>('info');
  
  const { data: referralStats, isLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => userService.getReferralStats(),
    refetchInterval: 30000,
  });

  const { data: referralRecords } = useQuery({
    queryKey: ['referral-records'],
    queryFn: () => userService.getReferralRecords(),
    enabled: activeTab === 'records',
  });

  const copyReferralLink = async () => {
    try {
      if (referralStats?.invitationLink) {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(referralStats.invitationLink);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = referralStats.invitationLink;
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
      } else {
        toast.error('Referral link not available');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy referral link');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-gold-600 to-gold-700 text-white p-4">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="text-white hover:text-gray-200">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-semibold">Referral Program</h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 space-y-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-400">Total Referrals</span>
          </div>
          <div className="text-2xl font-bold text-white">{referralStats?.totalReferrals || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'bg-gold-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Referral Info
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'records'
                ? 'bg-gold-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Referral Records
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'info' && (
        <div className="px-4 pb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">How Referrals Work</h3>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                <div>
                  <p className="font-medium text-white">Share Your Link</p>
                  <p className="text-sm">Share your unique referral link with friends and family</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                <div>
                  <p className="font-medium text-white">They Join</p>
                  <p className="text-sm">When they register using your link, they become your referral</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gold-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                <div>
                  <p className="font-medium text-white">Track Progress</p>
                  <p className="text-sm">Monitor your referrals and see who joined through your link</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="px-4 pb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">Recent Referrals</h3>
            {referralRecords?.records?.length > 0 ? (
              <div className="space-y-2">
                {referralRecords.records.map((ref: any) => (
                  <div key={ref.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{ref.username}</div>
                      <div className="text-sm text-gray-400">
                        Joined: {new Date(ref.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs px-2 py-1 rounded bg-blue-500 text-white">
                        Referred
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No referrals yet</p>
                <p className="text-sm text-gray-500 mt-2">Share your link to start getting referrals!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Section */}
      <div className="px-4 pb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">Share your referral link</h3>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={referralStats?.invitationLink || ''}
              readOnly
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
            />
            <button
              onClick={copyReferralLink}
              className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-gold-400" />
            <span className="text-sm text-gray-300">Share this link with friends to invite them to join!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;
