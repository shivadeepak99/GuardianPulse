import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { DatabaseService } from './services';
import { Logger } from './utils';

/**
 * Socket.IO Integration for Real-Time Communication
 * Handles WebSocket connections, authentication, and real-time messaging
 */

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Live session data interface
interface LiveSessionData {
  userId: string;
  startTime: Date;
  sessionId: string;
  roomName: string;
  guardianIds: string[];
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
}

// Location update payload interface
interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// In-memory store for active live sessions
const activeSessions = new Map<string, LiveSessionData>();

/**
 * Initialize Socket.IO server with authentication middleware
 * @param httpServer - HTTP server instance to attach Socket.IO
 * @returns Socket.IO server instance
 */
export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env['FRONTEND_URL'] || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  Logger.info('Socket.IO server initialized');

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.['token'];
      
      if (!token) {
        Logger.warn('Socket connection rejected: No token provided', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      
      if (!decoded.userId || !decoded.email) {
        Logger.warn('Socket connection rejected: Invalid token payload', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Invalid token'));
      }

      // Verify user exists and is active
      const prisma = DatabaseService.getInstance();
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, isActive: true }
      });

      if (!user) {
        Logger.warn('Socket connection rejected: User not found', {
          socketId: socket.id,
          userId: decoded.userId,
          ip: socket.handshake.address
        });
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        Logger.warn('Socket connection rejected: User account inactive', {
          socketId: socket.id,
          userId: decoded.userId,
          ip: socket.handshake.address
        });
        return next(new Error('Account inactive'));
      }

      // Attach user information to socket
      socket.userId = user.id;
      socket.userEmail = user.email;

      Logger.info('Socket authentication successful', {
        socketId: socket.id,
        userId: user.id,
        email: user.email,
        ip: socket.handshake.address
      });

      next();
    } catch (error) {
      Logger.error('Socket authentication failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: socket.handshake.address
      });
      
      if (error instanceof jwt.JsonWebTokenError) {
        next(new Error('Invalid token'));
      } else if (error instanceof jwt.TokenExpiredError) {
        next(new Error('Token expired'));
      } else {
        next(new Error('Authentication failed'));
      }
    }
  });

  // Connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    Logger.info('New WebSocket connection established', {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.userEmail,
      connectedClients: io.engine.clientsCount
    });

    // Join user-specific room for targeted messaging
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      Logger.debug('Socket joined user room', {
        socketId: socket.id,
        userId: socket.userId,
        room: `user:${socket.userId}`
      });
    }

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverId: process.env['SERVER_ID'] || 'main'
      });
    });

    // Handle user status updates
    socket.on('status:update', (data) => {
      Logger.debug('User status update received', {
        socketId: socket.id,
        userId: socket.userId,
        status: data?.status
      });

      // Broadcast status to user's connections
      if (socket.userId) {
        socket.to(`user:${socket.userId}`).emit('status:updated', {
          userId: socket.userId,
          status: data?.status,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle location updates (legacy - for non-session use cases)
    socket.on('location:update', (data) => {
      Logger.debug('Legacy location update received', {
        socketId: socket.id,
        userId: socket.userId,
        hasCoordinates: !!(data?.latitude && data?.longitude)
      });

      // For legacy compatibility - basic location acknowledgment
      // For live session location tracking, use 'update-location' event instead
      socket.emit('location:acknowledged', {
        timestamp: new Date().toISOString(),
        status: 'received',
        note: 'For live session tracking, use update-location event'
      });
    });

    // Handle emergency alerts
    socket.on('emergency:alert', async (data) => {
      Logger.warn('Emergency alert received', {
        socketId: socket.id,
        userId: socket.userId,
        alertType: data?.type,
        severity: data?.severity
      });

      try {
        // In a real implementation, you would:
        // 1. Validate alert data
        // 2. Store alert in database
        // 3. Notify emergency services if needed
        // 4. Alert emergency contacts
        // 5. Trigger automated responses

        // Acknowledge emergency alert
        socket.emit('emergency:acknowledged', {
          alertId: `alert_${Date.now()}_${socket.userId}`,
          timestamp: new Date().toISOString(),
          status: 'processing',
          message: 'Emergency alert received and being processed'
        });

        // Broadcast to monitoring systems (if any)
        io.to('monitors').emit('emergency:new', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          alertData: data,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        Logger.error('Failed to process emergency alert', {
          socketId: socket.id,
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        socket.emit('emergency:error', {
          message: 'Failed to process emergency alert',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle custom events
    socket.on('message', (data) => {
      Logger.debug('Custom message received', {
        socketId: socket.id,
        userId: socket.userId,
        messageType: data?.type
      });

      // Echo message back with timestamp
      socket.emit('message:received', {
        ...data,
        timestamp: new Date().toISOString(),
        serverId: process.env['SERVER_ID'] || 'main'
      });
    });

    // Live Session Management - Prompt #14
    
    // Handle start live session
    socket.on('start-live-session', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('session-error', {
            message: 'User not authenticated',
            timestamp: new Date().toISOString()
          });
          return;
        }

        Logger.info('Starting live session', {
          socketId: socket.id,
          userId: socket.userId,
          sessionData: data
        });

        // Check if user already has an active session
        if (activeSessions.has(socket.userId)) {
          socket.emit('session-error', {
            message: 'Session already active',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Generate unique session ID and room name
        const sessionId = `session_${socket.userId}_${Date.now()}`;
        const roomName = `ward:${socket.userId}`;

        // Fetch the Ward's list of accepted guardians from database
        const prisma = DatabaseService.getInstance();
        const guardianRelationships = await prisma.guardianRelationship.findMany({
          where: {
            wardId: socket.userId,
            isActive: true
          },
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        const guardianIds = guardianRelationships.map((rel: any) => rel.guardianId);

        // Add session to activeSessions map
        const sessionData: LiveSessionData = {
          userId: socket.userId,
          startTime: new Date(),
          sessionId,
          roomName,
          guardianIds
        };
        activeSessions.set(socket.userId, sessionData);

        // Ward joins their own room
        socket.join(roomName);

        // Find connected guardians and add them to the room
        const connectedGuardians: string[] = [];
        for (const guardianId of guardianIds) {
          const guardianSockets = await io.in(`user:${guardianId}`).fetchSockets();
          for (const guardianSocket of guardianSockets) {
            await guardianSocket.join(roomName);
            connectedGuardians.push(guardianId);
            
            // Notify guardian about new live session
            guardianSocket.emit('guardian:session-started', {
              wardId: socket.userId,
              wardEmail: socket.userEmail,
              sessionId,
              startTime: sessionData.startTime,
              timestamp: new Date().toISOString()
            });
          }
        }

        Logger.info('Live session started successfully', {
          userId: socket.userId,
          sessionId,
          roomName,
          totalGuardians: guardianIds.length,
          connectedGuardians: connectedGuardians.length
        });

        // Emit session-started event back to the Ward
        socket.emit('session-started', {
          sessionId,
          startTime: sessionData.startTime,
          roomName,
          guardians: guardianRelationships.map((rel: any) => rel.guardian),
          connectedGuardians: connectedGuardians.length,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        Logger.error('Failed to start live session', {
          socketId: socket.id,
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        socket.emit('session-error', {
          message: 'Failed to start live session',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle stop live session
    socket.on('stop-live-session', async () => {
      try {
        if (!socket.userId) {
          socket.emit('session-error', {
            message: 'User not authenticated',
            timestamp: new Date().toISOString()
          });
          return;
        }

        Logger.info('Stopping live session', {
          socketId: socket.id,
          userId: socket.userId
        });

        // Get session data
        const sessionData = activeSessions.get(socket.userId);
        if (!sessionData) {
          socket.emit('session-error', {
            message: 'No active session found',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Remove from activeSessions
        activeSessions.delete(socket.userId);

        // Calculate session duration
        const endTime = new Date();
        const duration = endTime.getTime() - sessionData.startTime.getTime();

        // Emit session-ended event to the room (Ward and all connected guardians)
        io.to(sessionData.roomName).emit('session-ended', {
          sessionId: sessionData.sessionId,
          wardId: socket.userId,
          wardEmail: socket.userEmail,
          startTime: sessionData.startTime,
          endTime,
          duration: Math.round(duration / 1000), // duration in seconds
          timestamp: new Date().toISOString()
        });

        // Remove all sockets from the session room
        const roomSockets = await io.in(sessionData.roomName).fetchSockets();
        for (const roomSocket of roomSockets) {
          roomSocket.leave(sessionData.roomName);
        }

        Logger.info('Live session stopped successfully', {
          userId: socket.userId,
          sessionId: sessionData.sessionId,
          duration: Math.round(duration / 1000) + 's'
        });

      } catch (error) {
        Logger.error('Failed to stop live session', {
          socketId: socket.id,
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        socket.emit('session-error', {
          message: 'Failed to stop live session',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Real-time Location Tracking - Prompt #15
    
    // Handle location updates during active sessions
    socket.on('update-location', async (data: LocationUpdatePayload) => {
      try {
        if (!socket.userId) {
          socket.emit('location-error', {
            message: 'User not authenticated',
            timestamp: new Date().toISOString()
          });
          return;
        }

        Logger.debug('Location update received', {
          socketId: socket.id,
          userId: socket.userId,
          hasCoordinates: !!(data?.latitude && data?.longitude),
          accuracy: data?.accuracy
        });

        // Verify that the Ward has an active session
        const sessionData = activeSessions.get(socket.userId);
        if (!sessionData) {
          Logger.debug('Location update ignored - no active session', {
            userId: socket.userId
          });
          
          socket.emit('location-error', {
            message: 'No active session found. Start a live session to share location.',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate location data
        if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
          socket.emit('location-error', {
            message: 'Invalid location data. Latitude and longitude are required.',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate coordinate ranges
        if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) {
          socket.emit('location-error', {
            message: 'Invalid coordinate values. Latitude must be between -90 and 90, longitude between -180 and 180.',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Update session data with new location and timestamp
        const locationUpdate: {
          latitude: number;
          longitude: number;
          timestamp: Date;
          accuracy?: number;
        } = {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date()
        };

        if (data.accuracy !== undefined) {
          locationUpdate.accuracy = data.accuracy;
        }

        sessionData.lastLocation = locationUpdate;
        activeSessions.set(socket.userId, sessionData);

        // Prepare broadcast payload for guardians
        const broadcastPayload = {
          wardId: socket.userId,
          wardEmail: socket.userEmail,
          sessionId: sessionData.sessionId,
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            altitude: data.altitude,
            heading: data.heading,
            speed: data.speed,
            timestamp: locationUpdate.timestamp.toISOString()
          },
          timestamp: new Date().toISOString()
        };

        // Broadcast location-updated event to the Ward's specific room (guardians)
        io.to(sessionData.roomName).emit('location-updated', broadcastPayload);

        Logger.info('Location broadcasted to guardians', {
          userId: socket.userId,
          sessionId: sessionData.sessionId,
          roomName: sessionData.roomName,
          guardianCount: sessionData.guardianIds.length,
          coordinates: `${data.latitude}, ${data.longitude}`
        });

        // Acknowledge location update to the Ward
        socket.emit('location-acknowledged', {
          sessionId: sessionData.sessionId,
          timestamp: locationUpdate.timestamp.toISOString(),
          status: 'broadcasted',
          guardianCount: sessionData.guardianIds.length
        });

      } catch (error) {
        Logger.error('Failed to process location update', {
          socketId: socket.id,
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        socket.emit('location-error', {
          message: 'Failed to process location update',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Real-time Audio Streaming - Prompt #32
    
    // Handle audio stream chunks during active sessions
    socket.on('audio-stream', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('audio-error', {
            message: 'User not authenticated',
            timestamp: new Date().toISOString()
          });
          return;
        }

        Logger.debug('Audio stream chunk received', {
          socketId: socket.id,
          userId: socket.userId,
          hasAudioData: !!data?.audioData,
          format: data?.format,
          timestamp: data?.timestamp
        });

        // Verify that the Ward has an active session
        const sessionData = activeSessions.get(socket.userId);
        if (!sessionData) {
          Logger.debug('Audio stream ignored - no active session', {
            userId: socket.userId
          });
          
          socket.emit('audio-error', {
            message: 'No active session found. Start a live session to stream audio.',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate audio data
        if (!data || !data.audioData || !data.timestamp) {
          socket.emit('audio-error', {
            message: 'Invalid audio data. Audio data and timestamp are required.',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Create audio chunk payload for guardians
        const audioChunkPayload = {
          sessionId: sessionData.sessionId,
          wardId: socket.userId,
          audio: {
            data: data.audioData,
            timestamp: data.timestamp,
            format: data.format || 'm4a',
            sampleRate: data.sampleRate || 16000,
            channels: data.channels || 1,
            chunkIndex: Date.now(), // Unique identifier for this chunk
          },
          timestamp: new Date().toISOString()
        };

        // Broadcast audio chunk to the Ward's guardians
        io.to(sessionData.roomName).emit('audio-chunk-received', audioChunkPayload);

        Logger.info('Audio chunk broadcasted to guardians', {
          userId: socket.userId,
          sessionId: sessionData.sessionId,
          roomName: sessionData.roomName,
          guardianCount: sessionData.guardianIds.length,
          audioFormat: data.format,
          chunkSize: data.audioData?.length || 0
        });

        // Acknowledge audio chunk to the Ward
        socket.emit('audio-acknowledged', {
          sessionId: sessionData.sessionId,
          timestamp: new Date().toISOString(),
          status: 'broadcasted',
          guardianCount: sessionData.guardianIds.length,
          chunkIndex: audioChunkPayload.audio.chunkIndex
        });

      } catch (error) {
        Logger.error('Failed to process audio stream', {
          socketId: socket.id,
          userId: socket.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        socket.emit('audio-error', {
          message: 'Failed to process audio stream',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      Logger.info('WebSocket connection closed', {
        socketId: socket.id,
        userId: socket.userId,
        email: socket.userEmail,
        reason,
        connectedClients: io.engine.clientsCount - 1
      });

      // Clean up active live sessions if user disconnects
      if (socket.userId && activeSessions.has(socket.userId)) {
        const sessionData = activeSessions.get(socket.userId);
        if (sessionData) {
          Logger.info('Cleaning up live session due to disconnect', {
            userId: socket.userId,
            sessionId: sessionData.sessionId
          });

          // Remove from activeSessions
          activeSessions.delete(socket.userId);

          // Calculate session duration
          const endTime = new Date();
          const duration = endTime.getTime() - sessionData.startTime.getTime();

          // Notify all guardians in the room that session ended due to disconnect
          io.to(sessionData.roomName).emit('session-ended', {
            sessionId: sessionData.sessionId,
            wardId: socket.userId,
            wardEmail: socket.userEmail,
            startTime: sessionData.startTime,
            endTime,
            duration: Math.round(duration / 1000),
            reason: 'ward_disconnected',
            timestamp: new Date().toISOString()
          });

          // Clean up the room
          const roomSockets = await io.in(sessionData.roomName).fetchSockets();
          for (const roomSocket of roomSockets) {
            roomSocket.leave(sessionData.roomName);
          }
        }
      }

      // Additional cleanup for user-specific data
      // In a real implementation, you might:
      // 1. Update user's last seen timestamp
      // 2. Notify contacts about offline status
    });

    // Handle connection errors
    socket.on('error', (error) => {
      Logger.error('Socket error occurred', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message || 'Unknown socket error'
      });
    });
  });

  // Global error handling
  io.on('connect_error', (error) => {
    Logger.error('Socket.IO connection error', {
      error: error.message || 'Unknown connection error'
    });
  });

  return io;
}

/**
 * Utility function to emit message to specific user
 * @param io - Socket.IO server instance
 * @param userId - Target user ID
 * @param event - Event name
 * @param data - Event data
 */
export function emitToUser(io: Server, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
  
  Logger.debug('Message emitted to user', {
    userId,
    event,
    hasData: !!data
  });
}

/**
 * Utility function to broadcast message to all connected clients
 * @param io - Socket.IO server instance
 * @param event - Event name
 * @param data - Event data
 */
export function broadcastToAll(io: Server, event: string, data: any): void {
  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
  
  Logger.debug('Message broadcasted to all clients', {
    event,
    connectedClients: io.engine.clientsCount,
    hasData: !!data
  });
}

/**
 * Get all active live sessions
 * @returns Map of active sessions
 */
export function getActiveSessions(): Map<string, LiveSessionData> {
  return new Map(activeSessions);
}

/**
 * Get active session for a specific user
 * @param userId - User ID to check
 * @returns Session data if active, undefined otherwise
 */
export function getUserActiveSession(userId: string): LiveSessionData | undefined {
  return activeSessions.get(userId);
}

/**
 * Check if a user has an active live session
 * @param userId - User ID to check
 * @returns True if user has active session
 */
export function hasActiveSession(userId: string): boolean {
  return activeSessions.has(userId);
}

/**
 * Get count of active sessions
 * @returns Number of active sessions
 */
export function getActiveSessionCount(): number {
  return activeSessions.size;
}

/**
 * Get current location for a Ward's active session
 * @param userId - Ward's user ID
 * @returns Current location data if available
 */
export function getSessionLocation(userId: string): {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
} | undefined {
  const session = activeSessions.get(userId);
  return session?.lastLocation;
}

/**
 * Get all active sessions with their locations
 * @returns Array of sessions with location data
 */
export function getActiveSessionsWithLocations(): Array<{
  userId: string;
  sessionId: string;
  startTime: Date;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
}> {
  const sessions: Array<{
    userId: string;
    sessionId: string;
    startTime: Date;
    location?: {
      latitude: number;
      longitude: number;
      timestamp: Date;
      accuracy?: number;
    };
  }> = [];
  
  for (const sessionData of activeSessions.values()) {
    const sessionInfo: {
      userId: string;
      sessionId: string;
      startTime: Date;
      location?: {
        latitude: number;
        longitude: number;
        timestamp: Date;
        accuracy?: number;
      };
    } = {
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      startTime: sessionData.startTime
    };
    
    if (sessionData.lastLocation) {
      sessionInfo.location = sessionData.lastLocation;
    }
    
    sessions.push(sessionInfo);
  }
  
  return sessions;
}

export default initSocket;
