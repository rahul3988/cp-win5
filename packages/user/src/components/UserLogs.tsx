import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, ChevronDown, ChevronUp, Clock, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../services/userService';
import LoadingSpinner from './LoadingSpinner';

interface UserLogsProps {
  userId: string;
  className?: string;
}

interface LogItem {
  action: string;
  date: string;
  time: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

const UserLogs: React.FC<UserLogsProps> = ({ userId, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['user-logs', userId, page, pageSize],
    queryFn: () => userService.getUserLogs(userId, { page, pageSize }),
    enabled: isExpanded && !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds when expanded
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-400" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'logout':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const logs = logsData?.items || [];

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold-400" />
          <span className="font-medium text-white">User Logs</span>
          {logsData && (
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {logsData.total}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-700">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner size="sm" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No login/logout activity yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.map((log: LogItem, index: number) => (
                    <motion.div
                      key={`${log.timestamp}-${index}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-2 rounded-lg border ${getActionColor(log.action)}`}
                    >
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm font-medium capitalize">
                          {log.action}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-300">
                          {formatDate(log.date)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {log.time}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {logsData && logsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    {page} / {logsData.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(logsData.totalPages, p + 1))}
                    disabled={page === logsData.totalPages}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserLogs;
