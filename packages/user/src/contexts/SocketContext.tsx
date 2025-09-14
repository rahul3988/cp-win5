import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS } from '@win5x/common';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user, tokens } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasShownConnectToast, setHasShownConnectToast] = useState<boolean>(() => {
    try { return sessionStorage.getItem('socket_connect_toast_shown') === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (user && tokens?.accessToken) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user?.id, tokens?.accessToken]); // Only depend on user ID and access token, not the entire user object

  const initializeSocket = () => {
    // Don't create a new socket if we already have one that's connected
    if (socket && socket.connected) {
      return;
    }

    if (socket) {
      disconnectSocket();
    }

    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const options = {
      auth: {
        token: tokens?.accessToken,
      },
      transports: ['websocket', 'polling'] as string[],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000, // Increased delay to prevent rapid reconnections
      timeout: 20000,
      forceNew: true, // Force new connection to avoid connection pooling issues
    };

    const newSocket = apiUrl ? io(apiUrl, options) : io(options);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      // Show toast only once per session, avoid on route changes
      if (!hasShownConnectToast) {
        toast.success('Connected to game server');
        setHasShownConnectToast(true);
        try { sessionStorage.setItem('socket_connect_toast_shown', '1'); } catch {}
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // Only show error toast for unexpected disconnections
      if (reason !== 'io client disconnect' && reason !== 'transport close' && reason !== 'io server disconnect') {
        toast.error('Disconnected from game server');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      // Don't show error toast for authentication errors during initial connection
      // as this might be due to token refresh
      if (!error.message.includes('Authentication')) {
        toast.error('Failed to connect to game server');
      }
    });

    newSocket.on(SOCKET_EVENTS.ERROR, (error) => {
      toast.error(error.message || 'Game error occurred');
    });

    newSocket.on('connected', (data) => {
      console.log('Socket authenticated:', data);
    });

    // Listen to balance updates
    newSocket.on('user_balance_update', (data) => {
      console.log('Balance updated:', data);
      // Trigger a refresh of user data
      window.dispatchEvent(new CustomEvent('balance_updated', { detail: data }));
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.removeAllListeners(); // Remove all event listeners
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}