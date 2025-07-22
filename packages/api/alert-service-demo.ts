import { AlertService, AlertType, AlertPriority } from './src/services/alert.service';

/**
 * AlertService Demo
 * Demonstrates how to use the foundational alerting service
 */

async function demonstrateAlertService() {
  console.log('🚨 GuardianPulse Alert Service Demo\n');
  
  const alertService = new AlertService();
  
  // Example 1: Send SOS alert to a specific guardian
  console.log('📍 Example 1: SOS Alert to Specific Guardian');
  console.log('─'.repeat(50));
  
  const sosResult = await alertService.sendAlertToGuardian(
    'guardian-123-uuid',
    AlertType.SOS_TRIGGERED,
    {
      wardName: 'Sarah Johnson',
      wardId: 'ward-456-uuid',
      timestamp: new Date(),
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St, New York, NY'
      },
      message: 'URGENT: Sarah has triggered an SOS alert!',
      priority: AlertPriority.EMERGENCY,
      requiresResponse: true,
      metadata: {
        deviceId: 'device-789',
        batteryLevel: 45,
        signalStrength: 'strong'
      }
    }
  );
  
  console.log('Result:', sosResult);
  console.log('\n');
  
  // Example 2: Fall detection alert
  console.log('📍 Example 2: Fall Detection Alert');
  console.log('─'.repeat(50));
  
  const fallResult = await alertService.sendAlertToGuardian(
    'guardian-456-uuid',
    AlertType.FALL_DETECTED,
    {
      wardName: 'Robert Smith',
      wardId: 'ward-789-uuid',
      location: {
        latitude: 34.0522,
        longitude: -118.2437,
        address: 'Home - 456 Oak Ave, Los Angeles, CA'
      },
      priority: AlertPriority.CRITICAL,
      metadata: {
        confidence: 0.85,
        detectionMethod: 'accelerometer',
        impactForce: 'moderate'
      }
    }
  );
  
  console.log('Result:', fallResult);
  console.log('\n');
  
  // Example 3: Send alert to all guardians of a ward
  console.log('📍 Example 3: Battery Low Alert to All Guardians');
  console.log('─'.repeat(50));
  
  const batteryResults = await alertService.sendAlertToAllGuardians(
    'ward-123-uuid',
    AlertType.BATTERY_LOW,
    {
      priority: AlertPriority.LOW,
      metadata: {
        batteryLevel: 15,
        estimatedTimeRemaining: '2 hours'
      }
    }
  );
  
  console.log('Results:', batteryResults);
  console.log('\n');
  
  // Example 4: Geofence violation
  console.log('📍 Example 4: Geofence Violation Alert');
  console.log('─'.repeat(50));
  
  const geofenceResults = await alertService.sendAlertToAllGuardians(
    'ward-456-uuid',
    AlertType.GEOFENCE_VIOLATION,
    {
      wardName: 'Emma Wilson',
      location: {
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Times Square, New York, NY'
      },
      message: 'Emma has left the designated safe area',
      priority: AlertPriority.HIGH,
      metadata: {
        safeZoneName: 'Home and School Area',
        violationType: 'exit',
        timeOutside: '15 minutes'
      }
    }
  );
  
  console.log('Results:', geofenceResults);
  console.log('\n');
  
  // Example 5: System alert
  console.log('📍 Example 5: System Alert');
  console.log('─'.repeat(50));
  
  const systemResult = await alertService.sendAlertToGuardian(
    'guardian-789-uuid',
    AlertType.SYSTEM_ALERT,
    {
      wardName: 'Michael Davis',
      message: 'Device software update completed successfully',
      priority: AlertPriority.LOW,
      metadata: {
        updateVersion: '2.1.0',
        features: ['Enhanced fall detection', 'Improved battery life']
      }
    }
  );
  
  console.log('Result:', systemResult);
  console.log('\n');
  
  console.log('✅ Alert Service Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('• Console-based alert delivery (foundation for future channels)');
  console.log('• Multiple alert types with different priorities');
  console.log('• Single guardian vs. multiple guardian notifications');
  console.log('• Rich metadata support');
  console.log('• Location information handling');
  console.log('• Automatic dashboard link generation');
  console.log('• Comprehensive error handling and logging');
}

// Uncomment to run the demo
// demonstrateAlertService().catch(console.error);

export default demonstrateAlertService;
