# Thrown-Away Defense Module Documentation

## Overview

The **Thrown-Away Defense Module** is a critical safety feature that detects when a mobile device has been thrown, impacted, or potentially destroyed. This module serves as a last-resort protection mechanism, triggering immediate alerts to guardians when the device itself may be compromised.

## 🚨 Critical Use Cases

1. **Device Thrown Away**: Attacker throws the phone to prevent tracking
2. **Physical Impact**: Device damaged in an accident or altercation
3. **Destruction Attempt**: Deliberate attempts to destroy the device
4. **Last Signal Scenario**: Device may be about to lose power/connectivity

## Architecture

### Mobile App Detection (React Native)

**File**: `packages/mobile/hooks/useImpactDetector.ts`

The mobile app uses sophisticated sensor analysis to detect the characteristic pattern of a thrown device:

#### Three-Phase Detection Algorithm

1. **Throw Phase** 🚀
   - High acceleration spike (>20 m/s²)
   - Sudden departure from gravity baseline
   - Short duration (200-500ms)

2. **Tumble Phase** 🌪️
   - Chaotic rotational motion
   - High gyroscope readings with variability
   - Indicates free-fall/tumbling motion

3. **Impact Phase** 💥
   - Sharp acceleration spike (>40 m/s²)
   - Sudden deceleration
   - Impact signature

#### Confidence Calculation

The algorithm calculates confidence based on:
- Pattern timing accuracy
- Signal strength
- Phase completeness
- Duration between phases

**Threshold**: 60%+ confidence triggers alert

### Backend Processing (Node.js API)

**Files**: 
- `packages/api/src/controllers/thrownAwayController.ts`
- `packages/api/src/routes/incidents.ts`

#### ThrownAwayController Architecture

The controller implements a **three-phase async processing** model optimized for speed and reliability:

```typescript
// Phase 1: Immediate Response (< 100ms)
res.status(200).json({
  success: true,
  incidentId,
  alertsInitiated: true
});

// Phase 2: Critical Alerts (async)
setImmediate(async () => {
  await alertService.sendAlertToAllGuardians(...)
});

// Phase 3: Evidence Processing (async)
setImmediate(async () => {
  await handleEvidenceUpload(...)
});
```

#### Why Speed Matters

- **Last Signal**: May be final communication before device destruction
- **Time Critical**: Every millisecond counts in emergency situations
- **Network Reliability**: Quick response before potential connectivity loss

### Alert System Integration

**File**: `packages/api/src/services/alert.service.ts`

#### Critical SMS Message Format

```
🚨 CRITICAL GuardianPulse Alert 🚨

DEVICE THROWN/DESTROYED: [Ward Name]

Last location: [Latitude], [Longitude]
Detected: [Timestamp]
Confidence: [Confidence]%
Device: [Device Model]

⚠️ IMMEDIATE ATTENTION REQUIRED ⚠️

This may be the last signal from the device. 
Contact ward immediately and consider emergency 
services if unable to reach.

View details: [Dashboard URL]
```

#### Multi-Channel Alerts

1. **SMS** (Primary): Immediate text messages
2. **Push Notifications**: If app installed on guardian devices
3. **Email**: Secondary notification method
4. **Dashboard**: Real-time incident display

## API Endpoints

### POST /api/v1/incidents/thrown-away

**Primary endpoint for reporting thrown-away incidents**

#### Request Body

```typescript
interface ThrownAwayIncidentData {
  timestamp: number;                    // When incident occurred
  accelerometerData: SensorReading[];   // Raw accelerometer data
  gyroscopeData: SensorReading[];       // Raw gyroscope data
  pattern: {                            // Detection results
    throwPhase: boolean;
    tumblePhase: boolean;
    impactPhase: boolean;
    confidence: number;                 // 0-1 scale
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: {                          // Last known location
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  deviceInfo?: {                        // Device context
    model: string;
    os: string;
    appVersion: string;
  };
  audioData?: {                         // Optional audio evidence
    base64Audio: string;
    duration: number;
    format: string;
  };
  sensorBuffer?: {                      // Extended sensor history
    accelerometer: any[];
    gyroscope: any[];
    bufferDuration: number;
  };
}
```

#### Response

```typescript
{
  success: boolean;
  incidentId: string;
  alertsInitiated: boolean;
  timestamp: number;
  processingTime: number;               // Response time in ms
}
```

### POST /api/v1/incidents/thrown-away/test

**Test endpoint for verifying alert system functionality**

Sends test alerts with `[TEST]` prefix to all guardians.

## Configuration

### Sensitivity Levels

**File**: `packages/mobile/hooks/useImpactDetector.ts`

```typescript
const IMPACT_THRESHOLDS = {
  low: {
    throwAcceleration: 15,      // m/s²
    tumbleRotation: 5,          // rad/s
    impactForce: 30,            // m/s²
    patternDuration: 3000,      // ms
  },
  medium: {
    throwAcceleration: 20,
    tumbleRotation: 7,
    impactForce: 40,
    patternDuration: 2500,
  },
  high: {
    throwAcceleration: 25,
    tumbleRotation: 10,
    impactForce: 50,
    patternDuration: 2000,
  },
};
```

### Alert Configuration

**File**: `packages/api/src/config/index.ts`

```typescript
{
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  app: {
    dashboardUrl: process.env.DASHBOARD_URL,
  }
}
```

## Evidence Storage

### S3 Storage Structure

```
thrown-away-evidence/
├── [userId]/
│   ├── [timestamp]/
│   │   ├── audio.wav           # Audio recording
│   │   └── sensor-data.json    # Sensor data
```

### Evidence Metadata

```typescript
{
  'incident-type': 'thrown-away',
  'user-id': userId,
  'incident-id': incidentId,
  'upload-timestamp': timestamp,
  'duration': audioDuration,      // For audio files
  'buffer-duration': bufferTime,  // For sensor files
}
```

## Database Schema

### Incidents Table

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,      -- 'THROWN_AWAY'
  ward_id UUID NOT NULL,
  severity VARCHAR(20),           -- 'CRITICAL'
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,                 -- Pattern data, confidence, etc.
  evidence_urls TEXT[]            -- S3 storage URLs
);
```

### Evidence Table

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id),
  type VARCHAR(50),               -- 'AUDIO', 'SENSOR_LOG'
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  storage_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Mobile App Integration

### Hook Usage

```typescript
import useImpactDetector from '../hooks/useImpactDetector';
import { api } from '../services/api';

function GuardianApp() {
  const { isMonitoring, startMonitoring, stopMonitoring } = useImpactDetector(
    'medium',  // sensitivity
    true,      // live mode
    false,     // debug mode
    async (impactEvent) => {
      // Handle impact detection
      try {
        await api.post('/incidents/thrown-away', impactEvent);
        console.log('🚨 Thrown-away incident reported');
      } catch (error) {
        console.error('Failed to report incident:', error);
        // Could store locally for retry
      }
    }
  );

  // Component implementation...
}
```

### Permission Requirements

```typescript
// Required permissions in app.json
{
  "expo": {
    "permissions": [
      "VIBRATE",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ],
    "ios": {
      "infoPlist": {
        "NSMotionUsageDescription": "This app uses motion sensors to detect if the device has been thrown or impacted for safety purposes.",
        "NSLocationWhenInUseUsageDescription": "Location is used to provide context during emergency situations."
      }
    },
    "android": {
      "permissions": [
        "android.permission.VIBRATE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

## Testing

### Integration Test

**File**: `packages/api/thrown-away-integration-test.ts`

The integration test simulates a complete thrown-away scenario:

1. Mock sensor data representing throw → tumble → impact
2. High confidence detection (87%)
3. Critical severity classification
4. Audio evidence simulation
5. Location data inclusion

### Running Tests

```bash
# Backend API tests
cd packages/api
npm test

# Mobile app tests
cd packages/mobile
npm test

# Integration test (requires running API)
cd packages/api
npm run dev  # Start API server
node thrown-away-integration-test.ts
```

## Performance Considerations

### Response Time Requirements

- **Target**: < 100ms response time
- **Critical**: Must respond before potential device destruction
- **Optimization**: Async processing for non-critical operations

### Battery Impact

- **Sensor Polling**: 50Hz (20ms intervals)
- **Smart Activation**: Only during live mode
- **Optimization**: Efficient buffering and processing

### Network Reliability

- **Timeout**: 5-second request timeout
- **Retry Logic**: Store and retry failed requests
- **Offline Handling**: Local storage for critical incidents

## Security Considerations

### Data Protection

- **Encryption**: All evidence encrypted in transit and at rest
- **Access Control**: JWT-based authentication
- **Audit Trail**: Complete logging of all incidents

### Privacy

- **Minimal Data**: Only necessary sensor data collected
- **Retention**: Evidence automatically purged after investigation period
- **Consent**: Clear user consent for emergency monitoring

## Monitoring and Alerting

### System Health Metrics

- Response time monitoring
- Alert delivery success rates
- Evidence upload completion
- False positive rates

### Dashboard Integration

- Real-time incident display
- Guardian notification status
- Evidence preview and analysis
- Pattern confidence visualization

## Troubleshooting

### Common Issues

1. **High False Positives**
   - Adjust sensitivity settings
   - Review threshold configuration
   - Analyze pattern accuracy

2. **Slow Response Times**
   - Check network connectivity
   - Optimize async processing
   - Monitor server resources

3. **Failed Alert Delivery**
   - Verify Twilio configuration
   - Check guardian phone numbers
   - Review SMS delivery logs

### Debug Mode

Enable debug mode in the mobile hook to see detailed pattern detection:

```typescript
const { } = useImpactDetector('medium', true, true, onImpact);
```

## Deployment

### Environment Variables

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=guardian-pulse-evidence
AWS_REGION=us-east-1

# Application Configuration
DASHBOARD_URL=https://app.guardianpulse.com
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Production Checklist

- [ ] Twilio SMS delivery configured and tested
- [ ] S3 bucket permissions configured
- [ ] Database migrations applied
- [ ] JWT authentication working
- [ ] SSL certificates installed
- [ ] Monitoring and logging configured
- [ ] Performance testing completed
- [ ] Security audit completed

## Conclusion

The Thrown-Away Defense Module provides critical protection in scenarios where the device itself becomes compromised. By combining sophisticated mobile sensor analysis with rapid backend processing and multi-channel alerting, this module ensures that help can be summoned even when the device is about to be destroyed.

The system is designed with reliability, speed, and accuracy as top priorities, making it a vital component of the GuardianPulse safety ecosystem.
