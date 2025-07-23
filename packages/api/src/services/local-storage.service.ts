import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../utils/Logger';

/**
 * Local Storage Service - No external dependencies required
 * Stores files on local filesystem for development and testing
 */
export class LocalStorageService {
  private readonly uploadDir: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB limit

  constructor() {
    this.uploadDir = path.resolve(process.env['UPLOAD_DIR'] || './uploads');
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'evidence'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'temp'), { recursive: true });
      Logger.info(`✅ Upload directories ready: ${this.uploadDir}`);
    } catch (error) {
      Logger.error('❌ Failed to create upload directory:', error);
      throw new Error(
        `Failed to initialize local storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Upload file to local storage
   */
  async uploadFile(
    file: Buffer | string,
    fileName: string,
    folder: string = 'evidence',
    metadata?: Record<string, any>,
  ): Promise<{ url: string; key: string; size: number }> {
    try {
      // Validate file size
      const fileSize = Buffer.isBuffer(file) ? file.length : Buffer.byteLength(file, 'utf8');
      if (fileSize > this.maxFileSize) {
        throw new Error(`File size ${fileSize} exceeds maximum allowed size ${this.maxFileSize}`);
      }

      // Generate safe filename
      const safeFileName = this.sanitizeFileName(fileName);
      const folderPath = path.join(this.uploadDir, folder);
      const filePath = path.join(folderPath, safeFileName);

      // Ensure folder exists
      await fs.mkdir(folderPath, { recursive: true });

      // Write file
      if (Buffer.isBuffer(file)) {
        await fs.writeFile(filePath, file);
      } else {
        await fs.writeFile(filePath, file, 'utf8');
      }

      // Save metadata if provided
      if (metadata) {
        const metadataPath = path.join(folderPath, `${safeFileName}.meta.json`);
        const metadataWithTimestamp = {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          size: fileSize,
          originalName: fileName,
        };
        await fs.writeFile(metadataPath, JSON.stringify(metadataWithTimestamp, null, 2));
      }

      const relativePath = path.join(folder, safeFileName).replace(/\\/g, '/');
      const url = `/uploads/${relativePath}`;

      Logger.info(`✅ File uploaded locally: ${fileName} (${fileSize} bytes)`);

      return {
        url,
        key: relativePath,
        size: fileSize,
      };
    } catch (error) {
      Logger.error('❌ Local upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, key);
      const metadataPath = `${filePath}.meta.json`;

      // Delete main file
      await fs.unlink(filePath);

      // Delete metadata file (ignore if doesn't exist)
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist, that's okay
      }

      Logger.info(`✅ File deleted locally: ${key}`);
      return true;
    } catch (error) {
      Logger.error(`❌ Local deletion failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Get file URL (for serving via Express static middleware)
   */
  async getFileUrl(key: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);

    try {
      await fs.access(filePath);
      return `/uploads/${key.replace(/\\/g, '/')}`;
    } catch {
      throw new Error(`File not found: ${key}`);
    }
  }

  /**
   * Get presigned URL (same as getFileUrl for local storage)
   */
  async getPresignedUrl(key: string, _expiresIn: number = 3600): Promise<string> {
    return this.getFileUrl(key);
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = 'evidence'): Promise<
    Array<{
      key: string;
      url: string;
      size: number;
      lastModified: Date;
      metadata?: any;
    }>
  > {
    try {
      const folderPath = path.join(this.uploadDir, folder);
      const files = await fs.readdir(folderPath);

      const fileList = [];

      for (const file of files) {
        if (file.endsWith('.meta.json')) continue; // Skip metadata files

        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        const key = path.join(folder, file).replace(/\\/g, '/');

        // Try to load metadata
        let metadata;
        try {
          const metadataPath = `${filePath}.meta.json`;
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        } catch {
          // No metadata available
        }

        fileList.push({
          key,
          url: `/uploads/${key}`,
          size: stats.size,
          lastModified: stats.mtime,
          metadata,
        });
      }

      return fileList;
    } catch (error) {
      Logger.error(`❌ Failed to list files in ${folder}:`, error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    folders: Record<string, { files: number; size: number }>;
  }> {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        folders: {} as Record<string, { files: number; size: number }>,
      };

      const folders = await fs.readdir(this.uploadDir);

      for (const folder of folders) {
        const folderPath = path.join(this.uploadDir, folder);
        const folderStat = await fs.stat(folderPath);

        if (folderStat.isDirectory()) {
          const files = await fs.readdir(folderPath);
          let folderSize = 0;
          let fileCount = 0;

          for (const file of files) {
            if (file.endsWith('.meta.json')) continue;

            const filePath = path.join(folderPath, file);
            const fileStat = await fs.stat(filePath);
            folderSize += fileStat.size;
            fileCount++;
          }

          stats.folders[folder] = { files: fileCount, size: folderSize };
          stats.totalFiles += fileCount;
          stats.totalSize += folderSize;
        }
      }

      return stats;
    } catch (error) {
      Logger.error('❌ Failed to get storage stats:', error);
      return { totalFiles: 0, totalSize: 0, folders: {} };
    }
  }

  /**
   * Health check for local storage
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test write access
      const testFile = path.join(this.uploadDir, 'temp', 'health-check.txt');
      await fs.writeFile(testFile, 'Health check test');
      await fs.unlink(testFile);

      const stats = await this.getStorageStats();

      return {
        status: 'healthy',
        details: {
          uploadDir: this.uploadDir,
          accessible: true,
          stats,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          uploadDir: this.uploadDir,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Sanitize filename for filesystem safety
   */
  private sanitizeFileName(fileName: string): string {
    // Remove dangerous characters and ensure unique names
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const name = path
      .basename(fileName, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50); // Limit length

    return `${timestamp}_${name}${ext}`;
  }
}
