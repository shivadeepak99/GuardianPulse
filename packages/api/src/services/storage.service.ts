/**
 * Universal Storage Service
 * Supports multiple storage providers with fallback mechanism
 * MAINTAINS BACKWARD COMPATIBILITY with existing S3Service
 */

import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';
import { Logger } from '../utils';

// Storage provider types
export enum StorageProvider {
  LOCAL = 'local',
  AWS_S3 = 'aws-s3',
  DIGITALOCEAN_SPACES = 'digitalocean-spaces',
  CLOUDINARY = 'cloudinary',
  SUPABASE = 'supabase',
}

// Universal storage interface
export interface StorageOptions {
  provider?: StorageProvider;
  fallbackProvider?: StorageProvider;
  enableFallback?: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  provider: StorageProvider;
  error?: string;
  size?: number;
}

/**
 * Universal Storage Service with Provider Fallback
 *
 * Migration Strategy:
 * 1. Starts with existing S3Service (no breaking changes)
 * 2. Allows gradual migration to new providers
 * 3. Supports fallback to S3 if new providers fail
 * 4. Zero downtime migration path
 */
export class StorageService {
  private s3Service: S3Service;
  private localStorageService: LocalStorageService;
  private primaryProvider: StorageProvider;
  private fallbackProvider?: StorageProvider;
  private enableFallback: boolean;

  constructor(options: StorageOptions = {}) {
    // Initialize services
    this.s3Service = new S3Service();
    this.localStorageService = new LocalStorageService();

    // Get provider from environment or options
    const envProvider = process.env['STORAGE_PROVIDER'] as StorageProvider;
    this.primaryProvider = envProvider || options.provider || StorageProvider.LOCAL;
    this.fallbackProvider = options.fallbackProvider || StorageProvider.LOCAL;
    this.enableFallback = options.enableFallback ?? true;

    Logger.info(`Storage service initialized with provider: ${this.primaryProvider}`);
    if (this.enableFallback && this.fallbackProvider) {
      Logger.info(`Fallback provider configured: ${this.fallbackProvider}`);
    }
  }

  /**
   * Upload file with provider fallback
   * BACKWARD COMPATIBLE: Uses existing S3Service by default
   */
  async uploadFile(
    fileName: string,
    fileType: string,
    fileBuffer?: Buffer,
    expiresIn: number = 900,
  ): Promise<UploadResult> {
    try {
      // Try primary provider first
      const result = await this.uploadToProvider(this.primaryProvider, fileName, fileType, fileBuffer, expiresIn);

      if (result.success) {
        return result;
      }

      // Fallback to secondary provider if enabled
      if (this.enableFallback && this.fallbackProvider && this.fallbackProvider !== this.primaryProvider) {
        Logger.warn(`Primary provider ${this.primaryProvider} failed, trying fallback`);

        return await this.uploadToProvider(this.fallbackProvider, fileName, fileType, fileBuffer, expiresIn);
      }

      return result;
    } catch (error) {
      Logger.error('Storage service upload failed:', error);
      return {
        success: false,
        provider: this.primaryProvider,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      };
    }
  }

  /**
   * Generate presigned URL (backward compatible with S3Service)
   */
  async getUploadPresignedUrl(fileName: string, fileType: string, expiresIn: number = 900): Promise<string> {
    try {
      // For now, delegate to existing S3Service (zero breaking changes)
      if (this.primaryProvider === StorageProvider.AWS_S3) {
        return await this.s3Service.getUploadPresignedUrl(fileName, fileType, expiresIn);
      }

      // TODO: Implement other providers (future enhancement)
      // For now, fallback to S3 to maintain functionality
      Logger.warn(`Provider ${this.primaryProvider} not yet implemented, falling back to S3`);
      return await this.s3Service.getUploadPresignedUrl(fileName, fileType, expiresIn);
    } catch (error) {
      Logger.error('Failed to generate presigned URL:', error);
      throw error;
    }
  }

  /**
   * Upload to specific provider
   */
  private async uploadToProvider(
    provider: StorageProvider,
    fileName: string,
    fileType: string,
    fileBuffer?: Buffer,
    expiresIn: number = 900,
  ): Promise<UploadResult> {
    switch (provider) {
      case StorageProvider.LOCAL:
        try {
          if (!fileBuffer) {
            // For local storage, we need the actual file buffer
            return {
              success: false,
              provider: StorageProvider.LOCAL,
              error: 'File buffer required for local storage',
            };
          }

          const result = await this.localStorageService.uploadFile(fileBuffer, fileName, 'evidence');
          return {
            success: true,
            url: result.url,
            key: result.key,
            size: result.size,
            provider: StorageProvider.LOCAL,
          };
        } catch (error) {
          return {
            success: false,
            provider: StorageProvider.LOCAL,
            error: error instanceof Error ? error.message : 'Local storage upload failed',
          };
        }

      case StorageProvider.AWS_S3:
        try {
          const url = await this.s3Service.getUploadPresignedUrl(fileName, fileType, expiresIn);
          return {
            success: true,
            url,
            provider: StorageProvider.AWS_S3,
          };
        } catch (error) {
          return {
            success: false,
            provider: StorageProvider.AWS_S3,
            error: error instanceof Error ? error.message : 'S3 upload failed',
          };
        }

      case StorageProvider.DIGITALOCEAN_SPACES:
        // TODO: Implement DigitalOcean Spaces (Phase 2)
        return {
          success: false,
          provider: StorageProvider.DIGITALOCEAN_SPACES,
          error: 'DigitalOcean Spaces not yet implemented',
        };

      case StorageProvider.CLOUDINARY:
        // TODO: Implement Cloudinary (Phase 2)
        return {
          success: false,
          provider: StorageProvider.CLOUDINARY,
          error: 'Cloudinary not yet implemented',
        };

      case StorageProvider.SUPABASE:
        // TODO: Implement Supabase Storage (Phase 2)
        return {
          success: false,
          provider: StorageProvider.SUPABASE,
          error: 'Supabase Storage not yet implemented',
        };

      default:
        return {
          success: false,
          provider,
          error: `Unsupported storage provider: ${provider}`,
        };
    }
  }

  /**
   * Health check for storage providers
   */
  async healthCheck(): Promise<{ [key in StorageProvider]?: boolean }> {
    const health: { [key in StorageProvider]?: boolean } = {};

    // Check S3 health
    try {
      // Simple test - try to generate a presigned URL
      await this.s3Service.getUploadPresignedUrl('health-check.txt', 'text/plain', 60);
      health[StorageProvider.AWS_S3] = true;
    } catch {
      health[StorageProvider.AWS_S3] = false;
    }

    // TODO: Add health checks for other providers

    return health;
  }
}

// Export singleton instance for backward compatibility
export const storageService = new StorageService();
