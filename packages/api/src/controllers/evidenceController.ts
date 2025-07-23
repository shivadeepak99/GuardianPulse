import { Request, Response } from 'express';
import { z } from 'zod';
import { S3Service } from '../services/s3.service';
import { Logger } from '../utils';

// Validation schema for upload URL request
const uploadUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive').optional(),
});

export class EvidenceController {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  /**
   * Generate pre-signed URL for evidence upload
   * POST /api/v1/evidence/upload-url
   */
  getUploadUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validationResult = uploadUrlSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const { fileName, fileType, fileSize } = validationResult.data;

      // Validate file type
      if (!this.s3Service.isValidFileType(fileType)) {
        res.status(400).json({
          error: 'Invalid file type',
          message: 'Only audio, video, image, and document files are allowed',
          allowedTypes: [
            'audio/mpeg',
            'audio/mp4',
            'audio/wav',
            'audio/webm',
            'audio/ogg',
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'text/plain',
          ],
        });
        return;
      }

      // Validate file size if provided
      if (fileSize && !this.s3Service.isValidFileSize(fileSize)) {
        res.status(400).json({
          error: 'Invalid file size',
          message: 'File size must be between 1 byte and 100MB',
          maxSize: '100MB',
        });
        return;
      }

      // Generate pre-signed URL
      const presignedUrl = await this.s3Service.getUploadPresignedUrl(fileName, fileType);

      // Extract the file key from the URL for tracking
      const url = new URL(presignedUrl);
      const fileKey = url.pathname.substring(1); // Remove leading '/'

      res.status(200).json({
        success: true,
        data: {
          uploadUrl: presignedUrl,
          fileKey,
          expiresIn: 900, // 15 minutes
          instructions: {
            method: 'PUT',
            headers: {
              'Content-Type': fileType,
            },
            note: 'Upload the file directly to this URL using a PUT request with the specified Content-Type header',
          },
        },
      });
    } catch (error) {
      Logger.error('Error generating upload URL:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate upload URL',
      });
    }
  };

  /**
   * Generate pre-signed URL for evidence download
   * GET /api/v1/evidence/download-url/:fileKey
   */
  getDownloadUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileKey } = req.params;

      if (!fileKey) {
        res.status(400).json({
          error: 'File key is required',
        });
        return;
      }

      // Decode the file key (it might be URL encoded)
      const decodedFileKey = decodeURIComponent(fileKey);

      // Basic validation to ensure the file key follows our expected pattern
      if (!decodedFileKey.startsWith('evidence/')) {
        res.status(400).json({
          error: 'Invalid file key',
          message: 'File key must be for evidence files',
        });
        return;
      }

      // Generate pre-signed URL for download
      const presignedUrl = await this.s3Service.getDownloadPresignedUrl(decodedFileKey);

      res.status(200).json({
        success: true,
        data: {
          downloadUrl: presignedUrl,
          fileKey: decodedFileKey,
          expiresIn: 3600, // 1 hour
        },
      });
    } catch (error) {
      Logger.error('Error generating download URL:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate download URL',
      });
    }
  };

  /**
   * List evidence files (placeholder for future implementation)
   * GET /api/v1/evidence
   */
  listEvidence = async (_req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Implement evidence listing from database
      // This would typically query a database table that tracks uploaded evidence

      res.status(200).json({
        success: true,
        data: {
          evidence: [],
          message: 'Evidence listing not yet implemented',
        },
      });
    } catch (error) {
      Logger.error('Error listing evidence:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list evidence',
      });
    }
  };
}
