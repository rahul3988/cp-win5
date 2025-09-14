import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  Eye, 
  EyeOff,
  Copy,
  RefreshCw,
  Shield,
  MessageSquare,
  Lock,
  List,
  History,
  CreditCard,
  CheckCircle,
  Bell,
  Gift,
  BarChart3,
  Settings,
  HelpCircle,
  Megaphone,
  Headphones,
  BookOpen,
  Info,
  Power,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { formatCurrency } from '@win5x/common';
import { userService } from '../services/userService';
import { debounce } from '../utils/debounce';
import { toast } from 'sonner';
import AvatarSelector from '../components/AvatarSelector';
import AvatarUploader from '../components/AvatarUploader';
import UserLogs from '../components/UserLogs';
import { getAvatarById, DEFAULT_AVATAR } from '../assets/avatars';

const ProfilePage: React.FC = () => {
  const { user, setUser, logout } = useAuth();
  const { socket } = useSocket();
  const [attendance, setAttendance] = useState<{ attendanceStreak: number; lastAttendanceAt: string | null } | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>((user as any)?.avatarUrl || DEFAULT_AVATAR.id);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update avatar states when user data changes
  useEffect(() => {
    if (user?.avatarUrl) {
      setCurrentAvatarUrl(user.avatarUrl);
      setSelectedAvatar(user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  const formatShortId = (id: string) => {
    try {
      const hex = id.replace(/-/g, '');
      const num = BigInt('0x' + hex) % BigInt(100000000);
      const s = num.toString();
      return s.padStart(8, '0');
    } catch {
      return id.slice(0, 8);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success('UID copied to clipboard');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        toast.success('UID copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy UID');
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      const updated = await userService.updateProfile({
        avatarUrl: avatarId,
      });
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setSelectedAvatar(avatarId);
      setCurrentAvatarUrl(avatarId);
      setShowAvatarSelector(false);
      toast.success('Avatar updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update avatar');
    }
  };

  const handleAvatarUpload = async (avatarUrl: string) => {
    try {
      const updated = await userService.updateProfile({
        avatarUrl: avatarUrl,
      });
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setCurrentAvatarUrl(avatarUrl);
      toast.success('Avatar uploaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update avatar');
    }
  };

  // Real-time balance updates via socket (same as GamePage)
  useEffect(() => {
    if (!socket) return;

    const handleBalanceUpdate = (balanceUpdate: any) => {
      console.log('ProfilePage: Balance update received', balanceUpdate);
      if (setUser) {
        setUser(prev => prev ? {
          ...prev,
          walletBetting: balanceUpdate.bettingWallet !== undefined ? balanceUpdate.bettingWallet : prev.walletBetting,
          walletGaming: balanceUpdate.gamingWallet !== undefined ? balanceUpdate.gamingWallet : prev.walletGaming,
        } : null);
      }
    };

    socket.on('user_balance_update', handleBalanceUpdate);

    return () => {
      socket.off('user_balance_update', handleBalanceUpdate);
    };
  }, [socket, setUser]);

  // Refresh attendance data on mount
  useEffect(() => {
    (async () => {
      try {
        await userService.pingAttendance();
        const a = await userService.getAttendance();
        setAttendance(a);
      } catch {}
    })();
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 p-4"
      >
        {/* Top Header Section (Gold Background) */}
        <div className="bg-gradient-to-br from-gold-600 to-gold-700 rounded-xl p-4 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => setShowAvatarSelector(true)}
              className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden hover:bg-white/30 transition-colors"
            >
              {(user?.avatarUrl || selectedAvatar) ? (
                <img
                  src={user?.avatarUrl ? 
                    (user.avatarUrl.startsWith('http') ? user.avatarUrl : getAvatarById(user.avatarUrl).path) : 
                    getAvatarById(selectedAvatar).path
                  }
                  alt={user?.avatarUrl ? 
                    (user.avatarUrl.startsWith('http') ? "User Avatar" : getAvatarById(user.avatarUrl).name) : 
                    getAvatarById(selectedAvatar).name
                  }
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <User className="h-8 w-8 text-white" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-lg">{user.username}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>UID {formatShortId(user.id)}</span>
                <button 
                  onClick={() => copyToClipboard(user.id)}
                  className="text-white hover:text-yellow-200 p-1 rounded hover:bg-white/10 transition-colors"
                  title="Copy UID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs opacity-90 mt-1">
                Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            <Link to="/transactions" className="bg-white/20 hover:bg-white/30 rounded-lg p-3 text-center">
              <Wallet className="h-6 w-6 mx-auto mb-1" />
              <div className="text-xs">Wallet</div>
            </Link>
            <Link to="/deposit" className="bg-white/20 hover:bg-white/30 rounded-lg p-3 text-center">
              <CreditCard className="h-6 w-6 mx-auto mb-1" />
              <div className="text-xs">Deposit</div>
            </Link>
            <Link to="/withdraw" className="bg-white/20 hover:bg-white/30 rounded-lg p-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1" />
              <div className="text-xs">Withdraw</div>
            </Link>
            <div className="bg-white/20 rounded-lg p-3 text-center">
              <Gift className="h-6 w-6 mx-auto mb-1" />
              <div className="text-xs">VIP</div>
            </div>
          </div>
        </div>

        {/* Wallet and Balance Overview (Dark Card) */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Betting wallet</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-gold-300">{formatCurrency(user?.walletBetting ?? 0)}</span>
                <div className="w-4 h-4"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Gaming wallet</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-gold-300">{formatCurrency(user?.walletGaming ?? 0)}</span>
                <div className="w-4 h-4"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="space-y-3">

          {/* Message Card */}
          <Link to="/message" className="block">
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 hover:bg-gray-750 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-orange-400" />
                    </div>
                <div className="flex-1">
                  <div className="font-semibold text-white mb-1">Message</div>
                  <div className="text-sm text-gray-300 mb-2">
                    Pay attention to our platform notifications to receive more mysterious bonuses and consultation info.
                  </div>
                  <div className="flex justify-end">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Safe Card */}
          <Link to="/safe" className="block">
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 hover:bg-gray-750 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white mb-1">Safe</div>
                  <div className="text-sm text-gray-300 mb-2">
                    Daily interest rate 0.5% + VIP extra income safe, calculated every 1 minute
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gold-300">Coming Soon</span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
          </div>

        {/* History and Transaction Links (Dark Card with Grid Layout) */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <Link to="/betting-history" className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
              <List className="h-6 w-6 text-blue-400" />
              <div>
                <div className="font-semibold text-white">Game history</div>
                <div className="text-xs text-gray-300">My game history</div>
            </div>
                </Link>
            <Link to="/transactions" className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
              <History className="h-6 w-6 text-gold-400" />
              <div>
                <div className="font-semibold text-white">Transaction</div>
                <div className="text-xs text-gray-300">My transaction history</div>
              </div>
                </Link>
            <Link to="/deposit" className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
              <CreditCard className="h-6 w-6 text-gold-400" />
              <div>
                <div className="font-semibold text-white">Deposit</div>
                <div className="text-xs text-gray-300">My deposit history</div>
              </div>
                </Link>
            <Link to="/withdraw" className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
              <CheckCircle className="h-6 w-6 text-orange-400" />
              <div>
                <div className="font-semibold text-white">Withdraw</div>
                <div className="text-xs text-gray-300">My withdraw history</div>
              </div>
            </Link>
          </div>
        </div>

        {/* General Information and Engagement Sections */}
        <div className="space-y-3">
          <Link to="/notifications" className="block">
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 hover:bg-gray-750 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-6 w-6 text-gold-400" />
                  <span className="font-semibold text-white">Notification</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Link>

          <Link to="/gifts" className="block">
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 hover:bg-gray-750 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6 text-gold-400" />
                  <span className="font-semibold text-white">Gifts</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Link>

          <Link to="/game-stats" className="block">
            <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 hover:bg-gray-750 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-gold-400" />
                  <span className="font-semibold text-white">Game statistics</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Link>
        </div>

        {/* Service Center */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
          <div className="font-semibold text-white mb-4">Service center</div>
          <div className="grid grid-cols-3 gap-4">
            <Link to="/settings" className="text-center">
              <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Settings className="h-6 w-6 text-gold-400" />
              </div>
              <div className="text-xs text-gray-300">Settings</div>
            </Link>
            <Link to="/feedback" className="text-center">
              <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="h-6 w-6 text-gold-400" />
          </div>
              <div className="text-xs text-gray-300">Feedback</div>
            </Link>
            <Link to="/promotions" className="text-center">
              <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Megaphone className="h-6 w-6 text-gold-400" />
        </div>
              <div className="text-xs text-gray-300">Promotion</div>
            </Link>
            <Link to="/support" className="text-center">
              <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Headphones className="h-6 w-6 text-gold-400" />
              </div>
              <div className="text-xs text-gray-300">24/7 Customer service</div>
            </Link>
            <Link to="/rules" className="text-center">
              <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <BookOpen className="h-6 w-6 text-gold-400" />
              </div>
              <div className="text-xs text-gray-300">Beginner's guide</div>
            </Link>
            <Link to="/about" className="text-center">
              <div className="w-12 h-12 bg-gold-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Info className="h-6 w-6 text-gold-400" />
              </div>
              <div className="text-xs text-gray-300">About us</div>
            </Link>
          </div>
        </div>

        {/* User Logs Section */}
        <UserLogs userId={user?.id || ''} className="mb-4" />

        {/* Log Out Button */}
        <div className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            }} 
            className="w-full py-3 rounded-lg border-2 border-gold-500 text-gold-400 font-semibold flex items-center justify-center gap-2 hover:bg-gold-500/10 hover:text-gold-300 transition-colors"
          >
            <Power className="h-5 w-5" />
            Log out
          </button>
                </div>
                
        {/* Avatar Selector Modal */}
        {showAvatarSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Select Avatar</h3>
                <button
                  onClick={() => setShowAvatarSelector(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Avatar Uploader */}
                <AvatarUploader
                  currentAvatarUrl={currentAvatarUrl}
                  onAvatarSelect={handleAvatarSelect}
                  onAvatarUpload={handleAvatarUpload}
                />
                
                {/* Divider */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-white font-medium mb-4 text-center">Or Choose from Gallery</h4>
                  <AvatarSelector
                    selectedAvatar={selectedAvatar}
                    onAvatarSelect={handleAvatarSelect}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfilePage;