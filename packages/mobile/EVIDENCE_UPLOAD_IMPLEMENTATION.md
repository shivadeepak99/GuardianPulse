# Evidence Upload & Association - Implementation Guide

## Overview

This feature completes the evidence-handling loop by enabling the mobile app to automatically upload buffered audio data to S3 and associate it with incidents when they are triggered.

## Architecture

### Mobile App (React Native)

- **Audio Buffering**: Maintains a 30-second circular buffer of audio chunks
- **Automatic Upload**: Triggers evidence upload when incidents are detected
- **S3 Integration**: Direct upload to S3 using pre-signed URLs
- **Backend Association**: Links uploaded evidence to specific incidents

### Backend API

- **Pre-signed URLs**: Secure, temporary upload URLs for S3
- **Evidence Association**: Database linking between incidents and evidence files
- **Authentication**: Secure endpoints with JWT token validation

## Implementation Details

### 1. Mobile Audio Buffering (`useAudio.ts`)

#### Circular Buffer Management

```typescript
interface AudioChunk {
  data: string; // base64 encoded audio data
  timestamp: number;
  uri: string; // local file URI
}

// 30-second circular buffer
const audioBufferRef = useRef<AudioChunk[]>([]);
const BUFFER_SIZE = 30;
```

#### Buffer Operations

- **Add Chunk**: New audio chunks automatically added to buffer
- **Overflow Handling**: Oldest chunks removed when buffer exceeds 30 seconds
- **Combination**: All chunks combined into single audio file for upload

#### Key Features

- ✅ **Continuous Recording**: Audio constantly buffered during live mode
- ✅ **Memory Management**: Circular buffer prevents memory overflow
- ✅ **Quality Control**: Consistent audio format (MP4/M4A, 16kHz, mono)
- ✅ **Authentication**: Secure uploads with JWT tokens

### 2. Evidence Upload Process

#### Step 1: Get Pre-signed Upload URL

```http
POST /api/v1/evidence/upload-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "emergency-audio-guardianId-timestamp.m4a",
  "fileType": "audio/mp4",
  "fileSize": 1234567
}
```

#### Step 2: Upload to S3

```http
PUT <presigned-url>
Content-Type: audio/mp4

<audio-blob-data>
```

#### Step 3: Associate with Incident

```http
POST /api/v1/incidents/{incidentId}/associate-evidence
Authorization: Bearer <token>
Content-Type: application/json

{
  "storageUrl": "evidence/2025/07/emergency-audio-12345-timestamp.m4a",
  "type": "AUDIO",
  "description": "Emergency audio recording - 30 seconds of buffered audio"
}
```

### 3. Backend Implementation

#### Evidence Association Endpoint

- **Route**: `POST /api/v1/incidents/:incidentId/associate-evidence`
- **Authentication**: Required (JWT token)
- **Validation**: Incident ownership, evidence type validation
- **Database**: Creates Evidence record linked to Incident

#### Database Schema

```sql
-- Evidence table
CREATE TABLE evidence (
  id VARCHAR PRIMARY KEY,
  incident_id VARCHAR REFERENCES incidents(id),
  type ENUM('AUDIO', 'VIDEO', 'IMAGE', 'DOCUMENT'),
  storage_url VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- Stores description, uploader info, etc.
);
```

#### Security Features

- **Ownership Verification**: Users can only associate evidence with their own incidents
- **File Type Validation**: Only allowed evidence types accepted
- **Size Limits**: Audio files limited to reasonable sizes
- **URL Validation**: S3 keys must follow expected patterns

## Integration Examples

### 1. Automatic Impact Detection Upload

```typescript
const handleImpactDetected = async (impactEvent: ImpactEvent) => {
  // 1. Create incident
  const incident = await createIncident({
    type: "THROWN_AWAY",
    location: currentLocation,
    description: `Impact detected - severity: ${impactEvent.severity}`,
  });

  // 2. Upload buffered audio
  const success = await uploadBufferedAudio(incident.id);

  if (success) {
    console.log("Evidence uploaded successfully");
  }
};
```

### 2. Manual SOS with Evidence

```typescript
const handleManualSOS = async () => {
  // 1. Create SOS incident
  const incident = await createIncident({
    type: "MANUAL_SOS",
    location: currentLocation,
    description: "Manual SOS triggered by user",
  });

  // 2. Upload last 30 seconds of audio
  await uploadBufferedAudio(incident.id);

  // 3. Notify guardians
  await notifyGuardians(incident.id);
};
```

### 3. Fake Shutdown Integration

```typescript
const handleFakeShutdown = async () => {
  // 1. Create fake shutdown incident
  const incident = await createIncident({
    type: "FAKE_SHUTDOWN",
    location: currentLocation,
    description: "Fake shutdown activated - potential coercion",
  });

  // 2. Upload evidence before showing fake UI
  await uploadBufferedAudio(incident.id);

  // 3. Navigate to fake shutdown screen
  navigation.navigate("FakeShutdown");
};
```

## Usage in Components

### Hook Integration

```typescript
const { uploadBufferedAudio, getBufferSize, clearBuffer } = useAudio({
  serverUrl: "http://localhost:3001",
  guardianId: user?.id || "",
  enabled: isLiveMode,
});

// Usage
const incidentId = "incident-123";
const success = await uploadBufferedAudio(incidentId);
```

### Buffer Management

```typescript
// Check buffer size
const bufferSeconds = getBufferSize(); // Returns number of seconds buffered

// Clear buffer after upload
clearBuffer(); // Removes all buffered audio
```

## File Formats & Specifications

### Audio Configuration

- **Format**: MP4/M4A container with AAC audio
- **Sample Rate**: 16kHz (optimized for voice)
- **Channels**: Mono (single channel)
- **Bit Rate**: 32kbps (good quality for voice)
- **Chunk Size**: 1-second chunks
- **Buffer Duration**: 30 seconds maximum

### File Naming Convention

```
emergency-audio-{guardianId}-{timestamp}.m4a

Example:
emergency-audio-user123-2025-07-23T15-30-00-000Z.m4a
```

### S3 Storage Structure

```
evidence/
├── 2025/
│   ├── 07/
│   │   ├── emergency-audio-user123-2025-07-23T15-30-00-000Z.m4a
│   │   ├── manual-sos-audio-user456-2025-07-23T16-45-12-000Z.m4a
│   │   └── ...
│   └── ...
└── ...
```

## Error Handling

### Mobile App Errors

- **No Buffer Data**: Graceful handling when no audio is buffered
- **Authentication Failures**: Clear error messages for token issues
- **Network Errors**: Retry logic for failed uploads
- **S3 Upload Failures**: Detailed error reporting

### Backend Errors

- **Invalid Incident**: 404 when incident not found or unauthorized
- **Invalid Evidence Type**: 400 for unsupported file types
- **Database Errors**: Proper error logging and generic error responses
- **S3 Service Errors**: Fallback handling for AWS service issues

## Testing

### Unit Tests

- ✅ Buffer management (add, overflow, clear)
- ✅ Audio chunk combination
- ✅ Base64 encoding/decoding
- ✅ Error handling

### Integration Tests

- ✅ Complete upload flow (URL → S3 → Associate)
- ✅ Authentication with real tokens
- ✅ Database record creation
- ✅ S3 file verification

### Manual Testing

```bash
# Test evidence upload endpoint
curl -X POST "http://localhost:3001/api/v1/incidents/123/associate-evidence" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "storageUrl": "evidence/2025/07/test-audio.m4a",
    "type": "AUDIO",
    "description": "Test audio evidence"
  }'
```

## Performance Considerations

### Memory Management

- **Circular Buffer**: Prevents unlimited memory growth
- **Immediate Cleanup**: Clears buffer after successful uploads
- **Chunk Size**: 1-second chunks balance quality and memory usage

### Network Optimization

- **Direct S3 Upload**: Bypasses backend for large file transfers
- **Pre-signed URLs**: Secure uploads without exposing credentials
- **Error Retry**: Smart retry logic for failed network requests

### Storage Efficiency

- **Compressed Audio**: AAC compression reduces file sizes
- **S3 Lifecycle**: Automatic archival of old evidence files
- **Metadata Storage**: Efficient JSON metadata in database

## Security Features

### Data Protection

- **End-to-End**: Audio never passes through backend servers
- **Encrypted Storage**: S3 server-side encryption enabled
- **Access Control**: Pre-signed URLs with limited timeframes

### Authentication

- **JWT Tokens**: Secure API authentication
- **Ownership Validation**: Users can only access their own evidence
- **Rate Limiting**: Protection against abuse

### Privacy

- **Buffer Clearing**: Automatic cleanup of sensitive audio data
- **Secure URLs**: Time-limited S3 access
- **Audit Logging**: Complete evidence chain tracking

## Deployment Considerations

### Environment Configuration

```env
# S3 Configuration
AWS_BUCKET_NAME=guardian-pulse-evidence
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# API Configuration
API_BASE_URL=https://api.guardianpulse.com
EVIDENCE_UPLOAD_TIMEOUT=30000
```

### Monitoring

- **Upload Success Rates**: Track evidence upload completion
- **Error Rates**: Monitor failed uploads and associations
- **Storage Usage**: S3 bucket size and costs
- **Response Times**: API performance metrics

## Future Enhancements

### Planned Features

1. **Video Evidence**: Support for camera recordings
2. **Image Capture**: Photo evidence from incidents
3. **Compression Options**: Multiple quality levels for different scenarios
4. **Offline Support**: Local storage with sync when connectivity returns
5. **Evidence Preview**: Basic playback in mobile app

### Technical Improvements

1. **Progressive Upload**: Stream audio as it's recorded
2. **Compression Algorithm**: Better audio compression
3. **Metadata Enhancement**: GPS coordinates, device info, timestamps
4. **Batch Operations**: Multiple evidence files per incident

---

**Implementation Status**: ✅ Complete  
**Last Updated**: July 23, 2025  
**Version**: 1.0
