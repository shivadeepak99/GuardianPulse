# 🧪 GuardianPulse API Testing Guide

## Testing Redis Data Buffering & Dynamic Configuration

### Prerequisites

- PostgreSQL running on port 5432 
- Redis running on port 6379 (optional)
- API server running on port 8080

---

## 🔧 Configuration Management Tests

### 1. Get All Configurations

```bash
curl -X GET "http://localhost:8080/api/config" \
  -H "Content-Type: application/json"
```

### 2. Get Fall Detection Threshold

```bash
curl -X GET "http://localhost:8080/api/config/FALL_SENSITIVITY_THRESHOLD" \
  -H "Content-Type: application/json"
```

### 3. Update Fall Detection Sensitivity

```bash
curl -X PUT "http://localhost:8080/api/config/FALL_SENSITIVITY_THRESHOLD" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "25",
    "description": "Updated threshold for more sensitive fall detection",
    "category": "fall_detection"
  }'
```

### 4. Bulk Configuration Update

```bash
curl -X POST "http://localhost:8080/api/config/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "configs": [
      {
        "key": "FALL_SENSITIVITY_THRESHOLD",
        "value": "22",
        "description": "Moderate sensitivity threshold",
        "category": "fall_detection"
      },
      {
        "key": "FALL_CONFIDENCE_THRESHOLD",
        "value": "0.8",
        "description": "Higher confidence requirement",
        "category": "fall_detection"
      }
    ]
  }'
```

### 5. Configuration Service Health Check

```bash
curl -X GET "http://localhost:8080/api/config/health" \
  -H "Content-Type: application/json"
```

---

## 📡 WebSocket Data Buffering Tests

### 1. Connect to WebSocket

```javascript
const io = require("socket.io-client");
const socket = io("http://localhost:8080", {
  auth: {
    token: "YOUR_JWT_TOKEN_HERE",
  },
});

socket.on("connect", () => {
  console.log("Connected to GuardianPulse API");
});
```

### 2. Send Location Data (for buffering)

```javascript
socket.emit("update-location", {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10,
  altitude: 50,
  heading: 180,
  speed: 5.2,
});
```

### 3. Send Sensor Data (for buffering)

```javascript
socket.emit("update-sensor-data", {
  accelerometer: {
    x: 0.2,
    y: 9.8,
    z: 0.1,
  },
  gyroscope: {
    x: 0.01,
    y: -0.02,
    z: 0.005,
  },
  deviceInfo: {
    batteryLevel: 75,
    deviceId: "device-123",
  },
});
```

### 4. Test Fall Detection (triggers incident with pre-incident data)

```javascript
socket.emit("update-sensor-data", {
  accelerometer: {
    x: 5.2,
    y: 15.8, // High acceleration - should trigger fall detection
    z: 8.1,
  },
  gyroscope: {
    x: 2.1,
    y: -1.8,
    z: 3.2,
  },
});
```

---

## 📊 Database Verification

### 1. Check Configuration Values

```sql
SELECT * FROM app_config ORDER BY category, key;
```

### 2. Check Incident with Pre-Incident Data

```sql
SELECT
  id,
  ward_id,
  type,
  pre_incident_data,
  created_at
FROM incidents
WHERE pre_incident_data IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🔍 Redis Data Inspection

### 1. Connect to Redis CLI

```bash
redis-cli
```

### 2. Check Buffered Location Data

```redis
LRANGE location:USER_ID_HERE 0 -1
```

### 3. Check Buffered Sensor Data

```redis
LRANGE sensor:USER_ID_HERE 0 -1
```

### 4. Check All Guardian Keys

```redis
KEYS *
```

---

## 📋 Expected Response Examples

### Configuration Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "cm0abc123",
      "key": "FALL_SENSITIVITY_THRESHOLD",
      "value": "20",
      "description": "Acceleration threshold in m/s² for fall detection",
      "category": "fall_detection",
      "isActive": true,
      "createdAt": "2025-07-23T17:12:27.000Z",
      "updatedAt": "2025-07-23T17:12:27.000Z"
    }
  ],
  "count": 13,
  "timestamp": "2025-07-23T17:15:00.000Z"
}
```

### Sensor Data Acknowledgment:

```json
{
  "timestamp": "2025-07-23T17:15:00.000Z",
  "status": "buffered"
}
```

### Pre-Incident Data in Database:

```json
{
  "locationData": [
    {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "accuracy": 10,
      "timestamp": "2025-07-23T17:14:58.000Z"
    }
  ],
  "sensorData": [
    {
      "accelerometer": { "x": 0.2, "y": 9.8, "z": 0.1 },
      "gyroscope": { "x": 0.01, "y": -0.02, "z": 0.005 },
      "timestamp": "2025-07-23T17:14:59.000Z"
    }
  ],
  "retrievedAt": "2025-07-23T17:15:00.000Z"
}
```

---

## 🎯 Feature Validation Checklist

- [ ] ✅ Configuration API endpoints responding
- [ ] ✅ Redis buffering location data (last 60 points)
- [ ] ✅ Redis buffering sensor data (last 60 points)
- [ ] ✅ Dynamic fall detection thresholds working
- [ ] ✅ Pre-incident data stored in incidents
- [ ] ✅ Configuration cache refreshing
- [ ] ✅ Graceful Redis failure handling
- [ ] ✅ Database seeding completed
- [ ] ✅ Service health checks operational

**Implementation Status: COMPLETE & READY FOR PRODUCTION** 🚀
