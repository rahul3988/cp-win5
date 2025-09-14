import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Gamepad2, 
  User, 
  CreditCard, 
  Trophy, 
  LogOut, 
  Menu,
  X,
  Wallet,
  History
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { formatCurrency } from '@win5x/common';
import { getAvatarById, DEFAULT_AVATAR } from '../assets/avatars';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const showConnectionStatus = location.pathname === '/game';

  const navigation = [
    { name: 'Game', href: '/game', icon: Gamepad2 },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Betting History', href: '/betting-history', icon: History },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Invite', href: '/invite', icon: Trophy },
    // Service links (also available from Profile page)
    { name: 'Feedback', href: '/feedback', icon: CreditCard },
    { name: 'Promotion', href: '/promotions', icon: Trophy },
    { name: 'Guide', href: '/rules', icon: History },
    { name: 'Support', href: '/support', icon: CreditCard },
    { name: 'About us', href: '/about', icon: User },
  ];

  const handleLogout = () => {
    const ok = window.confirm('Are you sure you want to logout?');
    if (ok) logout();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${isSidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSidebarOpen(false)} />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-gray-800 transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar navigation={navigation} currentPath={location.pathname} user={user} onNavigate={() => setIsSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar navigation={navigation} currentPath={location.pathname} user={user} onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-gray-800 shadow-lg border-b border-gray-700">
          <button
            type="button"
            className="px-4 border-r border-gray-700 text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-white">
                {navigation.find(item => item.href === location.pathname)?.name || 'Win5x'}
              </h1>
            </div>
            
            <div className="ml-4 flex items-center space-x-4">
              {/* Connection status (only on Game page) */}
              {showConnectionStatus && (
                <div className="hidden md:flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm text-gray-300">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              )}
              

              
              {/* User menu */}
              <div className="relative flex items-center space-x-3">
                <Link to="/profile" className="flex items-center space-x-2 group">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl.startsWith('http') ? user.avatarUrl : getAvatarById(user.avatarUrl).path}
                        alt="User Avatar"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className="text-sm font-bold text-white hidden">
                      {user?.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white group-hover:underline">{user?.username}</p>
                    <p className="text-xs text-gray-400">Player</p>
                  </div>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

interface SidebarProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<any>;
  }>;
  currentPath: string;
  user: any;
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navigation, currentPath, user, onNavigate }) => {
  return (
    <div className="flex flex-col flex-grow bg-gray-800 pt-5 pb-4 overflow-y-auto border-r border-gray-700">
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="h-10 w-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
          <Gamepad2 className="h-6 w-6 text-white" />
        </div>
        <span className="ml-3 text-2xl font-bold text-white">Win5x</span>
      </div>
      
      <div className="mt-8 flex-grow flex flex-col">
        <nav className="flex-1 px-2 space-y-2">
          {navigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg'
                    : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={(e) => {
                  // Close sidebar if needed
                  onNavigate && onNavigate();
                  // Force instant page refresh navigation for snappy feedback
                  e.preventDefault();
                  window.location.assign(item.href);
                }}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-300 group-hover:text-white'
                  }`}
                />
                {item.name}
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="ml-auto w-1 h-6 bg-white rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-700">
          <div className="text-center text-xs text-gray-400">
            <p>Win5x Roulette</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;