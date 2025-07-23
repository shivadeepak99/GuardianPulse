import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils';

/**
 * Redis Service for In-Memory Data Buffering
 *
 * Manages Redis client connection and provides methods for:
 * - Buffering location and sensor data for active sessions
 * - Storing the last minute of data for incident analysis
 * - Fast retrieval during incident creation
 */
export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  /**
   * Get singleton instance of RedisService
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Initialize Redis connection
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        Logger.info('Redis client already connected');
        return;
      }

      const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: retries => {
            // Exponential backoff with maximum of 30 seconds
            const delay = Math.min(retries * 50, 30000);
            Logger.warn(`Redis reconnection attempt ${retries} in ${delay}ms`);
            return delay;
          },
        },
      });

      // Setup event handlers
      this.client.on('error', err => {
        Logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        Logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        Logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        Logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      Logger.info('Redis service initialized successfully');
    } catch (error) {
      Logger.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed');
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      Logger.info('Redis service disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  public isRedisConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get the Redis client instance
   */
  private getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Buffer location data for a user session
   * Keeps the last 60 data points (approximately 1 minute of data)
   */
  public async bufferLocationData(userId: string, locationData: any): Promise<void> {
    try {
      const client = this.getClient();
      const key = `location:${userId}`;

      // Add timestamp to the data
      const dataWithTimestamp = {
        ...locationData,
        timestamp: new Date().toISOString(),
      };

      // Push to the beginning of the list and trim to keep only last 60 entries
      await client.lPush(key, JSON.stringify(dataWithTimestamp));
      await client.lTrim(key, 0, 59); // Keep only the last 60 entries

      // Set expiration to 10 minutes to cleanup inactive sessions
      await client.expire(key, 600);

      Logger.debug(`Buffered location data for user ${userId}`);
    } catch (error) {
      Logger.error(`Failed to buffer location data for user ${userId}:`, error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Buffer sensor data for a user session
   * Keeps the last 60 data points (approximately 1 minute of data)
   */
  public async bufferSensorData(userId: string, sensorData: any): Promise<void> {
    try {
      const client = this.getClient();
      const key = `sensor:${userId}`;

      // Add timestamp to the data
      const dataWithTimestamp = {
        ...sensorData,
        timestamp: new Date().toISOString(),
      };

      // Push to the beginning of the list and trim to keep only last 60 entries
      await client.lPush(key, JSON.stringify(dataWithTimestamp));
      await client.lTrim(key, 0, 59); // Keep only the last 60 entries

      // Set expiration to 10 minutes to cleanup inactive sessions
      await client.expire(key, 600);

      Logger.debug(`Buffered sensor data for user ${userId}`);
    } catch (error) {
      Logger.error(`Failed to buffer sensor data for user ${userId}:`, error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Retrieve all buffered location data for a user
   * Returns the data in chronological order (oldest first)
   */
  public async getBufferedLocationData(userId: string): Promise<any[]> {
    try {
      const client = this.getClient();
      const key = `location:${userId}`;

      // Get all data from the list (LRANGE returns in LIFO order, so we reverse)
      const rawData = await client.lRange(key, 0, -1);
      const parsedData = rawData.map(item => JSON.parse(item));

      // Reverse to get chronological order (oldest first)
      return parsedData.reverse();
    } catch (error) {
      Logger.error(`Failed to retrieve buffered location data for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Retrieve all buffered sensor data for a user
   * Returns the data in chronological order (oldest first)
   */
  public async getBufferedSensorData(userId: string): Promise<any[]> {
    try {
      const client = this.getClient();
      const key = `sensor:${userId}`;

      // Get all data from the list (LRANGE returns in LIFO order, so we reverse)
      const rawData = await client.lRange(key, 0, -1);
      const parsedData = rawData.map(item => JSON.parse(item));

      // Reverse to get chronological order (oldest first)
      return parsedData.reverse();
    } catch (error) {
      Logger.error(`Failed to retrieve buffered sensor data for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get combined pre-incident data for a user
   * Combines both location and sensor data for incident creation
   */
  public async getPreIncidentData(userId: string): Promise<{
    locationData: any[];
    sensorData: any[];
    retrievedAt: string;
  }> {
    try {
      const [locationData, sensorData] = await Promise.all([
        this.getBufferedLocationData(userId),
        this.getBufferedSensorData(userId),
      ]);

      return {
        locationData,
        sensorData,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      Logger.error(`Failed to retrieve pre-incident data for user ${userId}:`, error);
      return {
        locationData: [],
        sensorData: [],
        retrievedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear buffered data for a user (cleanup after incident or session end)
   */
  public async clearUserBuffer(userId: string): Promise<void> {
    try {
      const client = this.getClient();
      await Promise.all([client.del(`location:${userId}`), client.del(`sensor:${userId}`)]);

      Logger.debug(`Cleared buffer data for user ${userId}`);
    } catch (error) {
      Logger.error(`Failed to clear buffer data for user ${userId}:`, error);
    }
  }

  /**
   * Health check for Redis connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      Logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get Redis connection statistics
   */
  public async getStats(): Promise<{
    connected: boolean;
    memory: string;
    clients: string;
    keyspace: string;
  }> {
    try {
      if (!this.isConnected || !this.client) {
        return {
          connected: false,
          memory: 'N/A',
          clients: 'N/A',
          keyspace: 'N/A',
        };
      }

      const info = await this.client.info();
      const lines = info.split('\r\n');

      const stats = {
        connected: this.isConnected,
        memory: 'N/A',
        clients: 'N/A',
        keyspace: 'N/A',
      };

      lines.forEach(line => {
        if (line.startsWith('used_memory_human:')) {
          stats.memory = line.split(':')[1] || 'N/A';
        } else if (line.startsWith('connected_clients:')) {
          stats.clients = line.split(':')[1] || 'N/A';
        } else if (line.startsWith('db0:')) {
          stats.keyspace = line.split(':')[1] || 'N/A';
        }
      });

      return stats;
    } catch (error) {
      Logger.error('Failed to get Redis stats:', error);
      return {
        connected: false,
        memory: 'Error',
        clients: 'Error',
        keyspace: 'Error',
      };
    }
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();
