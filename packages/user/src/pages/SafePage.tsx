import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  Info,
  History,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '@win5x/common';
import { userService } from '../services/userService';

const SafePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [safeBalance, setSafeBalance] = useState(0);
  const [generatedRevenue, setGeneratedRevenue] = useState(0);
  const [accumulatedRevenue, setAccumulatedRevenue] = useState(0);
  const [interestRate, setInterestRate] = useState(0.6);
  const [transferAmount, setTransferAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch safe data
    const fetchSafeData = async () => {
      try {
        const data = await userService.getSafeBalance();
        setSafeBalance(data.balance);
        setGeneratedRevenue(data.generatedRevenue);
        setAccumulatedRevenue(data.accumulatedRevenue);
        setInterestRate(data.interestRate);
      } catch (error) {
        console.error('Failed to fetch safe data:', error);
        toast.error('Failed to load safe data');
      }
    };

    fetchSafeData();
  }, []);

  const handleTransferIn = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount < 1000 || amount % 1000 !== 0) {
      toast.error('Amount must be a multiple of 1000');
      return;
    }

    setIsLoading(true);
    try {
      await userService.transferToSafe(amount);
      const data = await userService.getSafeBalance();
      setSafeBalance(data.balance);
      setGeneratedRevenue(data.generatedRevenue);
      setAccumulatedRevenue(data.accumulatedRevenue);
      setTransferAmount('');
      toast.success('Transfer to safe successful');
    } catch (error: any) {
      console.error('Transfer in failed:', error);
      toast.error(error.response?.data?.error || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferOut = async () => {
    if (safeBalance <= 0) {
      toast.error('No balance to transfer out');
      return;
    }

    setIsLoading(true);
    try {
      await userService.transferFromSafe(safeBalance);
      const data = await userService.getSafeBalance();
      setSafeBalance(data.balance);
      setGeneratedRevenue(data.generatedRevenue);
      setAccumulatedRevenue(data.accumulatedRevenue);
      toast.success('Transfer from safe successful');
    } catch (error: any) {
      console.error('Transfer out failed:', error);
      toast.error(error.response?.data?.error || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg border-b border-gray-700">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">Safe</h1>
        </div>
        <p className="text-sm text-gray-400 ml-10">Interest rate 0.5%</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-gold-600 to-gold-700 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-400 rounded"></div>
              <span className="text-sm">Total amount</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Financial security</span>
            </div>
          </div>
          
          <div className="text-3xl font-bold mb-2">
            ₹{formatCurrency(safeBalance, '₹').replace('₹', '')}
          </div>
          
          <p className="text-sm opacity-90 mb-4">
            Transfer in 1 million, income 5000 per day
          </p>
          
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((dot) => (
              <div key={dot} className="w-2 h-2 bg-white rounded-full opacity-60"></div>
            ))}
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gold-300 mb-1">
                ₹{formatCurrency(generatedRevenue, '₹').replace('₹', '')}
              </div>
              <div className="text-sm text-gray-300 mb-2">Generated revenue</div>
              <div className="inline-block bg-gold-500/20 text-gold-400 text-xs px-2 py-1 rounded">
                My interest rate {interestRate}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gold-300 mb-1">
                ₹{formatCurrency(accumulatedRevenue, '₹').replace('₹', '')}
              </div>
              <div className="text-sm text-gray-300">Accumulated revenue</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleTransferOut}
            disabled={safeBalance <= 0 || isLoading}
            className="w-full py-3 border-2 border-gold-500 text-gold-400 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gold-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingDown className="h-5 w-5" />
            Transfer out
          </button>
          
          <div className="space-y-2">
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 placeholder-gray-400"
            />
            <button
              onClick={handleTransferIn}
              disabled={!transferAmount || parseFloat(transferAmount) <= 0 || isLoading}
              className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-gold-700 hover:to-gold-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrendingUp className="h-5 w-5" />
              Transfer in
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-300 mb-2">
                Funds are safe and secure, and can be transferred at any time.
              </p>
              <button 
                onClick={() => navigate('/safe-info')}
                className="text-sm text-gold-400 hover:text-gold-300"
              >
                Learn about safes &gt;&gt;
              </button>
            </div>
          </div>
        </div>

        {/* Historical Records */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gold-400" />
            <h3 className="font-medium text-white">Historical records</h3>
          </div>
          
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-400 mb-4">No data</p>
            <button className="border border-gold-500 text-gold-400 px-4 py-2 rounded-lg text-sm hover:bg-gold-500/10">
              All history
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafePage;
