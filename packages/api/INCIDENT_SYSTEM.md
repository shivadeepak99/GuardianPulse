# Incident Creation & Alerting System

## Overview
This document describes the enhanced incident creation and alerting system for GuardianPulse. The system automatically detects anomalies (like falls) from sensor data and creates persistent incident records while alerting guardians in real-time.

## Features Implemented

### 1. AnomalyDetectionService (`src/services/anomaly.service.ts`)
A comprehensive service that handles:
- **Sensor Data Processing**: Analyzes accelerometer and gyroscope data
- **Fall Detection Algorithm**: Detects falls using acceleration thresholds
- **Incident Creation**: Creates persistent database records when anomalies are detected
- **Guardian Alerting**: Automatically sends alerts to guardians when incidents occur
- **Manual SOS Support**: Handles manual emergency triggers

#### Key Methods:
- `processSensorData(sensorData: SensorData): Promise<boolean>`
- `createManualSOSIncident(wardId: string, location?: Location, message?: string)`
- `detectFall(sensorData: SensorData): FallDetectionResult`
- `createIncident(wardId: string, type: IncidentType, location?: Location, metadata?: any)`

### 2. Enhanced Incident Routes (`src/routes/incidents.ts`)
Updated incident management endpoints:

#### New Endpoints:
- **POST `/api/v1/incidents/process-sensor-data`**: Process real-time sensor data for anomaly detection
- **POST `/api/v1/incidents/manual-sos`**: Trigger manual SOS alerts (enhanced with AnomalyDetectionService)

#### Existing Endpoints:
- **POST `/api/v1/incidents`**: Create general incidents
- **POST `/api/v1/incidents/thrown-away`**: Report device impact/thrown away
- **POST `/api/v1/incidents/fake-shutdown`**: Report fake device shutdown

### 3. Enhanced Validation (`src/utils/validation.ts`)
Added new validation schemas:
- `processSensorDataSchema`: Validates accelerometer, gyroscope, and location data
- `ProcessSensorDataInput`: TypeScript type for sensor data processing

## API Endpoints

### Process Sensor Data
```
POST /api/v1/incidents/process-sensor-data
Authorization: Bearer <token>
Content-Type: application/json

{
  "accelerometer": {
    "x": 0.5,
    "y": 9.8,
    "z": 0.2
  },
  "gyroscope": {
    "x": 0.1,
    "y": 0.0,
    "z": 0.05
  },
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 5
  },
  "timestamp": "2025-07-23T10:30:00.000Z"
}
```

**Response (No Anomaly - 200):**
```json
{
  "success": true,
  "data": {
    "anomalyDetected": false,
    "incidentCreated": false,
    "message": "Sensor data processed successfully - no anomalies detected"
  }
}
```

**Response (Fall Detected - 201):**
```json
{
  "success": true,
  "data": {
    "anomalyDetected": true,
    "incidentCreated": true,
    "message": "Fall detected and incident created successfully"
  }
}
```

### Manual SOS
```
POST /api/v1/incidents/manual-sos
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10
  },
  "message": "Emergency assistance needed immediately"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "incidentId": "cm123abc...",
    "message": "SOS alert triggered successfully",
    "timestamp": "2025-07-23T10:30:00.000Z"
  }
}
```

## Fall Detection Algorithm

### Thresholds:
- **Fall Threshold**: 20 m/s² (sudden acceleration change)
- **Confidence Threshold**: 0.7 (70% minimum confidence)

### Detection Logic:
1. Calculate total acceleration magnitude: `√(x² + y² + z²)`
2. Check if magnitude exceeds fall threshold
3. Validate confidence level
4. Create incident if both conditions are met

### Algorithm Steps:
```typescript
const totalAcceleration = Math.sqrt(
  Math.pow(accelerometer.x, 2) + 
  Math.pow(accelerometer.y, 2) + 
  Math.pow(accelerometer.z, 2)
);

const isFallDetected = totalAcceleration > FALL_THRESHOLD;
const confidence = Math.min(totalAcceleration / (FALL_THRESHOLD * 2), 1.0);

if (isFallDetected && confidence >= FALL_CONFIDENCE_THRESHOLD) {
  // Create incident and send alerts
}
```

## Database Schema

### Incident Model
```prisma
model Incident {
  id          String      @id @default(cuid())
  type        IncidentType
  wardId      String
  latitude    Float?
  longitude   Float?
  description String?
  status      IncidentStatus @default(ACTIVE)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  ward        User        @relation(fields: [wardId], references: [id])
}

enum IncidentType {
  SOS_TRIGGERED
  SOS_MANUAL
  FALL_DETECTED
  THROWN_AWAY
  FAKE_SHUTDOWN
}

enum IncidentStatus {
  ACTIVE
  RESOLVED
  DISMISSED
}
```

## Alert Integration

### Alert Types:
- **SOS_TRIGGERED**: Emergency-level manual SOS
- **FALL_DETECTED**: High-priority fall detection
- **THROWN_AWAY**: Emergency-level device impact
- **FAKE_SHUTDOWN**: Emergency-level fake shutdown

### Alert Priorities:
- **EMERGENCY**: SOS_TRIGGERED, THROWN_AWAY, FAKE_SHUTDOWN
- **HIGH**: FALL_DETECTED
- **MEDIUM**: General system alerts

### Guardian Notification Flow:
1. Incident detected/created
2. Fetch all guardians for the ward
3. Send real-time alerts via WebSocket
4. Send push notifications (if configured)
5. Log alert delivery status

## Testing

### Test File: `test-incident-endpoints.html`
Interactive HTML test interface for:
- Authentication testing
- Manual SOS triggering
- Sensor data processing (normal and fall simulation)
- Real-time result display

### Testing Scenarios:
1. **Normal Sensor Data**: Low acceleration values (< 20 m/s²)
2. **Fall Simulation**: High acceleration values (> 20 m/s²)
3. **Manual SOS**: Emergency button press
4. **Location Handling**: With and without GPS coordinates

## Integration Points

### Mobile App Integration:
```typescript
// Real-time sensor data streaming
const sensorData = {
  accelerometer: { x: accelX, y: accelY, z: accelZ },
  gyroscope: { x: gyroX, y: gyroY, z: gyroZ },
  location: { latitude: lat, longitude: lng, accuracy: acc },
  timestamp: new Date().toISOString()
};

// Send to API
await fetch('/api/v1/incidents/process-sensor-data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(sensorData)
});
```

### Guardian Dashboard Integration:
- Real-time incident notifications
- Incident history and status tracking
- Location-based incident mapping
- Response time analytics

## Security Considerations

### Authentication:
- All endpoints require valid JWT token
- User context extracted from token
- Ward-specific incident creation

### Data Validation:
- Strict input validation using Zod schemas
- Sanitized location data
- Rate limiting recommended for sensor data endpoints

### Privacy:
- Location data encryption at rest
- GDPR-compliant data retention
- Configurable data sharing preferences

## Performance Optimizations

### Database:
- Indexed queries on wardId and createdAt
- Batch alert processing
- Connection pooling

### Real-time Features:
- WebSocket connections for instant alerts
- Background job processing for heavy operations
- Caching for guardian relationships

## Monitoring & Logging

### Key Metrics:
- Fall detection accuracy
- Alert delivery success rate
- Response times
- Incident resolution times

### Logging Levels:
- **INFO**: Normal sensor data processing
- **WARN**: Anomalies detected, SOS triggered
- **ERROR**: Failed alert delivery, system errors

## Future Enhancements

### Planned Features:
1. **Machine Learning**: Advanced fall detection using ML models
2. **Geofencing**: Location-based safety zones
3. **Health Integration**: Heart rate and other vitals monitoring
4. **Predictive Analytics**: Pattern recognition for early warning
5. **Multi-device Support**: Wearables and IoT sensors
6. **Emergency Services**: Direct 911/emergency service integration

### Scalability:
- Microservice architecture
- Event-driven processing
- Horizontal scaling for sensor data processing
- Edge computing for real-time analysis
