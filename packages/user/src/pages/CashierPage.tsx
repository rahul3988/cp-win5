import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  QrCode, 
  Copy, 
  ExternalLink, 
  ArrowLeft, 
  CheckCircle, 
  Clock,
  Smartphone,
  CreditCard,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';

interface PaymentData {
  method: 'upi' | 'usdt';
  amount: number;
  currency: string;
  paymentOptions: {
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
  };
}

const CashierPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [utrCode, setUtrCode] = useState('');
  const [txId, setTxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentData = location.state as PaymentData;

  // Redirect if no payment data
  useEffect(() => {
    if (!paymentData) {
      navigate('/deposit');
    }
  }, [paymentData, navigate]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(`${label} copied to clipboard`);
    }
  };

  // Generate UPI deep link
  const generateUpiLink = (upiMethod: any) => {
    if (!upiMethod || !upiMethod.upiId) {
      toast.error(`${upiMethod?.displayName || 'UPI'} method not available`);
      return;
    }

    const upiId = upiMethod.upiId;
    const merchantName = 'Win5x';
    const amount = paymentData.amount;
    const userId = user?.id?.slice(-8) || 'UID';
    
    const deepLink = `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amount}&cu=INR&tn=Deposit for ${userId}`;
    
    try {
      window.open(deepLink, '_blank');
      toast.success(`Opening ${upiMethod.displayName}...`);
    } catch (error) {
      toast.error('Failed to open UPI app');
    }
  };

  // Submit UTR for UPI payment
  const submitUtrMutation = useMutation({
    mutationFn: (data: { paymentMethodId: string; amount: number; utrCode: string }) => {
      return paymentService.submitUtr(data);
    },
    onSuccess: (data) => {
      toast.success('UTR submitted successfully! Your deposit is pending approval.');
      navigate('/deposits');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit UTR');
    },
  });

  // Submit TxID for USDT payment
  const submitTxIdMutation = useMutation({
    mutationFn: (data: { paymentMethodId: string; amount: number; usdtHash: string }) => {
      return paymentService.submitTxId(data);
    },
    onSuccess: (data) => {
      toast.success('Transaction ID submitted successfully! Your deposit is pending approval.');
      navigate('/deposits');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit Transaction ID');
    },
  });

  const handleUtrSubmit = async () => {
    if (!utrCode.trim()) {
      toast.error('Please enter UTR code');
      return;
    }
    
    // Validate UTR: must be exactly 12 digits
    const utrRegex = /^\d{12}$/;
    if (!utrRegex.test(utrCode)) {
      toast.error('UTR must be exactly 12 digits');
      return;
    }
    
    if (!paymentData.paymentOptions.upi.methods.length) {
      toast.error('No UPI methods available');
      return;
    }
    
    const primaryUpiMethod = paymentData.paymentOptions.upi.methods[0];
    
    setIsSubmitting(true);
    try {
      await submitUtrMutation.mutateAsync({
        paymentMethodId: primaryUpiMethod.id,
        amount: paymentData.amount,
        utrCode: utrCode.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTxIdSubmit = async () => {
    if (!txId.trim()) {
      toast.error('Please enter Transaction ID');
      return;
    }
    
    if (!paymentData.paymentOptions.usdt?.method) {
      toast.error('USDT method not available');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitTxIdMutation.mutateAsync({
        paymentMethodId: paymentData.paymentOptions.usdt.method.id,
        amount: paymentData.amount,
        usdtHash: txId.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!paymentData) {
  return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">No payment data found</p>
          <button 
            onClick={() => navigate('/deposit')} 
            className="bg-gold-500 text-white px-4 py-2 rounded hover:bg-gold-600 transition-colors"
          >
            Go to Deposit
          </button>
        </div>
      </div>
    );
  }

  const primaryUpiMethod = paymentData.paymentOptions.upi.methods[0];
  const usdtMethod = paymentData.paymentOptions.usdt?.method;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
                  <button
            onClick={() => navigate('/deposit')}
            className="mr-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
            <ArrowLeft className="h-6 w-6" />
                  </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Payment Details</h1>
            <p className="text-gray-400">
              {paymentData.method === 'upi' ? 'UPI Payment' : 'USDT Payment'} - {paymentData.currency} {paymentData.amount}
                </p>
              </div>
            </div>

        <div className="max-w-4xl mx-auto">
          {paymentData.method === 'upi' ? (
            /* UPI Payment Section */
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center mb-6">
                <Smartphone className="h-8 w-8 text-blue-500 mr-3" />
                <h2 className="text-2xl font-semibold text-white">UPI Payment</h2>
              </div>

              {/* QR Code */}
              <div className="text-center mb-6">
                <div className="w-64 h-64 mx-auto bg-white rounded-lg flex items-center justify-center mb-4">
                  {primaryUpiMethod?.qrCodeUrl ? (
                    <img 
                      src={`/uploads${primaryUpiMethod.qrCodeUrl.replace('/uploads', '')}`}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain rounded-lg"
                      crossOrigin="anonymous"
                      onError={(e) => { 
                        console.error('Failed to load QR code:', e);
                        e.currentTarget.style.display = 'none'; 
                        e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                      }}
                      onLoad={() => console.log('QR code loaded successfully')}
                    />
                  ) : null}
                  <QrCode className={`h-32 w-32 text-gray-400 ${primaryUpiMethod?.qrCodeUrl ? 'hidden' : ''}`} />
                </div>
                <p className="text-sm text-gray-300">Scan QR code with any UPI app</p>
              </div>
              
              {/* UPI ID */}
              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-2">UPI ID:</p>
                <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    value={primaryUpiMethod?.upiId || 'UPI ID not available'}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-white font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(primaryUpiMethod?.upiId || '', 'UPI ID')} 
                    className="bg-gold-500 text-white px-3 py-1 rounded text-sm hover:bg-gold-600 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* UPI App Buttons */}
              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-3">Or pay with:</p>
                <div className="grid grid-cols-1 gap-2">
                  {paymentData.paymentOptions.upi.methods.map((upiMethod: any, index: number) => (
                  <button
                      key={upiMethod.id || index}
                      onClick={() => generateUpiLink(upiMethod)}
                    className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center" 
                        style={{ 
                          backgroundColor: upiMethod.name === 'phonepe' ? '#5F259F' : 
                                          upiMethod.name === 'googlepay' ? '#4285F4' : 
                                          upiMethod.name === 'paytm' ? '#00BAF2' : '#6B7280' 
                        }}
                      >
                        <span className="text-white font-bold text-sm">
                          {upiMethod.name === 'phonepe' ? 'P' : 
                           upiMethod.name === 'googlepay' ? 'G' : 
                           upiMethod.name === 'paytm' ? 'P' : 'U'}
                        </span>
                    </div>
                      <span className="text-white">Pay with {upiMethod.displayName}</span>
                    <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                  </button>
                  ))}
                </div>
                    </div>

              {/* UTR Submission */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Submit UTR Code</h3>
                <p className="text-sm text-gray-400 mb-4">
                  After making the payment, enter the UTR (Unique Transaction Reference) code from your UPI app.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={utrCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      if (value.length <= 12) {
                        setUtrCode(value);
                      }
                    }}
                    placeholder="Enter 12-digit UTR code"
                    maxLength={12}
                    className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-gold-500 focus:outline-none"
                  />
                  <button
                    onClick={handleUtrSubmit}
                    disabled={isSubmitting || utrCode.length !== 12}
                    className="bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Submit UTR'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* USDT Payment Section */
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center mb-6">
                <CreditCard className="h-8 w-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-semibold text-white">USDT Payment</h2>
              </div>

              {/* QR Code */}
              <div className="text-center mb-6">
                <div className="w-64 h-64 mx-auto bg-white rounded-lg flex items-center justify-center mb-4">
                  {usdtMethod?.qrCodeUrl ? (
                    <img 
                      src={`/uploads${usdtMethod.qrCodeUrl.replace('/uploads', '')}`}
                      alt="USDT QR Code"
                      className="w-full h-full object-contain rounded-lg"
                      crossOrigin="anonymous"
                      onError={(e) => { 
                        console.error('Failed to load USDT QR code:', e);
                        e.currentTarget.style.display = 'none'; 
                        e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                      }}
                      onLoad={() => console.log('USDT QR code loaded successfully')}
                    />
                  ) : null}
                  <QrCode className={`h-32 w-32 text-gray-400 ${usdtMethod?.qrCodeUrl ? 'hidden' : ''}`} />
                </div>
                <p className="text-sm text-gray-300">Scan QR code with your USDT wallet</p>
          </div>

              {/* Wallet Address */}
              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-2">USDT Wallet Address:</p>
                <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg">
            <input
              type="text"
                    value={usdtMethod?.walletAddress || 'Wallet address not available'} 
                    readOnly 
                    className="flex-1 bg-transparent text-sm text-white font-mono" 
                  />
                  <button 
                    onClick={() => copyToClipboard(usdtMethod?.walletAddress || '', 'Wallet Address')} 
                    className="bg-gold-500 text-white px-3 py-1 rounded text-sm hover:bg-gold-600 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Amount Details */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Payment Amount</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">USDT Amount:</p>
                    <p className="text-white font-semibold">${paymentData.amount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Equivalent INR:</p>
                    <p className="text-white font-semibold">
                      ₹{(paymentData.amount * (paymentData.paymentOptions.usdt?.conversionRate || 83)).toFixed(2)}
                    </p>
                  </div>
          </div>
        </div>

              {/* Transaction ID Submission */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Submit Transaction ID</h3>
                <p className="text-sm text-gray-400 mb-4">
                  After sending USDT, enter the Transaction Hash (TxID) from your wallet.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="Enter Transaction ID"
                    className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-gold-500 focus:outline-none"
                  />
        <button
                    onClick={handleTxIdSubmit}
                    disabled={isSubmitting || !txId.trim()}
                    className="bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Submit TxID'
          )}
        </button>
            </div>
          </div>
          </div>
        )}

          {/* Payment Instructions */}
          <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-blue-400 font-semibold mb-2">Important Instructions</h4>
                <ul className="text-sm text-blue-300 space-y-1">
                  <li>• Make sure to send the exact amount shown above</li>
                  <li>• Your deposit will be processed after admin verification</li>
                  <li>• Keep your UTR/TxID safe for reference</li>
                  <li>• Contact support if you have any issues</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierPage;