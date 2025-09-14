import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Shield,
  Play
} from 'lucide-react';

const SafeInfoPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">Learn about safes</h1>
            <p className="text-sm text-gray-400">Minimum return, daily interest 0.5%</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Income Section */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
          <div className="bg-gradient-to-r from-gold-600 to-gold-700 text-white p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">Income</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                The income calculation method is the base interest rate plus the vip level extra interest rate;
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                After the balance is transferred in, profit will be calculated once every 1 minute
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                Profit will be paid on the 2nd transfer or transfer out and the previous profit will be transferred to the wallet balance
              </p>
            </div>
          </div>
        </div>

        {/* Transfer In Section */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
          <div className="bg-gradient-to-r from-gold-600 to-gold-700 text-white p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">Transfer in</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                Wallet balance transferred to the safe must be transferred in points
              </p>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-sm font-medium text-white mb-2">For example</p>
              <p className="text-sm text-gray-300">
                1 point is 1000, transfer in 2 points is 2000, 10 points is 10000, 50 points is 50000, transfer amount must be a multiple of 1000
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Out Section */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
          <div className="bg-gradient-to-r from-gold-600 to-gold-700 text-white p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">Transfer out</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                Provided your income is guaranteed, you can transfer out at any time, from the balance of the safe to the balance of the wallet and the amount transferred must be a multiple of the number of copies
              </p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg border border-yellow-500/30">
              <p className="text-sm font-medium text-yellow-300 mb-2">Reminder</p>
              <p className="text-sm text-gray-300">
                Please do not transfer in and out frequently. earnings will be calculated from 1 minute after deposit.if the cumulative amount of an earned amount is less than 0.01, the amount will not be counted in 'earnings'
              </p>
            </div>
          </div>
        </div>

        {/* Safe Section */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
          <div className="bg-gradient-to-r from-gold-600 to-gold-700 text-white p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">Safe</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                Security technical team to ensure the safety of your money
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Play className="h-4 w-4 text-gold-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                To keep your funds safe, it is recommended that you transfer money to the safe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeInfoPage;
