import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Smartphone, ArrowRight, Loader2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '../services/paymentService';
import { userService } from '../services/userService';

interface PaymentOptions {
  upi: {
    methods: Array<{
      id: string;
      name: string;
      displayName: string;
      qrCodeUrl?: string;
      upiId?: string;
      minAmount: number;
      maxAmount: number;
    }>;
    minAmount: number;
    maxAmount: number;
    currency: string;
    quickAmounts: number[];
  };
  usdt: {
    method: {
      id: string;
      name: string;
      displayName: string;
      qrCodeUrl?: string;
      walletAddress?: string;
      minAmount: number;
      maxAmount: number;
    };
    minAmount: number;
    maxAmount: number;
    currency: string;
    conversionRate: number;
    quickAmounts: number[];
  } | null;
}

const DepositPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'usdt' | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch payment options from backend
  const { data: paymentOptions, isLoading: optionsLoading } = useQuery<PaymentOptions>({
    queryKey: ['payment-options'],
    queryFn: () => paymentService.getPaymentOptions(),
  });

  // Fetch promotions config for deposit bonus
  const { data: promotionsConfig } = useQuery({
    queryKey: ['user-promotions-config'],
    queryFn: () => userService.getPromotionsConfig(),
    staleTime: 60000,
  });

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleSubmit = async () => {
    if (!selectedMethod || !amount) {
      toast.error('Please select a payment method and enter amount');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!paymentOptions) {
      toast.error('Payment options not loaded');
      return;
    }

    // Validate amount against limits
    if (selectedMethod === 'upi') {
      if (amountValue < paymentOptions.upi.minAmount || amountValue > paymentOptions.upi.maxAmount) {
        toast.error(`Amount must be between ₹${paymentOptions.upi.minAmount} and ₹${paymentOptions.upi.maxAmount}`);
        return;
      }
    } else if (selectedMethod === 'usdt' && paymentOptions.usdt) {
      if (amountValue < paymentOptions.usdt.minAmount || amountValue > paymentOptions.usdt.maxAmount) {
        toast.error(`Amount must be between $${paymentOptions.usdt.minAmount} and $${paymentOptions.usdt.maxAmount}`);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Navigate to cashier with payment details
      const paymentData = {
        method: selectedMethod,
        amount: amountValue,
        currency: selectedMethod === 'upi' ? 'INR' : 'USD',
        paymentOptions: paymentOptions,
      };

      navigate('/cashier', { state: paymentData });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment request');
    } finally {
      setIsLoading(false);
    }
  };

  if (optionsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500 mx-auto mb-4" />
          <p className="text-gray-300">Loading payment options...</p>
        </div>
      </div>
    );
  }

  if (!paymentOptions) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load payment options</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gold-500 text-white px-4 py-2 rounded hover:bg-gold-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Deposit Funds</h1>
          <p className="text-gray-400">Choose your preferred payment method</p>
        </div>

        {/* Deposit Bonus Information */}
        {promotionsConfig && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-yellow-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">🎉 Deposit Bonus Available!</h2>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-white text-lg">
                  Get <span className="text-yellow-300 font-bold text-xl">{promotionsConfig.depositBonusPct ?? 5}%</span> bonus on every deposit!
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  Bonus is credited to your Betting wallet after deposit approval
                </p>
              </div>

              {/* Quick Deposit Tiers with Bonus */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {([500, 1000, 2000, 5000, 10000, 20000] as number[]).map((depositAmount) => {
                  const bonusPct = Number(promotionsConfig.depositBonusPct ?? 5);
                  const bonusAmount = Math.round((depositAmount * bonusPct) / 100);
                  const totalAmount = depositAmount + bonusAmount;
                  
                  return (
                    <div 
                      key={depositAmount}
                      className="bg-gray-800/70 border border-yellow-400/20 rounded-lg p-3 text-center hover:bg-gray-700/70 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedMethod('upi');
                        setAmount(depositAmount.toString());
                      }}
                    >
                      <div className="text-white font-semibold text-sm mb-1">
                        ₹{depositAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-yellow-300 text-xs mb-1">
                        + ₹{bonusAmount.toLocaleString('en-IN')} bonus
                      </div>
                      <div className="text-gray-400 text-xs">
                        Total: ₹{totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center mt-4">
                <p className="text-xs text-gray-400">
                  💡 Click any amount above to auto-fill and select UPI payment
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* UPI Option */}
            <div 
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMethod === 'upi' 
                  ? 'border-gold-500 bg-gold-500/10' 
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
              onClick={() => setSelectedMethod('upi')}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">UPI Payment</h3>
                  <p className="text-gray-400">Pay with PhonePe, Google Pay, Paytm</p>
                </div>
              </div>
              <div className="text-sm text-gray-300">
                <p>Min: ₹{paymentOptions.upi.minAmount}</p>
                <p>Max: ₹{paymentOptions.upi.maxAmount}</p>
              </div>
            </div>

            {/* USDT Option */}
            {paymentOptions.usdt && (
              <div 
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMethod === 'usdt' 
                    ? 'border-gold-500 bg-gold-500/10' 
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
                onClick={() => setSelectedMethod('usdt')}
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">USDT Payment</h3>
                    <p className="text-gray-400">Pay with USDT cryptocurrency</p>
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  <p>Min: ${paymentOptions.usdt.minAmount}</p>
                  <p>Max: ${paymentOptions.usdt.maxAmount}</p>
                  <p>Rate: 1 USDT = ₹{paymentOptions.usdt.conversionRate}</p>
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          {selectedMethod && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Enter Amount ({selectedMethod === 'upi' ? 'INR' : 'USD'})
              </h3>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={`Enter amount in ${selectedMethod === 'upi' ? 'INR' : 'USD'}`}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-gold-500 focus:outline-none"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {(selectedMethod === 'upi' ? paymentOptions.upi.quickAmounts : paymentOptions.usdt?.quickAmounts || []).map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => handleQuickAmount(quickAmount)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      {selectedMethod === 'upi' ? `₹${quickAmount}` : `$${quickAmount}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Validation and Bonus Calculation */}
              {amount && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    {selectedMethod === 'upi' ? (
                      <p>Amount: ₹{amount}</p>
                    ) : (
                      <p>
                        Amount: ${amount} 
                        {paymentOptions.usdt && (
                          <span className="ml-2">
                            (≈ ₹{(parseFloat(amount) * paymentOptions.usdt.conversionRate).toFixed(2)})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  {/* Bonus Calculation for UPI deposits */}
                  {selectedMethod === 'upi' && promotionsConfig && parseFloat(amount) > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-300 text-sm font-semibold">
                            🎁 You'll get {promotionsConfig.depositBonusPct ?? 5}% bonus!
                          </p>
                          <p className="text-gray-300 text-xs">
                            Bonus: ₹{Math.round((parseFloat(amount) * (promotionsConfig.depositBonusPct ?? 5)) / 100).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-semibold">
                            Total: ₹{(parseFloat(amount) + Math.round((parseFloat(amount) * (promotionsConfig.depositBonusPct ?? 5)) / 100)).toLocaleString('en-IN')}
                          </p>
                          <p className="text-gray-400 text-xs">Including bonus</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {selectedMethod && amount && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {selectedMethod === 'upi' && promotionsConfig ? 'Continue to Payment (Get Bonus!)' : 'Continue to Payment'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositPage;