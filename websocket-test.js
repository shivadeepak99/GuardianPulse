const io = require('socket.io-client');

console.log('🔌 Connecting to WebSocket server...');
const socket = io('http://localhost:8080', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ WebSocket Connected! Socket ID:', socket.id);
  
  // Test location update
  console.log('📍 Testing location update...');
  socket.emit('update-location', {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: Date.now()
  });
  
  // Test sensor data update  
  console.log('📱 Testing sensor data update...');
  socket.emit('update-sensor-data', {
    accelerometer: { x: 0.2, y: 9.8, z: 0.1 },
    gyroscope: { x: 0.01, y: -0.02, z: 0.005 },
    deviceInfo: { batteryLevel: 75, deviceId: 'test-device-123' }
  });
  
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
    console.log('✅ WebSocket test completed!');
    process.exit(0);
  }, 3000);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection failed:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.log('❌ Socket error:', error);
});
