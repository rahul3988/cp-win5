import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Mail, HelpCircle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      await login(data.username, data.password);
    } catch (error) {
      // Error is handled by the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Logo and Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto h-20 w-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mb-4 shadow-2xl"
          >
            <Gamepad2 className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-2">Win5x</h2>
          <p className="text-gold-400 text-lg font-semibold">Roulette Game</p>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to start spinning and winning!
          </p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/90 backdrop-blur-sm border border-gold-500/30 rounded-xl shadow-2xl p-8"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-lg font-bold text-white">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="w-full px-4 py-3 bg-gray-900/80 border-2 border-gold-500/50 rounded-lg text-white text-lg font-medium placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 focus:outline-none transition-all duration-200"
                placeholder="Enter your username"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-red-400 text-sm font-medium mt-1">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-lg font-bold text-white">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 bg-gray-900/80 border-2 border-gold-500/50 rounded-lg text-white text-lg font-medium placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 focus:outline-none transition-all duration-200"
                  placeholder="Enter your password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gold-400 hover:text-gold-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-6 w-6" />
                  ) : (
                    <Eye className="h-6 w-6" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-xl py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-6 w-6" />
                    <span>Sign In</span>
                  </>
                )}
              </motion.button>
            </div>

            <div className="text-center">
              <p className="text-gray-300 text-lg">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-gold-400 hover:text-gold-300 font-bold transition-colors underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </motion.div>

        {/* Help & Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-gray-800/90 backdrop-blur-sm border border-gold-500/30 rounded-xl p-6 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-gold-400" />
            <h3 className="text-white font-semibold text-lg">Help & Support</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className="bg-gray-900/80 border-2 border-gold-500/30 rounded-lg text-white px-3 py-2">
              <option>Forgot password</option>
              <option>Unable to login</option>
            </select>
            <a
              href="https://mail.google.com/mail/u/0/#inbox?compose=new"
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" /> Email Support
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2">Support email: winein5x@gmail.com</p>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default LoginPage;