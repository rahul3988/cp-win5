import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import TransactionsPage from './pages/TransactionsPage';
import BettingHistoryPage from './pages/BettingHistoryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import CashierPage from './pages/CashierPage';
import FeedbackPage from './pages/FeedbackPage';
import SupportPage from './pages/SupportPage';
import PromotionsPage from './pages/PromotionsPage';
import InvitePage from './pages/InviteEarnPage';
import AttendancePage from './pages/AttendancePage';
import DepositBonusPage from './pages/DepositBonusPage';
import RedeemCodePage from './pages/RedeemCodePage';
import AboutPage from './pages/AboutPage';
import RulesPage from './pages/RulesPage';
import SettingsPage from './pages/SettingsPage';
import SafePage from './pages/SafePage';
import SafeInfoPage from './pages/SafeInfoPage';
import MessagePage from './pages/MessagePage';
import GiftCodesPage from './pages/GiftCodesPage';
import NotificationPage from './pages/NotificationPage';
import GameStatsPage from './pages/GameStatsPage';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#dc2626',
            },
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/game" replace />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/betting-history" element={<BettingHistoryPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/invite-earn" element={<InvitePage />} />
          <Route path="/promotions/invite-earn" element={<InvitePage />} />
          <Route path="/promotions/attendance" element={<AttendancePage />} />
          <Route path="/promotions/deposit-bonus" element={<DepositBonusPage />} />
          <Route path="/promotions/redeem" element={<RedeemCodePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/safe" element={<SafePage />} />
          <Route path="/safe-info" element={<SafeInfoPage />} />
          <Route path="/message" element={<MessagePage />} />
          <Route path="/gifts" element={<GiftCodesPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/game-stats" element={<GameStatsPage />} />
          <Route path="*" element={<Navigate to="/game" replace />} />
        </Routes>
      </Layout>
    </>
  );
}

export default App;