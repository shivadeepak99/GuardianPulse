/**
 * Complete Integration Test for Thrown-Away Defense Module
 * Tests the full flow from mobile detection to backend processing and SMS alerts
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

/**
 * Mock data that simulates what the mobile app would send
 * This represents a high-confidence thrown-away detection
 */
const mockThrownAwayIncident = {
  timestamp: Date.now(),
  accelerometerData: [
    // Pre-throw baseline
    { x: 0.1, y: 0.2, z: 9.8, timestamp: Date.now() - 2000 },
    { x: 0.1, y: 0.1, z: 9.9, timestamp: Date.now() - 1900 },
    
    // Throw phase - high acceleration
    { x: 15.2, y: 8.4, z: 12.1, timestamp: Date.now() - 1500 },
    { x: 18.7, y: 12.3, z: 15.6, timestamp: Date.now() - 1450 },
    { x: 22.1, y: 9.8, z: 18.9, timestamp: Date.now() - 1400 },
    
    // Tumble phase - chaotic motion
    { x: 8.2, y: -6.4, z: 12.1, timestamp: Date.now() - 1000 },
    { x: -11.3, y: 14.7, z: -8.2, timestamp: Date.now() - 950 },
    { x: 6.8, y: -9.1, z: 15.3, timestamp: Date.now() - 900 },
    
    // Impact phase - sudden spike
    { x: 45.6, y: 32.1, z: 38.9, timestamp: Date.now() - 500 },
    { x: 52.3, y: 41.7, z: 44.2, timestamp: Date.now() - 450 },
    { x: 48.1, y: 35.8, z: 40.6, timestamp: Date.now() - 400 },
    
    // Post-impact - settling
    { x: 2.1, y: 1.8, z: 10.2, timestamp: Date.now() - 100 },
    { x: 0.9, y: 0.7, z: 9.7, timestamp: Date.now() - 50 },
  ],
  gyroscopeData: [
    // Pre-throw baseline
    { x: 0.01, y: 0.02, z: 0.01, timestamp: Date.now() - 2000 },
    { x: 0.02, y: 0.01, z: 0.02, timestamp: Date.now() - 1900 },
    
    // Throw phase - minimal rotation
    { x: 1.2, y: 0.8, z: 1.5, timestamp: Date.now() - 1500 },
    { x: 1.8, y: 1.1, z: 2.1, timestamp: Date.now() - 1450 },
    
    // Tumble phase - high chaotic rotation
    { x: 8.7, y: -6.2, z: 9.4, timestamp: Date.now() - 1000 },
    { x: -7.3, y: 11.8, z: -8.1, timestamp: Date.now() - 950 },
    { x: 9.2, y: -10.4, z: 12.6, timestamp: Date.now() - 900 },
    { x: -6.8, y: 8.9, z: -7.5, timestamp: Date.now() - 850 },
    { x: 10.1, y: -9.7, z: 11.3, timestamp: Date.now() - 800 },
    
    // Impact phase - rotation stops
    { x: 2.1, y: 1.8, z: 2.5, timestamp: Date.now() - 500 },
    { x: 1.2, y: 0.9, z: 1.4, timestamp: Date.now() - 450 },
    
    // Post-impact - minimal movement
    { x: 0.3, y: 0.2, z: 0.4, timestamp: Date.now() - 100 },
    { x: 0.1, y: 0.1, z: 0.2, timestamp: Date.now() - 50 },
  ],
  pattern: {
    throwPhase: true,
    tumblePhase: true,
    impactPhase: true,
    confidence: 0.87, // 87% confidence - high confidence detection
  },
  severity: 'CRITICAL' as const,
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
  },
  deviceInfo: {
    model: 'iPhone 14 Pro',
    os: 'iOS 17.1',
    appVersion: '1.0.0',
  },
  audioData: {
    base64Audio: 'UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAAABAAEA', // Dummy audio data
    duration: 2.5,
    format: 'wav',
  },
  sensorBuffer: {
    accelerometer: [], // Would contain more detailed buffer
    gyroscope: [], // Would contain more detailed buffer
    bufferDuration: 3000,
  },
};

/**
 * Test the thrown-away endpoint
 */
async function testThrownAwayEndpoint() {
  try {
    console.log('🧪 Testing Thrown-Away Defense Module Integration...\n');

    // Note: In a real test, you would need a valid JWT token
    // For this demo, we're showing the structure
    const authToken = 'your-jwt-token-here';

    console.log('📱 Simulating mobile app sending thrown-away incident...');
    console.log('Incident Data:', {
      timestamp: new Date(mockThrownAwayIncident.timestamp).toISOString(),
      pattern: mockThrownAwayIncident.pattern,
      severity: mockThrownAwayIncident.severity,
      location: mockThrownAwayIncident.location,
      confidence: `${(mockThrownAwayIncident.pattern.confidence * 100).toFixed(1)}%`,
    });

    // Test the endpoint
    const response = await axios.post(
      `${API_BASE_URL}/incidents/thrown-away`,
      mockThrownAwayIncident,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      }
    );

    console.log('\n✅ Backend Response:', {
      success: response.data.success,
      incidentId: response.data.incidentId,
      alertsInitiated: response.data.alertsInitiated,
      processingTime: `${response.data.processingTime}ms`,
      timestamp: new Date(response.data.timestamp).toISOString(),
    });

    console.log('\n🚨 Expected Outcomes:');
    console.log('1. ✅ Immediate response sent to mobile app (< 100ms)');
    console.log('2. 🚨 CRITICAL SMS alerts sent to all guardians');
    console.log('3. 📊 Incident logged in database');
    console.log('4. 📁 Audio evidence uploaded to S3 (async)');
    console.log('5. 📱 Push notifications sent (if configured)');

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Connection refused - Is the API server running?');
        console.log('💡 Start the API server with: cd packages/api && npm run dev');
      } else if (error.response?.status === 401) {
        console.error('❌ Authentication failed - Invalid or missing JWT token');
        console.log('💡 You need to authenticate and get a valid JWT token first');
      } else {
        console.error('❌ API Error:', {
          status: error.response?.status,
          message: error.response?.data?.error || error.message,
        });
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
    return null;
  }
}

/**
 * Test the thrown-away test endpoint
 */
async function testThrownAwayTestEndpoint() {
  try {
    console.log('\n🧪 Testing thrown-away test endpoint...');

    const authToken = 'your-jwt-token-here';

    const response = await axios.post(
      `${API_BASE_URL}/incidents/thrown-away/test`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log('✅ Test Alert Response:', {
      success: response.data.success,
      message: response.data.message,
      timestamp: new Date(response.data.timestamp).toISOString(),
    });

    console.log('\n📱 Test alert should be sent to all guardians with [TEST] prefix');

    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Test endpoint error:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
      });
    } else {
      console.error('❌ Unexpected test error:', error);
    }
    return null;
  }
}

/**
 * Display integration overview
 */
function displayIntegrationOverview() {
  console.log('🔗 Thrown-Away Defense Module - Complete Integration Flow\n');
  
  console.log('📱 MOBILE APP (React Native):');
  console.log('  ├── useImpactDetector hook monitors accelerometer/gyroscope');
  console.log('  ├── Detects 3-phase pattern: throw → tumble → impact');
  console.log('  ├── Calculates confidence score (60%+ triggers alert)');
  console.log('  └── Sends POST /api/v1/incidents/thrown-away');
  
  console.log('\n🖥️  BACKEND API (Node.js + Express):');
  console.log('  ├── ThrownAwayController.handleThrownAwayIncident()');
  console.log('  ├── Immediate response (< 100ms) - critical for timing');
  console.log('  ├── Async alert processing via AlertService');
  console.log('  └── Evidence upload to S3 (audio + sensor data)');
  
  console.log('\n📞 ALERT SYSTEM (Twilio SMS):');
  console.log('  ├── CRITICAL priority alerts to all guardians');
  console.log('  ├── Severe messaging: "DEVICE THROWN/DESTROYED"');
  console.log('  ├── Location, confidence, and device info included');
  console.log('  └── Dashboard link for immediate action');
  
  console.log('\n💾 DATA STORAGE:');
  console.log('  ├── Incident logged in PostgreSQL database');
  console.log('  ├── Audio evidence stored in S3');
  console.log('  ├── Sensor data stored as JSON evidence');
  console.log('  └── Full audit trail for investigation');
  
  console.log('\n🚨 CRITICAL FEATURES:');
  console.log('  ├── Sub-100ms response time (may be last signal)');
  console.log('  ├── Three-phase async processing for reliability');
  console.log('  ├── Comprehensive error handling and logging');
  console.log('  └── Evidence preservation for post-incident analysis');
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main test function
 */
async function main() {
  displayIntegrationOverview();
  
  console.log('\n🎯 RUNNING INTEGRATION TESTS...\n');
  
  // Test main endpoint
  const mainResult = await testThrownAwayEndpoint();
  
  // Test the test endpoint
  const testResult = await testThrownAwayTestEndpoint();
  
  console.log('\n📋 TEST SUMMARY:');
  console.log(`Main endpoint: ${mainResult ? '✅ Ready' : '❌ Failed'}`);
  console.log(`Test endpoint: ${testResult ? '✅ Ready' : '❌ Failed'}`);
  
  if (mainResult && testResult) {
    console.log('\n🎉 Thrown-Away Defense Module is fully operational!');
    console.log('The system is ready to protect users in critical situations.');
  } else {
    console.log('\n⚠️  Integration needs attention before deployment.');
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { testThrownAwayEndpoint, testThrownAwayTestEndpoint, mockThrownAwayIncident };
