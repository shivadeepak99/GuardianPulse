# Location Data Broadcasting - Prompt #15 Implementation

## Overview

The Location Data Broadcasting system enables real-time GPS tracking during active Live Sessions. Wards can send their location data, which is automatically validated and broadcasted to their connected Guardians in real-time.

## Core Features Implemented

### ✅ Session-Aware Location Updates
- **Active Session Requirement**: Location updates only processed during active Live Sessions
- **Real-time Broadcasting**: Immediate relay of location data to all connected Guardians
- **Data Validation**: Comprehensive validation of GPS coordinates and accuracy
- **Session Integration**: Location data stored in session for tracking history

### ✅ Enhanced LiveSessionData Structure
```typescript
interface LiveSessionData {
  userId: string;
  startTime: Date;
  sessionId: string;
  roomName: string;
  guardianIds: string[];
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
}
```

### ✅ Location Update Event Handler (`update-location`)
When a Ward emits this event, the server:

1. **Authentication Verification**: Ensures user is authenticated
2. **Active Session Check**: Verifies Ward has an active session in `activeSessions`
3. **Data Validation**: 
   - Validates latitude/longitude are numbers
   - Checks coordinate ranges (-90 to 90 for lat, -180 to 180 for lng)
   - Validates payload structure
4. **Session Update**: Updates session data with new coordinates and timestamp
5. **Guardian Broadcasting**: Broadcasts `location-updated` to Ward's specific room
6. **Acknowledgment**: Confirms successful processing to Ward

## WebSocket Events

### Client to Server Events

#### `update-location`
```typescript
// Payload
{
  latitude: number;        // Required: -90 to 90
  longitude: number;       // Required: -180 to 180
  accuracy?: number;       // Optional: GPS accuracy in meters
  altitude?: number;       // Optional: Altitude in meters
  heading?: number;        // Optional: Direction of travel (0-360 degrees)
  speed?: number;          // Optional: Speed in m/s
}
```

### Server to Client Events

#### `location-updated` (to Guardians in Ward's room)
```typescript
{
  wardId: string;          // Ward's user ID
  wardEmail: string;       // Ward's email
  sessionId: string;       // Current session ID
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    heading?: number;
    speed?: number;
    timestamp: string;     // ISO string
  };
  timestamp: string;       // ISO string
}
```

#### `location-acknowledged` (to Ward)
```typescript
{
  sessionId: string;       // Current session ID
  timestamp: string;       // ISO string
  status: 'broadcasted';   // Confirmation status
  guardianCount: number;   // Number of guardians in session
}
```

#### `location-error` (error handling)
```typescript
{
  message: string;         // Error description
  timestamp: string;       // ISO string
}
```

## Data Validation

### ✅ Coordinate Validation
- **Latitude Range**: -90 to 90 degrees
- **Longitude Range**: -180 to 180 degrees
- **Type Validation**: Must be numbers
- **Required Fields**: Latitude and longitude mandatory

### ✅ Session Validation
- **Active Session Required**: Location updates ignored without active session
- **User Authentication**: JWT authentication verified
- **Room Membership**: Only broadcasts to Ward's specific room

### ✅ Error Handling
- **Invalid Coordinates**: Clear error messages for range violations
- **Missing Session**: Informative message about starting Live Session
- **Authentication Errors**: Proper authentication failure responses
- **Malformed Data**: Validation errors for incorrect payload structure

## Security Features

### ✅ Session-Based Authorization
- **Only Active Sessions**: Location data only processed during live sessions
- **Room Isolation**: Location broadcasts limited to Ward's specific room
- **Guardian Verification**: Only accepted guardians receive location updates

### ✅ Data Privacy
- **Targeted Broadcasting**: Location only sent to Ward's guardians
- **Session Scoped**: Location data tied to specific sessions
- **Automatic Cleanup**: Location data cleared when session ends

## Location Data Storage

### ✅ In-Memory Session Storage
- **Last Location**: Stored in `activeSessions` map with timestamp
- **Real-time Updates**: Immediate update and broadcast
- **Session Lifecycle**: Automatically cleaned up on session end

### ✅ Enhanced Utility Functions
```typescript
// Get current location for a Ward's session
getSessionLocation(userId: string): LocationData | undefined

// Get all sessions with location data
getActiveSessionsWithLocations(): SessionWithLocation[]
```

## Integration with Live Sessions

### ✅ Seamless Integration
- **Start Session → Enable Location**: Location updates automatically enabled during sessions
- **Stop Session → Disable Location**: Location tracking stops with session
- **Disconnect Cleanup**: Location data cleaned up on Ward disconnect

### ✅ Guardian Experience
- **Real-time Updates**: Immediate location updates during sessions
- **Session Context**: Location updates include session and Ward information
- **Automatic Joining**: Connected guardians automatically receive updates

## Performance Optimization

### ✅ Efficient Broadcasting
- **Room-Based**: Uses Socket.IO rooms for targeted messaging
- **Memory Efficient**: Minimal memory footprint per session
- **Real-time**: Immediate broadcasting without database queries

### ✅ Validation Performance
- **Fast Checks**: Simple numeric range validation
- **Early Returns**: Quick rejection of invalid data
- **Minimal Processing**: Lightweight coordinate validation

## Backward Compatibility

### ✅ Legacy Support
- **Old Handler Preserved**: `location:update` still available for non-session use
- **Clear Migration Path**: Informative responses guide to new event
- **Graceful Degradation**: Non-session location updates acknowledged

## Error Scenarios Handled

### ✅ Comprehensive Error Coverage
1. **No Authentication**: Clear authentication error
2. **No Active Session**: Guidance to start Live Session
3. **Invalid Coordinates**: Specific validation error messages
4. **Malformed Payload**: Data structure validation errors
5. **Network Issues**: Proper error logging and responses

## Real-World Usage Flow

1. **Ward starts Live Session** → Session created, guardians notified
2. **Ward device sends GPS data** → `update-location` event with coordinates
3. **Server validates data** → Checks session, authentication, coordinates
4. **Server updates session** → Stores location with timestamp
5. **Server broadcasts** → `location-updated` sent to all guardians in room
6. **Server acknowledges** → Confirmation sent back to Ward
7. **Guardians receive** → Real-time location updates during session

## Testing Status

✅ **Implementation Complete**: All Prompt #15 requirements implemented
✅ **Session Integration**: Location updates require active Live Sessions
✅ **Data Validation**: Comprehensive coordinate and payload validation  
✅ **Real-time Broadcasting**: Immediate relay to Ward's guardians
✅ **Error Handling**: Robust error responses and validation
✅ **Utility Functions**: Helper functions for location data access
✅ **TypeScript Safety**: Full type safety with proper interfaces

## Next Steps

The Location Data Broadcasting system (Prompt #15) is fully implemented and integrated with the Live Session Management system. This provides:

1. **Real-time GPS tracking** during active Ward-Guardian sessions
2. **Secure, session-scoped location sharing** with proper validation
3. **Efficient broadcasting** to connected guardians only
4. **Comprehensive error handling** and data validation
5. **Seamless integration** with existing Live Session functionality

The system is ready for production use and provides a solid foundation for real-time location tracking in safety applications.
