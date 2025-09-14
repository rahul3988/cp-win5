import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';

const LeaderboardPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { data } = useQuery({
    queryKey: ['leaderboard', selectedPeriod],
    queryFn: () => userService.getLeaderboard(selectedPeriod),
    refetchInterval: 15000,
  });
  const entries = data?.entries || [];
  const me = data?.me || { rank: null, totalWon: 0 };

  const periods = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ] as const;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-gold-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-gold-500 to-gold-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-gray-400">See who's winning big at Win5x!</p>
        </div>

        {/* Period Selector */}
        <div className="flex justify-center">
          <div className="bg-gray-800 rounded-lg p-1 flex space-x-1">
            {periods.map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-6 py-2 rounded-md font-semibold transition-all ${
                  selectedPeriod === period.key
                    ? 'bg-gold-600 text-white'
                    : 'text-gray-200 hover:text-white hover:bg-gray-700 border border-gray-600'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gold-400" />
              {periods.find(p => p.key === selectedPeriod)?.label} Winners
            </h3>
            <p className="card-description">Top performers for the {selectedPeriod} period (resets daily 02:00)</p>
          </div>
          <div className="card-content">
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-20 w-20 text-gold-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">No Rankings Yet</h3>
                <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">Place bets and win to appear on the leaderboard.</p>
                <Link to="/game" className="btn btn-primary btn-lg">Play Now</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Player</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e: any) => (
                        <tr key={e.userId} className="border-b border-gray-800">
                          <td className={`py-3 px-4 ${e.rank <= 3 ? 'font-bold' : ''}`}>{getRankIcon(e.rank)}</td>
                          <td className="py-3 px-4 text-white">{e.username}</td>
                          <td className="py-3 px-4 text-right text-gold-300">₹{Number(e.totalWon).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-800/60 border border-gray-700 rounded p-3">
                  <div className="text-sm text-gray-300">Your position: {me.rank ? `#${me.rank}` : '—'} | Winnings: ₹{Number(me.totalWon || 0).toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-500">Leaderboard counts winnings between 02:00 and 24:00 local time.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LeaderboardPage;