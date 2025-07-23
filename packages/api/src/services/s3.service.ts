import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { Logger } from '../utils';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Initialize S3 client with configuration
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.bucketName = config.aws.s3BucketName;
  }

  /**
   * Generate a pre-signed URL for uploading files to S3
   * @param fileName - The name of the file to upload
   * @param fileType - The MIME type of the file
   * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
   * @returns Pre-signed URL for PUT operation
   */
  async getUploadPresignedUrl(
    fileName: string,
    fileType: string,
    expiresIn: number = 900, // 15 minutes
  ): Promise<string> {
    try {
      // Sanitize fileName to prevent path traversal
      const sanitizedFileName = this.sanitizeFileName(fileName);

      // Generate a unique key with timestamp and UUID
      const fileKey = this.generateUniqueFileKey(sanitizedFileName);

      // Create the PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: fileType,
        // Add metadata for tracking
        Metadata: {
          'upload-timestamp': Date.now().toString(),
          'original-filename': sanitizedFileName,
        },
      });

      // Generate pre-signed URL
      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      Logger.error('Error generating pre-signed URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate a pre-signed URL for downloading files from S3
   * @param fileKey - The S3 key of the file
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Pre-signed URL for GET operation
   */
  async getDownloadPresignedUrl(
    fileKey: string,
    expiresIn: number = 3600, // 1 hour
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      Logger.error('Error generating download pre-signed URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Sanitize file name to prevent security issues
   * @param fileName - Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path separators and dangerous characters
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Generate a unique file key for S3 storage
   * @param fileName - Sanitized file name
   * @returns Unique S3 key
   */
  private generateUniqueFileKey(fileName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop() || '';

    // Structure: evidence/year/month/timestamp_randomId.extension
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `evidence/${year}/${month}/${timestamp}_${randomId}${extension ? '.' + extension : ''}`;
  }

  /**
   * Validate file type for evidence uploads
   * @param fileType - MIME type to validate
   * @returns True if file type is allowed
   */
  isValidFileType(fileType: string): boolean {
    const allowedTypes = [
      // Audio files
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/webm',
      'audio/ogg',

      // Video files
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo', // AVI

      // Image files (for screenshots)
      'image/jpeg',
      'image/png',
      'image/webp',

      // Document files
      'application/pdf',
      'text/plain',
    ];

    return allowedTypes.includes(fileType);
  }

  /**
   * Validate file size (in bytes)
   * @param fileSize - Size in bytes
   * @returns True if file size is within limits
   */
  isValidFileSize(fileSize: number): boolean {
    const maxSize = 100 * 1024 * 1024; // 100MB
    return fileSize > 0 && fileSize <= maxSize;
  }
}
