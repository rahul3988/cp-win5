import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

interface LiveViewersProps {
  className?: string;
}

const LiveViewers: React.FC<LiveViewersProps> = ({ className }) => {
  const { socket, isConnected } = useSocket();
  const [liveStats, setLiveStats] = useState({
    currentPlayers: 0,
    peakToday: 0,
    totalBets: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'user_joined' | 'user_left' | 'bet_placed';
    username: string;
    timestamp: Date;
  }>>([]);

  // Listen for live stats and activity updates
  useEffect(() => {
    if (!socket) return;

    socket.on('live_stats', (stats) => {
      setLiveStats(stats);
    });

    // Privacy: anonymize and minimize public activity details
    socket.on('live_activity', (activity) => {
      setRecentActivity(prev => {
        const safeTimestamp = activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp);
        const maskedName = typeof activity.username === 'string' && activity.username.length > 2
          ? `${activity.username.slice(0, 2)}***`
          : 'Player***';
        const activityWithId = {
          id: activity.id || `${Date.now()}-${Math.random()}`,
          type: activity.type,
          username: maskedName,
          timestamp: safeTimestamp,
        };
        
        // Add to beginning and keep only last 10 activities
        const updated = [activityWithId, ...prev].slice(0, 10);
        return updated;
      });
    });

    return () => {
      socket.off('live_stats');
      socket.off('live_activity');
    };
  }, [socket]);

  // Auto-remove old activities (after 30 seconds)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setRecentActivity(prev => 
        prev.filter(activity => {
          const timestamp = activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp);
          return now - timestamp.getTime() < 30000; // Remove after 30 seconds
        })
      );
    }, 5000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined': return '👋';
      case 'user_left': return '👋';
      case 'bet_placed': return '🎰';
      default: return '⭐';
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'user_joined':
        return 'joined the game';
      case 'user_left':
        return 'left the game';
      case 'bet_placed':
        return 'placed a bet';
      default:
        return 'is playing';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = Date.now();
    const timeDiff = now - timestamp.getTime();
    const seconds = Math.floor(timeDiff / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-white flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
          Live Activity
        </h3>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Peak Today */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-gray-400">Peak Today</div>
            <div className="text-sm sm:text-base font-bold text-gold-400">
              {(liveStats.peakToday || 0).toLocaleString()}
            </div>
          </div>
          
          {/* Total Bets */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-gray-400">Total Bets</div>
            <div className="text-sm sm:text-base font-bold text-green-400">
              ₹{(liveStats.totalBets || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-semibold text-gold-400">Live Activity</span>
          </div>
        </div>
        
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {recentActivity.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                layout
                className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded text-xs"
              >
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <span className="text-gray-300 flex-1 truncate">
                  {activity.username} {getActivityText(activity.type)}
                </span>
                <span className="text-gray-500 text-xs">
                  {formatTimeAgo(activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp))}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {recentActivity.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Watching for activity...</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
          <p className="text-xs text-gray-400">Peak Today</p>
          <motion.p 
            className="text-lg font-bold text-green-400"
            key={liveStats.peakToday}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {(liveStats.peakToday || 0).toLocaleString()}
          </motion.p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
          <p className="text-xs text-gray-400">Total Bets</p>
          <motion.p 
            className="text-lg font-bold text-gold-400"
            key={liveStats.totalBets}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {(liveStats.totalBets || 0).toLocaleString()}
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default LiveViewers;