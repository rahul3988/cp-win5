import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Filter, Download, Calendar, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';

interface TotalGameHistoryItem {
  round: number;
  winningNumber: number;
  result: string;
  time: Date;
}

interface PlayerBetHistoryItem {
  round: number;
  bet: string;
  amount: number;
  payout: number;
  cashback: number;
  result: string;
  time: Date;
}

const BettingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'player' | 'total'>('player');
  const [pageSize] = useState(20);
  const [playerPage, setPlayerPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  // Player betting history query
  const { data: playerData, isLoading: playerLoading } = useQuery({
    queryKey: ['player-bet-history', user?.id, playerPage, pageSize],
    queryFn: () => userService.getPlayerBetHistory(user!.id, { page: playerPage, pageSize }),
    enabled: !!user && activeTab === 'player',
    refetchInterval: 30000,
  });

  // Total game history query
  const { data: totalData, isLoading: totalLoading } = useQuery({
    queryKey: ['total-game-history', totalPage, pageSize],
    queryFn: () => userService.getTotalGameHistory({ page: totalPage, pageSize }),
    enabled: activeTab === 'total',
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '₹0';
    }
    return `₹${Number(amount).toLocaleString()}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getResultIcon = (result: string) => {
    switch (result.toLowerCase()) {
      case 'win':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'lose':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-yellow-400" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'win':
        return 'text-green-400';
      case 'lose':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getResultBgColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'win':
        return 'bg-green-900/20 border-green-500/30';
      case 'lose':
        return 'bg-red-900/20 border-red-500/30';
      default:
        return 'bg-yellow-900/20 border-yellow-500/30';
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Betting History</h1>
          <p className="text-gray-300">Track your betting performance and game results</p>
        </div>

        {/* Tab Navigation */}
        <div className="card">
          <div className="card-content p-0">
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'player'
                    ? 'text-gold-400 border-b-2 border-gold-400 bg-gold-400/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Target className="h-5 w-5" />
                  My Betting History
                </div>
              </button>
              <button
                onClick={() => setActiveTab('total')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'total'
                    ? 'text-gold-400 border-b-2 border-gold-400 bg-gold-400/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5" />
                  Total Game History
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Player Betting History Tab */}
        {activeTab === 'player' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">My Betting Records</h3>
              <p className="card-description">
                Page {playerPage} of {playerData?.totalPages || 1}
              </p>
            </div>
            <div className="card-content">
              {playerLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !playerData?.items || playerData.items.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Betting History</h3>
                  <p className="text-gray-400">
                    You haven't placed any bets yet. Start playing to see your betting history here!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Round</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Bet</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Amount</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Payout</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Cashback</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Result</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerData.items.map((bet, index) => (
                        <tr 
                          key={`${bet.round}-${index}`} 
                          className={`border-b border-gray-800 hover:bg-gray-800/50 ${getResultBgColor(bet.result)}`}
                        >
                          <td className="py-3 px-4 text-white font-medium">#{bet.round}</td>
                          <td className="py-3 px-4 text-white">{bet.bet}</td>
                          <td className="py-3 px-4 text-right text-white">{formatCurrency(bet.amount)}</td>
                          <td className="py-3 px-4 text-right text-white">{formatCurrency(bet.payout)}</td>
                          <td className="py-3 px-4 text-right text-green-400">
                            {bet.cashback > 0 ? `+${formatCurrency(bet.cashback)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {getResultIcon(bet.result)}
                              <span className={`font-medium ${getResultColor(bet.result)}`}>
                                {bet.result.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400 text-sm">
                            {formatTimeAgo(new Date(bet.time))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      {playerPage > 1 && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setPlayerPage(p => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Showing {playerData.items.length} of {playerData.total} records
                    </div>
                    <div>
                      {playerPage < playerData.totalPages && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setPlayerPage(p => p + 1)}
                        >
                          Next
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total Game History Tab */}
        {activeTab === 'total' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Total Game History</h3>
              <p className="card-description">
                Page {totalPage} of {totalData?.totalPages || 1}
              </p>
            </div>
            <div className="card-content">
              {totalLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !totalData?.items || totalData.items.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Game History</h3>
                  <p className="text-gray-400">
                    No completed games found. Check back later for game results!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Round</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Winning Number</th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Result</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totalData.items.map((game, index) => (
                        <tr 
                          key={`${game.round}-${index}`} 
                          className="border-b border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="py-3 px-4 text-white font-medium">#{game.round}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-500 text-black font-bold text-lg">
                              {game.winningNumber}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              game.result === 'Odd' 
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                                : 'bg-red-900/30 text-red-400 border border-red-500/30'
                            }`}>
                              {game.result}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400 text-sm">
                            {formatTimeAgo(new Date(game.time))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      {totalPage > 1 && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setTotalPage(p => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Showing {totalData.items.length} of {totalData.total} records
                    </div>
                    <div>
                      {totalPage < totalData.totalPages && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setTotalPage(p => p + 1)}
                        >
                          Next
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BettingHistoryPage;
