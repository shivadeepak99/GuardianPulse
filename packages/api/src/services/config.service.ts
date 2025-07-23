import { DatabaseService } from './database.service';
import { Logger } from '../utils';

/**
 * Configuration Service for Dynamic Application Settings
 *
 * Provides centralized management of application configuration values
 * and feature flags that can be updated without code changes.
 */
export class ConfigService {
  private static instance: ConfigService;
  private db: ReturnType<typeof DatabaseService.getInstance>;
  private configCache = new Map<string, string>();
  private lastLoadTime: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get singleton instance of ConfigService
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Initialize the configuration service by loading all configs into memory
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadConfigsIntoCache();
      Logger.info('Configuration service initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize configuration service:', error);
      throw new Error('Configuration service initialization failed');
    }
  }

  /**
   * Load all configuration values from database into memory cache
   */
  private async loadConfigsIntoCache(): Promise<void> {
    try {
      const configs = await this.db.appConfig.findMany({
        where: {
          isActive: true,
        },
        select: {
          key: true,
          value: true,
        },
      });

      // Clear existing cache and load new values
      this.configCache.clear();
      configs.forEach(config => {
        this.configCache.set(config.key, config.value);
      });

      this.lastLoadTime = new Date();

      Logger.info(`Loaded ${configs.length} configuration values into cache`);
    } catch (error) {
      Logger.error('Failed to load configurations from database:', error);
      throw error;
    }
  }

  /**
   * Check if cache needs to be refreshed
   */
  private shouldRefreshCache(): boolean {
    if (!this.lastLoadTime) {
      return true;
    }

    const now = new Date();
    const timeSinceLastLoad = now.getTime() - this.lastLoadTime.getTime();
    return timeSinceLastLoad > this.CACHE_TTL_MS;
  }

  /**
   * Get configuration value by key
   * Automatically refreshes cache if TTL expired
   */
  public async getConfig(key: string): Promise<string | null> {
    try {
      // Refresh cache if needed
      if (this.shouldRefreshCache()) {
        await this.loadConfigsIntoCache();
      }

      const value = this.configCache.get(key);
      return value || null;
    } catch (error) {
      Logger.error(`Failed to get config for key '${key}':`, error);
      return null;
    }
  }

  /**
   * Get configuration value as number
   * Returns default value if key not found or value is not a valid number
   */
  public async getConfigAsNumber(key: string, defaultValue: number = 0): Promise<number> {
    try {
      const value = await this.getConfig(key);
      if (value === null) {
        return defaultValue;
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        Logger.warn(`Config value for '${key}' is not a valid number: ${value}. Using default: ${defaultValue}`);
        return defaultValue;
      }

      return numValue;
    } catch (error) {
      Logger.error(`Failed to get config as number for key '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Get configuration value as boolean
   * Returns default value if key not found or value is not a valid boolean
   */
  public async getConfigAsBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    try {
      const value = await this.getConfig(key);
      if (value === null) {
        return defaultValue;
      }

      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
        return true;
      } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
        return false;
      } else {
        Logger.warn(`Config value for '${key}' is not a valid boolean: ${value}. Using default: ${defaultValue}`);
        return defaultValue;
      }
    } catch (error) {
      Logger.error(`Failed to get config as boolean for key '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Update configuration value (admin only)
   * Updates both database and cache
   */
  public async updateConfig(key: string, value: string, description?: string, category?: string): Promise<void> {
    try {
      // Update in database
      await this.db.appConfig.upsert({
        where: { key },
        update: {
          value,
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
          updatedAt: new Date(),
        },
        create: {
          key,
          value,
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
          isActive: true,
        },
      });

      // Update cache
      this.configCache.set(key, value);

      Logger.info(`Configuration updated: ${key} = ${value}`);
    } catch (error) {
      Logger.error(`Failed to update config '${key}':`, error);
      throw new Error(`Failed to update configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or update multiple configurations at once
   */
  public async updateConfigs(
    configs: Array<{
      key: string;
      value: string;
      description?: string;
      category?: string;
    }>,
  ): Promise<void> {
    try {
      // Use transaction for atomic updates
      await this.db.$transaction(async tx => {
        for (const config of configs) {
          await tx.appConfig.upsert({
            where: { key: config.key },
            update: {
              value: config.value,
              ...(config.description !== undefined && { description: config.description }),
              ...(config.category !== undefined && { category: config.category }),
              updatedAt: new Date(),
            },
            create: {
              key: config.key,
              value: config.value,
              ...(config.description !== undefined && { description: config.description }),
              ...(config.category !== undefined && { category: config.category }),
              isActive: true,
            },
          });
        }
      });

      // Update cache
      configs.forEach(config => {
        this.configCache.set(config.key, config.value);
      });

      Logger.info(`Updated ${configs.length} configurations`);
    } catch (error) {
      Logger.error('Failed to update multiple configs:', error);
      throw new Error(`Failed to update configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all configurations (for admin interface)
   */
  public async getAllConfigs(): Promise<
    Array<{
      id: string;
      key: string;
      value: string;
      description: string | null;
      category: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    try {
      return await this.db.appConfig.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });
    } catch (error) {
      Logger.error('Failed to get all configurations:', error);
      throw new Error(`Failed to retrieve configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete configuration (admin only)
   */
  public async deleteConfig(key: string): Promise<void> {
    try {
      await this.db.appConfig.delete({
        where: { key },
      });

      // Remove from cache
      this.configCache.delete(key);

      Logger.info(`Configuration deleted: ${key}`);
    } catch (error) {
      Logger.error(`Failed to delete config '${key}':`, error);
      throw new Error(`Failed to delete configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Force refresh cache from database
   */
  public async refreshCache(): Promise<void> {
    try {
      await this.loadConfigsIntoCache();
      Logger.info('Configuration cache refreshed');
    } catch (error) {
      Logger.error('Failed to refresh configuration cache:', error);
      throw new Error('Failed to refresh configuration cache');
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    cacheSize: number;
    lastLoadTime: Date | null;
    isCacheExpired: boolean;
  } {
    return {
      cacheSize: this.configCache.size,
      lastLoadTime: this.lastLoadTime,
      isCacheExpired: this.shouldRefreshCache(),
    };
  }

  /**
   * Health check for configuration service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Try to get a simple config or perform a lightweight database query
      await this.db.appConfig.count();
      return true;
    } catch (error) {
      Logger.error('Configuration service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
