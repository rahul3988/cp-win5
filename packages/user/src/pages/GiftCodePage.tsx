import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Gift,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../services/userService';

const GiftCodePage: React.FC = () => {
  const navigate = useNavigate();
  const [giftCode, setGiftCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeemGiftCode = async () => {
    if (!giftCode.trim()) {
      toast.error('Please enter a gift code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await userService.redeemGiftCode(giftCode.trim());
      toast.success(`Gift code redeemed successfully! You received ₹${result.amount || '0'}`);
      setGiftCode('');
    } catch (error: any) {
      console.error('Gift code redemption failed:', error);
      toast.error(error.response?.data?.error || 'Failed to redeem gift code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-gold-600 to-gold-700 text-white p-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Gift Code</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Gift Illustration */}
        <div className="bg-gradient-to-br from-gold-600 to-gold-700 rounded-lg p-6 text-white text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-orange-500 rounded-lg flex items-center justify-center">
            <Gift className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Redeem Gift Code</h2>
          <p className="text-sm opacity-90 mb-4">Enter your gift code below to receive rewards</p>
        </div>

        {/* Gift Code Form */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gift Code
              </label>
              <input
                type="text"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                placeholder="Enter gift code"
                className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 placeholder-gray-400"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={handleRedeemGiftCode}
              disabled={isLoading || !giftCode.trim()}
              className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg font-semibold hover:from-gold-700 hover:to-gold-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Redeem Gift Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">How to use gift codes:</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Enter the gift code exactly as provided</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Gift codes are case-insensitive</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Rewards are added directly to your gaming wallet</span>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span>Each gift code can only be used once per user</span>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gold-400" />
            <h3 className="font-medium text-white">Redemption History</h3>
          </div>
          
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
              <Gift className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-400">No redemption history yet</p>
            <p className="text-sm text-gray-500 mt-1">Your gift code redemptions will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCodePage;
