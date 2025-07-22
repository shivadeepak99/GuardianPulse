# Foundational Alert Service

The AlertService provides a centralized, extensible system for sending alerts to Guardians in the GuardianPulse application. This foundational implementation uses console logging but is architected to easily support real notification channels like Email, SMS, and Push notifications in the future.

## Overview

The AlertService is designed with the following principles:
- **Extensibility**: Easy to add new notification channels
- **Reliability**: Comprehensive error handling and logging
- **Flexibility**: Support for multiple alert types and priorities
- **Scalability**: Can notify individual guardians or groups
- **Auditability**: All alerts are logged for tracking and compliance

## Core Components

### Alert Types

The system supports multiple alert types through the `AlertType` enum:

```typescript
enum AlertType {
  SOS_TRIGGERED = 'SOS_TRIGGERED',
  FALL_DETECTED = 'FALL_DETECTED', 
  PANIC_BUTTON = 'PANIC_BUTTON',
  LOCATION_LOST = 'LOCATION_LOST',
  BATTERY_LOW = 'BATTERY_LOW',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  GEOFENCE_VIOLATION = 'GEOFENCE_VIOLATION',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}
```

### Alert Priorities

Alerts are categorized by priority level:

```typescript
enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}
```

### Alert Data Structure

Rich context data can be attached to alerts:

```typescript
interface AlertData {
  wardName?: string;
  wardId?: string;
  timestamp?: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  dashboardLink?: string;
  message?: string;
  metadata?: Record<string, any>;
  priority?: AlertPriority;
  requiresResponse?: boolean;
}
```

## Usage Examples

### Basic Usage

```typescript
import { AlertService, AlertType, AlertPriority } from './services/alert.service';

const alertService = new AlertService();

// Send alert to specific guardian
const result = await alertService.sendAlertToGuardian(
  'guardian-uuid-123',
  AlertType.SOS_TRIGGERED,
  {
    wardName: 'Sarah Johnson',
    wardId: 'ward-uuid-456',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Main St, New York, NY'
    },
    priority: AlertPriority.EMERGENCY,
    message: 'Sarah has triggered an SOS alert!'
  }
);
```

### Send to All Guardians

```typescript
// Send alert to all guardians of a ward
const results = await alertService.sendAlertToAllGuardians(
  'ward-uuid-789',
  AlertType.FALL_DETECTED,
  {
    priority: AlertPriority.CRITICAL,
    location: {
      latitude: 34.0522,
      longitude: -118.2437
    },
    metadata: {
      confidence: 0.85,
      detectionMethod: 'accelerometer'
    }
  }
);
```

## Current Implementation

### Console Logging

The current implementation outputs formatted alerts to the console with different log levels based on priority:

- **EMERGENCY/CRITICAL**: `Logger.error()` (red output)
- **HIGH**: `Logger.warn()` (yellow output)  
- **MEDIUM/LOW**: `Logger.info()` (normal output)

### Alert Format

Console alerts follow this format:
```
🚨 ALERT for Guardian [guardian-id]: Type: [ALERT_TYPE] Priority: [PRIORITY] - Ward: [Ward Name] - [Message] - Location: [lat, lng] - Dashboard: [link] - Time: [timestamp]
```

Example output:
```
🚨 ALERT for Guardian [guardian-123-uuid]: Type: [SOS_TRIGGERED] Priority: [EMERGENCY] - Ward: [Sarah Johnson] - URGENT: Sarah has triggered an SOS alert! - Location: 40.7128, -74.0060 - Dashboard: http://localhost:3000/dashboard/ward/ward-456-uuid - Time: 2025-01-20T10:30:00.000Z
```

## Architecture for Future Extensions

The service is designed to easily accommodate new notification channels:

### Planned Notification Channels

```typescript
// Future implementations
class AlertService {
  // Email notifications
  private async deliverViaEmail(guardian: GuardianInfo, alertType: AlertType, context: any): Promise<AlertDeliveryResult>
  
  // SMS notifications  
  private async deliverViaSMS(guardian: GuardianInfo, alertType: AlertType, context: any): Promise<AlertDeliveryResult>
  
  // Push notifications
  private async deliverViaPush(guardian: GuardianInfo, alertType: AlertType, context: any): Promise<AlertDeliveryResult>
}
```

### Channel Selection Logic

Future versions will support channel preferences:

```typescript
// Example future enhancement
const deliveryMethods = this.getPreferredChannels(guardian);
for (const method of deliveryMethods) {
  try {
    switch (method) {
      case 'email':
        return await this.deliverViaEmail(guardian, alertType, context);
      case 'sms':
        return await this.deliverViaSMS(guardian, alertType, context);
      case 'push':
        return await this.deliverViaPush(guardian, alertType, context);
      default:
        return await this.deliverViaConsole(guardian, alertType, context);
    }
  } catch (error) {
    // Fallback to next channel
    continue;
  }
}
```

## Database Integration

The service integrates with the Prisma database to:

1. **Fetch Guardian Information**: Retrieves guardian details for personalized alerts
2. **Resolve Ward Relationships**: Finds all guardians associated with a ward
3. **Enhance Alert Data**: Automatically populates missing ward information

### Database Queries

```typescript
// Get guardian info
const guardian = await this.db.user.findUnique({
  where: { id: guardianId },
  select: { id: true, email: true, firstName: true, lastName: true }
});

// Get all guardians for a ward
const guardianRelations = await this.db.guardianRelationship.findMany({
  where: { wardId, isActive: true },
  include: { guardian: { select: { id: true, email: true, firstName: true, lastName: true } } }
});
```

## Error Handling

The service implements comprehensive error handling:

### Individual Alert Failures
- Failed alerts return `AlertDeliveryResult` with error details
- Errors are logged but don't stop other deliveries
- Guardian ID is always tracked for failed alerts

### Batch Alert Failures  
- Uses `Promise.allSettled()` for concurrent delivery
- Individual failures don't affect other guardians
- Summary statistics are logged

### Database Failures
- Graceful fallback when guardian info unavailable
- Missing ward information is handled elegantly
- Connection errors are caught and logged

## Monitoring and Auditing

### Delivery Tracking
Each alert delivery returns a result object:

```typescript
interface AlertDeliveryResult {
  guardianId: string;
  success: boolean;
  method: string;
  timestamp: Date;
  error?: string;
}
```

### Audit Logging
All alerts are logged with structured data:

```javascript
Logger.info('Alert delivery recorded', {
  guardianId,
  alertType,
  wardId: data.wardId,
  priority: data.priority,
  success: result.success,
  method: result.method,
  timestamp: result.timestamp,
  error: result.error
});
```

## Integration Points

The AlertService can be integrated throughout the application:

### AI Anomaly Detection
```typescript
// When AI detects unusual patterns
if (anomalyDetected) {
  await alertService.sendAlertToAllGuardians(
    wardId,
    AlertType.UNUSUAL_ACTIVITY,
    { 
      priority: AlertPriority.HIGH,
      metadata: { confidence: 0.92, pattern: 'movement_anomaly' }
    }
  );
}
```

### Device Monitoring
```typescript
// When device goes offline
if (deviceOffline) {
  await alertService.sendAlertToAllGuardians(
    wardId,
    AlertType.DEVICE_OFFLINE,
    { 
      priority: AlertPriority.MEDIUM,
      metadata: { lastSeen: lastSeenTimestamp }
    }
  );
}
```

### Emergency Triggers
```typescript
// When SOS button is pressed
if (sosTriggered) {
  await alertService.sendAlertToAllGuardians(
    wardId,
    AlertType.SOS_TRIGGERED,
    { 
      priority: AlertPriority.EMERGENCY,
      location: currentLocation,
      requiresResponse: true
    }
  );
}
```

## Testing

The service includes a comprehensive demo file (`alert-service-demo.ts`) that demonstrates:

- Different alert types and priorities
- Single vs. multiple guardian notifications  
- Rich metadata usage
- Location information handling
- Error scenarios

### Running the Demo

```bash
# Build the project
pnpm run build

# Run the demo
npx tsx alert-service-demo.ts
```

## Future Roadmap

### Phase 1: Email Integration
- SMTP configuration
- HTML email templates
- Delivery confirmation tracking

### Phase 2: SMS Integration  
- Twilio/AWS SNS integration
- SMS templates
- Rate limiting and cost management

### Phase 3: Push Notifications
- Firebase Cloud Messaging
- Device token management
- Rich push notification content

### Phase 4: Advanced Features
- Alert escalation rules
- Delivery confirmation requirements
- Geographic proximity notifications
- AI-powered alert filtering

## Configuration

### Environment Variables

```env
# Web app URL for dashboard links
WEB_APP_URL=https://guardian.example.com

# Future email configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@guardian.com
SMTP_PASS=secure_password

# Future SMS configuration  
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Service Configuration

```typescript
// Future configuration options
const alertService = new AlertService({
  enabledChannels: ['console', 'email', 'sms'],
  fallbackChannel: 'console',
  retryAttempts: 3,
  batchSize: 100,
  rateLimits: {
    email: { perMinute: 60 },
    sms: { perMinute: 10 }
  }
});
```

The AlertService provides a solid foundation for the GuardianPulse alerting system, with clear paths for enhancement as the application grows and real-world notification requirements emerge.
