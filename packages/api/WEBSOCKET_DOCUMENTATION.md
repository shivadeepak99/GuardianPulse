# GuardianPulse WebSocket Integration

## Overview

The GuardianPulse API includes real-time communication capabilities using Socket.IO for bi-directional communication between clients and the server. This enables live data streaming, emergency alerts, location tracking, and instant notifications.

## Connection

### Basic Connection
```javascript
const io = require('socket.io-client');

const socket = io('ws://localhost:8080', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

### Browser Example
```html
<!DOCTYPE html>
<html>
<head>
    <title>GuardianPulse WebSocket Test</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
    <script>
        // Get JWT token from login
        const token = 'your-jwt-token-here';
        
        const socket = io('ws://localhost:8080', {
            auth: {
                token: token
            }
        });
        
        socket.on('connect', () => {
            console.log('Connected to GuardianPulse server:', socket.id);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Connection failed:', error.message);
        });
    </script>
</body>
</html>
```

## Authentication

WebSocket connections require JWT authentication obtained from the login endpoint:

1. **Login** via REST API: `POST /api/v1/users/login`
2. **Get JWT token** from the response
3. **Connect** to WebSocket with token in auth object

```javascript
// First, login via REST API
const loginResponse = await fetch('http://localhost:8080/api/v1/users/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
    })
});

const { data } = await loginResponse.json();
const token = data.token;

// Then connect to WebSocket
const socket = io('ws://localhost:8080', {
    auth: {
        token: token
    }
});
```

## Events

### System Events

#### Connection Health
```javascript
// Send ping to check connection
socket.emit('ping');

// Receive pong response
socket.on('pong', (data) => {
    console.log('Server response:', data);
    // { timestamp: "2025-07-22T10:30:00.000Z", serverId: "main" }
});
```

### User Events

#### Status Updates
```javascript
// Update user status
socket.emit('status:update', {
    status: 'active',
    location: 'home',
    mood: 'safe'
});

// Listen for status updates
socket.on('status:updated', (data) => {
    console.log('Status updated:', data);
    // { userId: "123", status: "active", timestamp: "..." }
});
```

#### Location Sharing
```javascript
// Share location for safety monitoring
socket.emit('location:update', {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
    timestamp: new Date().toISOString()
});

// Receive acknowledgment
socket.on('location:acknowledged', (data) => {
    console.log('Location received:', data);
    // { timestamp: "...", status: "received" }
});
```

### Emergency System

#### Emergency Alerts
```javascript
// Send emergency alert
socket.emit('emergency:alert', {
    type: 'panic',
    severity: 'high',
    location: {
        latitude: 40.7128,
        longitude: -74.0060
    },
    message: 'Need immediate help',
    contacts: ['911', 'emergency-contact-id']
});

// Receive alert acknowledgment
socket.on('emergency:acknowledged', (data) => {
    console.log('Emergency alert processed:', data);
    // {
    //   alertId: "alert_1640995200000_userId",
    //   timestamp: "...",
    //   status: "processing",
    //   message: "Emergency alert received and being processed"
    // }
});

// Handle emergency errors
socket.on('emergency:error', (data) => {
    console.error('Emergency alert failed:', data);
});
```

### Custom Messaging

#### General Messages
```javascript
// Send custom message
socket.emit('message', {
    type: 'check-in',
    content: 'I am safe and well',
    priority: 'normal'
});

// Receive message confirmation
socket.on('message:received', (data) => {
    console.log('Message processed:', data);
    // Original data + timestamp + serverId
});
```

## Error Handling

### Connection Errors
```javascript
socket.on('connect_error', (error) => {
    switch(error.message) {
        case 'Authentication required':
            console.error('No token provided');
            break;
        case 'Invalid token':
            console.error('Token is invalid or malformed');
            break;
        case 'Token expired':
            console.error('Token has expired, please login again');
            break;
        case 'User not found':
            console.error('User account not found');
            break;
        case 'Account inactive':
            console.error('User account is deactivated');
            break;
        default:
            console.error('Connection failed:', error.message);
    }
});
```

### Socket Errors
```javascript
socket.on('error', (error) => {
    console.error('Socket error:', error);
});
```

## Advanced Usage

### Room Management
Users are automatically joined to user-specific rooms (`user:{userId}`) for targeted messaging.

### Monitoring Systems
```javascript
// For monitoring/admin systems
socket.emit('join:monitors');

// Listen for emergency alerts from all users
socket.on('emergency:new', (data) => {
    console.log('New emergency alert:', data);
    // Handle emergency response
});
```

### Reconnection Handling
```javascript
socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    
    if (reason === 'io server disconnect') {
        // Server initiated disconnect, manual reconnection needed
        socket.connect();
    }
    // Auto-reconnection will handle other cases
});

socket.on('connect', () => {
    console.log('Reconnected to server');
});
```

## Testing

### WebSocket Test Client
```javascript
const io = require('socket.io-client');

class GuardianPulseClient {
    constructor(token) {
        this.socket = io('ws://localhost:8080', {
            auth: { token }
        });
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to GuardianPulse');
            this.testConnection();
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from GuardianPulse');
        });
        
        this.socket.on('pong', (data) => {
            console.log('🏓 Pong received:', data);
        });
        
        this.socket.on('location:acknowledged', (data) => {
            console.log('📍 Location acknowledged:', data);
        });
        
        this.socket.on('emergency:acknowledged', (data) => {
            console.log('🚨 Emergency acknowledged:', data);
        });
    }
    
    testConnection() {
        // Test ping/pong
        this.socket.emit('ping');
        
        // Test location update
        setTimeout(() => {
            this.socket.emit('location:update', {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 10
            });
        }, 1000);
        
        // Test status update
        setTimeout(() => {
            this.socket.emit('status:update', {
                status: 'active'
            });
        }, 2000);
    }
}

// Usage
const client = new GuardianPulseClient('your-jwt-token');
```

## Security Considerations

1. **JWT Token Security**: Store tokens securely and refresh before expiration
2. **Data Validation**: All incoming data should be validated on the server
3. **Rate Limiting**: Implement rate limiting for emergency alerts and messages
4. **Encryption**: Use WSS (WebSocket Secure) in production
5. **CORS**: Configure appropriate CORS settings for your frontend domain

## Production Configuration

```javascript
const io = new Server(httpServer, {
    cors: {
        origin: "https://yourdomain.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket'], // Disable polling in production for better performance
    pingTimeout: 60000,
    pingInterval: 25000
});
```

## Support

For WebSocket-related issues:
1. Check JWT token validity
2. Verify network connectivity
3. Monitor server logs for authentication errors
4. Test with the provided client examples

For more information, see the main API documentation.
