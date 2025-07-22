import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { socketService, SocketService } from '../services/socket.service';
import { useAuth } from '../../contexts/AuthContext';

interface SocketContextType {
  socket: SocketService;
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: {
    connected: boolean;
    connecting: boolean;
    socketId: string | null;
    reconnectAttempts: number;
  };
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(socketService.getConnectionStatus());

  // Update connection status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = socketService.getConnectionStatus();
      setIsConnected(status.connected);
      setIsConnecting(status.connecting);
      setConnectionStatus(status);
    };

    // Update status immediately
    updateStatus();

    // Set up interval to check status
    const statusInterval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔐 User authenticated - establishing socket connection');
      handleConnect();
    } else {
      console.log('🔐 User not authenticated - disconnecting socket');
      handleDisconnect();
    }
  }, [isAuthenticated, user]);

  // Set up socket event listeners for connection status updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
      console.log('🔌 Socket context: Connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
      console.log('🔌 Socket context: Disconnected');
    };

    const handleConnecting = () => {
      setIsConnecting(true);
      console.log('🔌 Socket context: Connecting...');
    };

    const handleAuthError = () => {
      console.log('🔐 Socket context: Authentication error - will disconnect');
      handleDisconnect();
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connecting', handleConnecting);
    socket.on('auth:error', handleAuthError);

    // Cleanup listeners
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connecting', handleConnecting);
      socket.off('auth:error', handleAuthError);
    };
  }, [socketService.getSocket()]);

  // Connect to socket
  const handleConnect = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      await socketService.connect();
    } catch (error) {
      console.error('💥 Error connecting socket:', error);
      setIsConnecting(false);
    }
  };

  // Disconnect from socket
  const handleDisconnect = (): void => {
    socketService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
  };

  // Emit event through socket
  const emit = (event: string, data?: any): void => {
    socketService.emit(event, data);
  };

  // Listen for events
  const on = (event: string, callback: (...args: any[]) => void): void => {
    socketService.on(event, callback);
  };

  // Remove event listener
  const off = (event: string, callback?: (...args: any[]) => void): void => {
    socketService.off(event, callback);
  };

  const value: SocketContextType = {
    socket: socketService,
    isConnected,
    isConnecting,
    connectionStatus,
    connect: handleConnect,
    disconnect: handleDisconnect,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook to use the socket context
 */
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

/**
 * Custom hook for socket event listeners with automatic cleanup
 */
export const useSocketEvent = (
  event: string,
  callback: (...args: any[]) => void,
  dependencies: any[] = []
): void => {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, callback);

    return () => {
      off(event, callback);
    };
  }, [event, on, off, ...dependencies]);
};

/**
 * Custom hook to emit socket events
 */
export const useSocketEmit = () => {
  const { emit, isConnected } = useSocket();

  return {
    emit,
    isConnected,
    emitSafe: (event: string, data?: any) => {
      if (isConnected) {
        emit(event, data);
        return true;
      } else {
        console.warn('⚠️ Cannot emit event - socket not connected:', event);
        return false;
      }
    },
  };
};

export default SocketContext;
