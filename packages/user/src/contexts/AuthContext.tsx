import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthTokens } from '@win5x/common';
import { authService } from '../services/authService';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedTokens = authService.getStoredTokens();
      if (storedTokens) {
        const userData = await authService.verifyToken(storedTokens.accessToken);
        if (userData) {
          setUser(userData);
          setTokens(storedTokens);
        } else {
          authService.clearStoredTokens();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      authService.clearStoredTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authService.login(username, password);
      
      setUser(response.user);
      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      
      authService.storeTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      
      if (response.user?.mustChangePassword) {
        toast.info('You must change your password now.');
        window.location.href = '/profile';
      } else {
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, referralCode?: string) => {
    try {
      setIsLoading(true);
      const response = await authService.register(username, email, password, referralCode);
      
      setUser(response.user);
      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      
      authService.storeTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      
      toast.success('Welcome to Win5x!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Try to log the logout activity if user is authenticated
      if (user && tokens) {
        await authService.logoutAuthenticated();
      }
    } catch (error) {
      // Ignore logout logging errors
      console.warn('Failed to log logout activity:', error);
    } finally {
      setUser(null);
      setTokens(null);
      authService.clearStoredTokens();
      toast.success('Logged out successfully');
      window.location.href = '/login';
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    login,
    register,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}