#!/usr/bin/env node

/**
 * Guardian Pulse Incident Endpoints Demo
 * 
 * This script demonstrates the new incident creation and alerting endpoints.
 * Make sure to have a valid JWT token and the API running on localhost:8080.
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:8080/api/v1';

// Replace with a valid JWT token from your authentication
const JWT_TOKEN = 'your-jwt-token-here';

class GuardianPulseDemo {
  constructor(token) {
    this.token = token;
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${API_BASE}${endpoint}`);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ status: res.statusCode, data: jsonData });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || 'Request failed'}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  async testHealthCheck() {
    console.log('\n🔍 Testing Health Check...');
    try {
      const result = await this.makeRequest('/health');
      console.log('✅ Health Check Success:', result.data);
      return true;
    } catch (error) {
      console.log('❌ Health Check Failed:', error.message);
      return false;
    }
  }

  async testManualSOS() {
    console.log('\n🚨 Testing Manual SOS...');
    
    if (!this.token || this.token === 'your-jwt-token-here') {
      console.log('⚠️  Skipping Manual SOS test - Please provide a valid JWT token');
      return;
    }

    try {
      const sosData = {
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10
        },
        message: 'Demo emergency - this is a test SOS alert'
      };

      const result = await this.makeRequest('/incidents/manual-sos', 'POST', sosData);
      console.log('✅ Manual SOS Success:', result.data);
    } catch (error) {
      console.log('❌ Manual SOS Failed:', error.message);
    }
  }

  async testNormalSensorData() {
    console.log('\n📱 Testing Normal Sensor Data...');
    
    if (!this.token || this.token === 'your-jwt-token-here') {
      console.log('⚠️  Skipping Normal Sensor Data test - Please provide a valid JWT token');
      return;
    }

    try {
      const sensorData = {
        accelerometer: {
          x: 0.5,
          y: 9.8,  // Normal gravity
          z: 0.2
        },
        gyroscope: {
          x: 0.1,
          y: 0.0,
          z: 0.05
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5
        },
        timestamp: new Date().toISOString()
      };

      const result = await this.makeRequest('/incidents/process-sensor-data', 'POST', sensorData);
      console.log('✅ Normal Sensor Data Success:', result.data);
    } catch (error) {
      console.log('❌ Normal Sensor Data Failed:', error.message);
    }
  }

  async testFallDetection() {
    console.log('\n💥 Testing Fall Detection...');
    
    if (!this.token || this.token === 'your-jwt-token-here') {
      console.log('⚠️  Skipping Fall Detection test - Please provide a valid JWT token');
      return;
    }

    try {
      const fallSensorData = {
        accelerometer: {
          x: 15.5,  // High acceleration values
          y: 25.2,  // Exceeds fall threshold (20 m/s²)
          z: 18.7
        },
        gyroscope: {
          x: 2.1,
          y: -1.8,
          z: 3.2
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5
        },
        timestamp: new Date().toISOString()
      };

      const result = await this.makeRequest('/incidents/process-sensor-data', 'POST', fallSensorData);
      console.log('✅ Fall Detection Success:', result.data);
      
      if (result.data.anomalyDetected && result.data.incidentCreated) {
        console.log('🎯 Fall was detected and incident was created!');
      }
    } catch (error) {
      console.log('❌ Fall Detection Failed:', error.message);
    }
  }

  async runDemo() {
    console.log('🔒 Guardian Pulse Incident System Demo');
    console.log('=====================================');
    
    // Test health check first
    const healthOk = await this.testHealthCheck();
    
    if (!healthOk) {
      console.log('\n❌ API is not responding. Please make sure the Docker containers are running:');
      console.log('   docker-compose up -d');
      return;
    }

    // Test authenticated endpoints
    await this.testManualSOS();
    await this.testNormalSensorData();
    await this.testFallDetection();

    console.log('\n✨ Demo completed!');
    
    if (this.token === 'your-jwt-token-here') {
      console.log('\n📝 To test authenticated endpoints:');
      console.log('1. Register/login to get a JWT token');
      console.log('2. Replace JWT_TOKEN in this script');
      console.log('3. Run the script again');
    }
  }
}

// Calculate fall acceleration for reference
function calculateFallAcceleration(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

// Show example calculations
console.log('\n📊 Fall Detection Algorithm Reference:');
console.log('=====================================');
console.log('Fall Threshold: 20 m/s²');
console.log('Confidence Threshold: 70%');
console.log('');
console.log('Normal acceleration (0.5, 9.8, 0.2):', calculateFallAcceleration(0.5, 9.8, 0.2).toFixed(2), 'm/s²');
console.log('Fall acceleration (15.5, 25.2, 18.7):', calculateFallAcceleration(15.5, 25.2, 18.7).toFixed(2), 'm/s²');

// Run the demo
const demo = new GuardianPulseDemo(JWT_TOKEN);
demo.runDemo().catch(error => {
  console.error('\n💥 Demo failed:', error.message);
  process.exit(1);
});
