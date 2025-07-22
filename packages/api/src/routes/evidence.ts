import { Router } from 'express';
import { EvidenceController } from '../controllers/evidenceController';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();
const evidenceController = new EvidenceController();

/**
 * @swagger
 * /api/v1/evidence/upload-url:
 *   post:
 *     summary: Generate pre-signed URL for evidence upload
 *     description: Creates a pre-signed URL that allows direct upload of evidence files to S3
 *     tags: [Evidence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file to upload
 *                 example: "recording_001.mp3"
 *               fileType:
 *                 type: string
 *                 description: MIME type of the file
 *                 example: "audio/mpeg"
 *               fileSize:
 *                 type: number
 *                 description: Size of the file in bytes (optional)
 *                 example: 1048576
 *     responses:
 *       200:
 *         description: Pre-signed URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadUrl:
 *                       type: string
 *                       description: Pre-signed URL for uploading
 *                     fileKey:
 *                       type: string
 *                       description: S3 key for the uploaded file
 *                     expiresIn:
 *                       type: number
 *                       description: URL expiration time in seconds
 *                     instructions:
 *                       type: object
 *                       description: Upload instructions
 *       400:
 *         description: Bad request - invalid file type or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/upload-url', authenticate, evidenceController.getUploadUrl);

/**
 * @swagger
 * /api/v1/evidence/download-url/{fileKey}:
 *   get:
 *     summary: Generate pre-signed URL for evidence download
 *     description: Creates a pre-signed URL that allows direct download of evidence files from S3
 *     tags: [Evidence]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 key of the file to download
 *         example: "evidence/2025/01/1642684800000_abc123.mp3"
 *     responses:
 *       200:
 *         description: Pre-signed URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       description: Pre-signed URL for downloading
 *                     fileKey:
 *                       type: string
 *                       description: S3 key of the file
 *                     expiresIn:
 *                       type: number
 *                       description: URL expiration time in seconds
 *       400:
 *         description: Bad request - invalid file key
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/download-url/:fileKey', authenticate, evidenceController.getDownloadUrl);

/**
 * @swagger
 * /api/v1/evidence:
 *   get:
 *     summary: List evidence files
 *     description: Retrieve a list of evidence files (placeholder implementation)
 *     tags: [Evidence]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Evidence list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     evidence:
 *                       type: array
 *                       items:
 *                         type: object
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, evidenceController.listEvidence);

export default router;
