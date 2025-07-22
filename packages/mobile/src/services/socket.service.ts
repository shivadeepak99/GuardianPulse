import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Socket connection configuration
const SOCKET_URL = 'ws://localhost:3001'; // Development URL
const TOKEN_KEY = 'guardian_pulse_token';

// Socket event types for type safety
export interface SocketEvents {
  // Authentication events
  'auth:success': (data: { userId: string; message: string }) => void;
  'auth:error': (data: { message: string }) => void;
  
  // Alert events
  'alert:new': (data: any) => void;
  'alert:update': (data: any) => void;
  
  // Ward monitoring events
  'ward:status_change': (data: any) => void;
  'ward:location_update': (data: any) => void;
  
  // Guardian events
  'guardian:notification': (data: any) => void;
  
  // System events
  'system:maintenance': (data: any) => void;
  'system:emergency': (data: any) => void;
}

export type SocketEventName = keyof SocketEvents;

/**
 * SocketService - Manages WebSocket connection lifecycle and real-time communications
 * 
 * This service handles the persistent Socket.IO connection to the GuardianPulse backend,
 * providing authenticated real-time communication for safety monitoring features.
 */
export class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5 seconds

  /**
   * Get the current socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Connect to the Socket.IO server with JWT authentication
   */
  public async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      console.log('🔄 Socket already connecting or connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('🔌 Attempting to connect to Socket.IO server...');

      // Retrieve JWT token from AsyncStorage
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        console.warn('⚠️ No JWT token found - cannot establish authenticated connection');
        this.isConnecting = false;
        return;
      }

      // Initialize Socket.IO client with authentication
      this.socket = io(SOCKET_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'], // Fallback transports
        timeout: 10000, // 10 second connection timeout
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
      });

      // Set up connection event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('💥 Error connecting to socket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the Socket.IO server
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
    this.isConnecting = false;
  }

  /**
   * Emit an event to the server
   */
  public emit(event: string, data?: any): void {
    if (this.isConnected()) {
      this.socket!.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit event - socket not connected:', event);
    }
  }

  /**
   * Listen for events from the server
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.warn('⚠️ Cannot register listener - socket not initialized:', event);
    }
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Set up core socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log('🆔 Socket ID:', this.socket?.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('💀 Max reconnection attempts reached - giving up');
        this.disconnect();
      }
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnecting = false;
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - don't reconnect automatically
        console.log('🛑 Server initiated disconnect');
      } else if (reason === 'transport close' || reason === 'ping timeout') {
        // Network issues - will auto-reconnect
        console.log('🔄 Network disconnect - will attempt reconnect');
      }
    });

    // Authentication events
    this.socket.on('auth:success', (data) => {
      console.log('🔐 Authentication successful:', data.message);
      console.log('👤 User ID:', data.userId);
    });

    this.socket.on('auth:error', (data) => {
      console.error('🔐 Authentication failed:', data.message);
      // Clear invalid token and disconnect
      this.handleAuthError();
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💀 Reconnection failed - all attempts exhausted');
      this.disconnect();
    });
  }

  /**
   * Handle authentication errors by clearing token and disconnecting
   */
  private async handleAuthError(): Promise<void> {
    try {
      // Clear the invalid token
      await AsyncStorage.removeItem(TOKEN_KEY);
      console.log('🗑️ Cleared invalid token from storage');
      
      // Disconnect socket
      this.disconnect();
      
      // Notify listeners about auth failure (can be used to redirect to login)
      // This will be handled by the SocketContext
    } catch (error) {
      console.error('💥 Error handling auth error:', error);
    }
  }

  /**
   * Update connection with new token (after login/registration)
   */
  public async updateToken(): Promise<void> {
    if (this.isConnected()) {
      // Disconnect current connection
      this.disconnect();
    }
    
    // Reconnect with new token
    await this.connect();
  }

  /**
   * Get connection status information
   */
  public getConnectionStatus(): {
    connected: boolean;
    connecting: boolean;
    socketId: string | null;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      connecting: this.isConnecting,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
export const socketService = new SocketService();
