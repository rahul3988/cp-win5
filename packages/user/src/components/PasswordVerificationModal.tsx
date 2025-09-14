import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

interface PasswordVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  attemptsLeft?: number;
  isLocked?: boolean;
  lockoutTime?: string;
}

const PasswordVerificationModal: React.FC<PasswordVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  isLoading = false,
  error,
  attemptsLeft,
  isLocked = false,
  lockoutTime
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    try {
      await onVerify(password);
      setPassword('');
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPassword('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                  <Lock className="h-5 w-5 text-gold-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Verify Password</h2>
                  <p className="text-sm text-gray-400">Enter your password to confirm withdrawal</p>
                </div>
              </div>
              
              {!isLoading && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {isLocked ? (
                // Locked State
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Account Temporarily Locked</h3>
                    <p className="text-gray-300 mb-4">
                      Too many failed password attempts. Please try again later.
                    </p>
                    {lockoutTime && (
                      <p className="text-sm text-gray-400">
                        Try again in: <span className="text-gold-400 font-semibold">{lockoutTime}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // Password Input Form
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Enter Your Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                        placeholder="Enter your account password"
                        disabled={isLoading}
                        autoFocus
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-300">{error}</p>
                    </motion.div>
                  )}

                  {/* Attempts Left Warning */}
                  {attemptsLeft && attemptsLeft <= 3 && attemptsLeft > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <p className="text-sm text-yellow-300">
                        {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before account lockout
                      </p>
                    </motion.div>
                  )}

                  {/* Security Notice */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Lock className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">Security Notice</p>
                        <p>Your password is required to confirm this withdrawal request. This helps protect your account from unauthorized transactions.</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password.trim() || isLoading}
                      className="flex-1 px-4 py-3 bg-gold-500 text-black font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Confirm Withdrawal</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PasswordVerificationModal;






