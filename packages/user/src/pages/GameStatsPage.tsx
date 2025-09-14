import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@win5x/common';

const GameStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [stats, setStats] = useState({
    totalBets: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    totalWagered: 0,
    totalWon: 0,
    netProfit: 0,
    biggestWin: 0,
    biggestLoss: 0,
    averageBet: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
    gamesPlayed: 0,
    favoriteNumber: 0,
    lastPlayed: new Date()
  });

  useEffect(() => {
    // Fetch stats based on time range
    const fetchStats = async () => {
      try {
        const data = await userService.getGameStatistics({ timeRange });
        setStats({
          totalBets: data.totalBets,
          totalWins: data.totalWins,
          totalLosses: data.totalLosses,
          winRate: data.winRate,
          totalWagered: data.totalWagered,
          totalWon: data.totalWon,
          netProfit: data.netProfit,
          biggestWin: data.biggestWin,
          biggestLoss: data.biggestLoss,
          averageBet: data.averageBet,
          longestWinStreak: data.longestWinStreak,
          longestLossStreak: data.longestLossStreak,
          gamesPlayed: data.gamesPlayed,
          favoriteNumber: data.favoriteNumber,
          lastPlayed: new Date(data.lastPlayed)
        });
      } catch (error) {
        console.error('Failed to fetch game statistics:', error);
        toast.error('Failed to load game statistics');
        
        // Fallback to mock data
        const mockStats = {
          totalBets: Math.floor(Math.random() * 1000) + 100,
          totalWins: Math.floor(Math.random() * 500) + 50,
          totalLosses: Math.floor(Math.random() * 400) + 30,
          winRate: Math.random() * 100,
          totalWagered: Math.random() * 10000,
          totalWon: Math.random() * 12000,
          netProfit: Math.random() * 2000 - 1000,
          biggestWin: Math.random() * 1000,
          biggestLoss: Math.random() * 500,
          averageBet: Math.random() * 100,
          longestWinStreak: Math.floor(Math.random() * 20) + 1,
          longestLossStreak: Math.floor(Math.random() * 15) + 1,
          gamesPlayed: Math.floor(Math.random() * 500) + 50,
          favoriteNumber: Math.floor(Math.random() * 10) + 1,
          lastPlayed: new Date()
        };
        setStats(mockStats);
      }
    };

    fetchStats();
  }, [timeRange]);

  const timeRanges = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' }
  ];

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
          <h1 className="text-lg font-semibold text-white">Game Statistics</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Time Range Selector */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="flex gap-2">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  timeRange === range.key
                    ? 'bg-gold-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-300">Games Played</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.gamesPlayed}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-5 w-5 text-gold-400" />
              <span className="text-sm text-gray-300">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Total Won</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{formatCurrency(stats.totalWon, '₹').replace('₹', '')}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              <span className="text-sm text-gray-300">Total Wagered</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{formatCurrency(stats.totalWagered, '₹').replace('₹', '')}
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Detailed Statistics</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Net Profit</span>
              <span className={`font-semibold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{formatCurrency(Math.abs(stats.netProfit), '₹').replace('₹', '')}
                {stats.netProfit >= 0 ? ' +' : ' -'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Biggest Win</span>
              <span className="font-semibold text-green-600">
                ₹{formatCurrency(stats.biggestWin, '₹').replace('₹', '')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Biggest Loss</span>
              <span className="font-semibold text-red-600">
                ₹{formatCurrency(stats.biggestLoss, '₹').replace('₹', '')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Bet</span>
              <span className="font-semibold text-gray-800">
                ₹{formatCurrency(stats.averageBet, '₹').replace('₹', '')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Longest Win Streak</span>
              <span className="font-semibold text-green-600">{stats.longestWinStreak}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Longest Loss Streak</span>
              <span className="font-semibold text-red-600">{stats.longestLossStreak}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Favorite Number</span>
              <span className="font-semibold text-blue-600">{stats.favoriteNumber}</span>
            </div>

          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Performance Over Time</h3>
          <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="text-center text-gray-500 py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No recent activity found</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatsPage;
