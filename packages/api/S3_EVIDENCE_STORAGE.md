# AWS S3 Evidence Storage Integration

This document describes the implementation of AWS S3 integration for secure evidence storage in the GuardianPulse API.

## Overview

The system uses AWS S3 pre-signed URLs to allow secure, direct file uploads from clients to S3 without exposing AWS credentials. This approach provides:

- **Security**: No AWS credentials are exposed to clients
- **Performance**: Direct uploads bypass our server, reducing bandwidth usage
- **Scalability**: S3 handles large file storage efficiently
- **Cost-effectiveness**: Reduced server processing overhead

## Architecture

```
Client → API (Get Pre-signed URL) → S3 (Direct Upload)
                ↓
         Store file metadata in database
```

## Features

### 1. Pre-signed Upload URLs
- **Endpoint**: `POST /api/v1/evidence/upload-url`
- **Purpose**: Generate temporary URLs for secure file uploads
- **Expiration**: 15 minutes (configurable)
- **File Types**: Audio, video, images, PDFs, text files
- **Size Limit**: 100MB per file

### 2. Pre-signed Download URLs
- **Endpoint**: `GET /api/v1/evidence/download-url/:fileKey`
- **Purpose**: Generate temporary URLs for secure file downloads
- **Expiration**: 1 hour (configurable)
- **Access Control**: Authenticated users only

### 3. File Organization
Files are organized in S3 with the following structure:
```
s3://bucket-name/evidence/YYYY/MM/timestamp_randomId.extension
```

Example: `evidence/2025/01/1642684800000_abc123def.mp3`

## API Reference

### Upload URL Generation

**Request:**
```http
POST /api/v1/evidence/upload-url
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "fileName": "recording_001.mp3",
  "fileType": "audio/mpeg",
  "fileSize": 1048576
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/evidence/2025/01/...?signature=...",
    "fileKey": "evidence/2025/01/1642684800000_abc123.mp3",
    "expiresIn": 900,
    "instructions": {
      "method": "PUT",
      "headers": {
        "Content-Type": "audio/mpeg"
      },
      "note": "Upload the file directly to this URL using a PUT request"
    }
  }
}
```

### File Upload Process

1. **Get Upload URL**: Call the upload URL endpoint
2. **Upload File**: Use the returned pre-signed URL to upload directly to S3
3. **Verify Upload**: Optionally verify the upload was successful

**Example Upload (JavaScript):**
```javascript
// Step 1: Get pre-signed URL
const response = await fetch('/api/v1/evidence/upload-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  })
});

const { data } = await response.json();

// Step 2: Upload to S3
await fetch(data.uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type
  },
  body: file
});
```

### Download URL Generation

**Request:**
```http
GET /api/v1/evidence/download-url/evidence%2F2025%2F01%2F1642684800000_abc123.mp3
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://s3.amazonaws.com/bucket/evidence/2025/01/...?signature=...",
    "fileKey": "evidence/2025/01/1642684800000_abc123.mp3",
    "expiresIn": 3600
  }
}
```

## Configuration

### Environment Variables

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=guardianpulse-evidence-bucket
```

### AWS IAM Policy

The AWS credentials should have the following IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::guardianpulse-evidence-bucket/evidence/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::guardianpulse-evidence-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": "evidence/*"
        }
      }
    }
  ]
}
```

### S3 Bucket Configuration

#### CORS Configuration
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

#### Lifecycle Policy (Optional)
```json
{
  "Rules": [
    {
      "ID": "EvidenceRetention",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "evidence/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## Security Considerations

### 1. File Type Validation
- Only whitelisted MIME types are allowed
- File extensions are validated
- Content-Type headers are enforced

### 2. File Size Limits
- Maximum file size: 100MB
- Configurable per file type if needed

### 3. Access Control
- All endpoints require JWT authentication
- Pre-signed URLs have short expiration times
- File keys follow predictable patterns for easy validation

### 4. File Naming
- Original filenames are sanitized
- Unique timestamps and random IDs prevent collisions
- Path traversal attacks are prevented

## Error Handling

### Common Error Responses

**Invalid File Type:**
```json
{
  "error": "Invalid file type",
  "message": "Only audio, video, image, and document files are allowed",
  "allowedTypes": ["audio/mpeg", "video/mp4", "image/jpeg", "..."]
}
```

**File Too Large:**
```json
{
  "error": "Invalid file size",
  "message": "File size must be between 1 byte and 100MB",
  "maxSize": "100MB"
}
```

**Authentication Error:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

## Testing

### Test Client
A comprehensive test client is available at `evidence-upload-test.html` which provides:
- Authentication testing
- File upload with progress tracking
- Download URL generation
- API response logging

### Manual Testing
1. Start the API server
2. Open `evidence-upload-test.html` in a browser
3. Login with valid credentials
4. Select a file and upload
5. Test download URL generation

## Future Enhancements

1. **Database Integration**: Store file metadata in PostgreSQL
2. **File Processing**: Add audio/video transcription
3. **Encryption**: Implement client-side encryption
4. **Virus Scanning**: Integrate with AWS VirusTotal
5. **Analytics**: Track upload/download statistics
6. **Backup**: Implement cross-region replication

## Monitoring

### CloudWatch Metrics
- S3 bucket requests
- Data transfer metrics
- Error rates

### Application Metrics
- Upload success/failure rates
- Pre-signed URL generation latency
- File type distribution
- Storage usage patterns

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure S3 bucket CORS is properly configured
2. **Upload Failures**: Check pre-signed URL expiration and file size limits
3. **Access Denied**: Verify IAM permissions and bucket policies
4. **Invalid Signatures**: Ensure system clock is synchronized

### Debug Mode
Set `LOG_LEVEL=debug` to enable detailed S3 operation logging.
