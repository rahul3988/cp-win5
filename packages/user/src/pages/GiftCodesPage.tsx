import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { toast } from 'react-hot-toast';
import { 
  Gift, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Wallet,
  History,
  Copy
} from 'lucide-react';

interface GiftCodeHistory {
  id: string;
  code: string;
  amount: number;
  redeemedAt: string;
  status: string;
}

interface WalletBalance {
  betting: number;
  gaming: number;
  bonus: number;
  real?: number;
  coins?: number;
  wageringProgress?: number;
  wageringRequired?: number;
  updatedAt?: string;
}

const GiftCodesPage: React.FC = () => {
  const [giftCode, setGiftCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch wallet balance
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await userService.getWallets();
      return response;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch gift code history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['giftCodeHistory'],
    queryFn: () => userService.getGiftCodeHistory({ page: 1, pageSize: 20 }),
    refetchInterval: 30000,
  });

  // Redeem gift code mutation
  const redeemMutation = useMutation({
    mutationFn: userService.redeemGiftCode,
    onSuccess: (data) => {
      toast.success(data.message || 'Gift code redeemed successfully!');
      setGiftCode('');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['giftCodeHistory'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to redeem gift code';
      toast.error(errorMessage);
    },
  });

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!giftCode.trim()) {
      toast.error('Please enter a gift code');
      return;
    }

    setIsSubmitting(true);
    try {
      await redeemMutation.mutateAsync(giftCode.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const walletData = wallet as WalletBalance;
  const historyData = history?.data as { items: GiftCodeHistory[]; total: number };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gift Codes</h1>
          <p className="text-gray-600">Redeem gift codes to add funds to your gaming wallet!</p>
        </div>

        {/* Wallet Balance */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Wallet className="h-5 w-5 mr-2 text-blue-600" />
            Your Wallet Balance
          </h2>
          {walletLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Loading wallet balance...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-600 mb-1">Betting Wallet</p>
                <p className="text-2xl font-bold text-blue-900">₹{walletData?.betting || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600 mb-1">Gaming Wallet</p>
                <p className="text-2xl font-bold text-green-900">₹{walletData?.gaming || 0}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-600 mb-1">Bonus Balance</p>
                <p className="text-2xl font-bold text-purple-900">₹{walletData?.bonus || 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* Redeem Gift Code */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Gift className="h-5 w-5 mr-2 text-green-600" />
            Redeem Gift Code
          </h2>
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label htmlFor="giftCode" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Gift Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="giftCode"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                  placeholder="Enter your gift code here..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg"
                  disabled={isSubmitting || redeemMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || redeemMutation.isPending || !giftCode.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting || redeemMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Gift className="h-5 w-5 mr-2" />
                  )}
                  Redeem
                </button>
              </div>
            </div>
          </form>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">How to redeem:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter your gift code in the field above</li>
              <li>• Click "Redeem" to add funds to your gaming wallet</li>
              <li>• Each gift code can only be used once</li>
              <li>• Funds are added instantly to your gaming wallet</li>
            </ul>
          </div>
        </div>

        {/* Gift Code History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <History className="h-5 w-5 mr-2 text-purple-600" />
            Redemption History
          </h2>
          
          {historyLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-gray-600">Loading redemption history...</p>
            </div>
          ) : historyData?.items?.length > 0 ? (
            <div className="space-y-3">
              {historyData.items.map((record) => (
                <div key={record.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Gift className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 font-mono">{record.code}</p>
                        <button
                          onClick={() => copyToClipboard(record.code)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Redeemed on {new Date(record.redeemedAt).toLocaleDateString()} at{' '}
                        {new Date(record.redeemedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+₹{record.amount}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
              
              {historyData.total > historyData.items.length && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Showing {historyData.items.length} of {historyData.total} redemptions
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No gift codes redeemed yet</p>
              <p className="text-sm text-gray-500">Redeem your first gift code above!</p>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {redeemMutation.isSuccess && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Gift code redeemed successfully!
          </div>
        )}

        {redeemMutation.isError && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Failed to redeem gift code
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftCodesPage;
