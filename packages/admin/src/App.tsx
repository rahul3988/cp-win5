import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import BetsPage from './pages/BetsPage';
import RoundsPage from './pages/RoundsPage';
import TransactionsPage from './pages/TransactionsPage';
import UserDetailsPage from './pages/UserDetailsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import PromotionsPage from './pages/PromotionsPage';
import GiftCodeManagementPage from './pages/GiftCodeManagementPage';
import PaymentManagementPage from './pages/PaymentManagementPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import SupportRequestsPage from './pages/SupportRequestsPage';
import FeedbacksPage from './pages/FeedbacksPage';
import LoadingSpinner from './components/LoadingSpinner';
import AboutPage from './pages/AboutPage';

function App() {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId" element={<UserDetailsPage />} />
        <Route path="/payments" element={<PaymentManagementPage />} />
        <Route path="/bets" element={<BetsPage />} />
        <Route path="/rounds" element={<RoundsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/support" element={<SupportRequestsPage />} />
        <Route path="/feedbacks" element={<FeedbacksPage />} />
        <Route path="/promotions" element={<PromotionsPage />} />
        <Route path="/gift-codes" element={<GiftCodeManagementPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;