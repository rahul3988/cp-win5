import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { toast } from 'react-hot-toast';

const RedeemCodePage: React.FC = () => {
  const [giftCode, setGiftCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, tokens } = useAuth();

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCode.trim() || loading) return;
    
    // Check if user is authenticated
    if (!user || !tokens?.accessToken) {
      toast.error('Please log in to redeem gift codes');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await userService.redeemGiftCode(giftCode);
      toast.success(`Gift code redeemed successfully! ₹${result.amount} added to your gaming wallet.`);
      setGiftCode('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to redeem gift code';
      
      // Handle specific error cases
      if (errorMessage.includes('Invalid gift code')) {
        toast.error('Invalid Gift Code');
      } else if (errorMessage.includes('expired')) {
        toast.error('Gift Code Expired');
      } else if (errorMessage.includes('already redeemed')) {
        toast.error('Gift Code Already Redeemed');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Redeem Gift Code</h3>
          <p className="card-description">Enter your event or partner code</p>
        </div>
        <div className="card-content">
          <form
            className="flex gap-2"
            onSubmit={handleRedeem}
          >
            <input
              className="form-input flex-1"
              placeholder="Enter code"
              value={giftCode}
              onChange={(e) => setGiftCode(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Redeeming...' : 'Redeem'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RedeemCodePage;





