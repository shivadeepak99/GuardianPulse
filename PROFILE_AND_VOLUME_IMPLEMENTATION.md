# User Profile Management & Volume Button Trigger - Implementation Guide

## Overview

This document covers the implementation of **Prompt #44: User Profile Management** and **Prompt #45: Mobile App Secret Volume Button Trigger** for the GuardianPulse safety application.

## Prompt #44: User Profile Management

### Features Implemented

#### Backend API Endpoints

1. **GET /api/v1/users/me** - Get current user profile
   - Returns complete user information including privacy settings
   - Includes account metadata (creation date, last login, etc.)

2. **PUT /api/v1/users/me** - Update user profile
   - Allows updating: firstName, lastName, phoneNumber
   - Server-side validation and sanitization
   - Phone number formatting for international numbers

3. **PUT /api/v1/users/me/password** - Change password
   - Requires current password verification
   - Password strength validation (minimum 8 characters)
   - Secure bcrypt hashing

#### Web Dashboard (`packages/web/src/pages/ProfilePage.tsx`)

- **Tabbed Interface**: Separate tabs for Profile and Password management
- **User Info Card**: Displays avatar, name, email, and membership date
- **Profile Form**:
  - First Name, Last Name, Phone Number fields
  - Read-only email field
  - Phone number formatting help text
- **Password Form**:
  - Current password, new password, confirm password
  - Client-side validation matching server requirements
- **Responsive Design**: Tailwind CSS with mobile-friendly layout

#### Mobile App (`packages/mobile/screens/ProfileScreen.tsx`)

- **Native Mobile UI**: React Native components optimized for mobile
- **Same Functionality**: Profile and password management with tabbed interface
- **Navigation Integration**: Accessible via profile icon in dashboard header
- **Form Validation**: Client-side validation with error handling
- **Loading States**: Loading indicators for API calls

### Security Features

- **JWT Authentication**: All endpoints require valid authentication
- **Password Security**: bcrypt hashing with proper salt rounds
- **Input Validation**: Server-side validation for all user inputs
- **Phone Number Sanitization**: Automatic formatting and validation

### Usage

1. **Web**: Navigate to `/profile` or use profile menu
2. **Mobile**: Tap profile icon in dashboard header
3. **Update Profile**: Fill forms and submit
4. **Change Password**: Use password tab with current password verification

## Prompt #45: Mobile App Secret Volume Button Trigger

### Features Implemented

#### Volume Button Detection Service (`packages/mobile/services/VolumeButtonTriggerService.ts`)

- **Hardware Button Monitoring**: Listens for volume up/down button presses
- **Secret Sequence**: 5 rapid presses within 3 seconds triggers emergency mode
- **Background Operation**: Continues monitoring even when app is backgrounded
- **Navigation Integration**: Automatically navigates to FakeShutdownScreen

#### Emergency Activation Flow

1. **Trigger**: 5 rapid volume button presses
2. **Navigation**: Automatic redirect to FakeShutdownScreen
3. **Emergency Mode**: Activates safety features without obvious UI changes
4. **Stealth Operation**: Appears to be normal device operation

#### FakeShutdownScreen Enhancement

- **Existing Screen**: Leverages existing fake shutdown functionality
- **Volume Button Integration**: Now accessible via hardware buttons
- **Emergency Features**: Location tracking, audio recording, alert system

### Technical Implementation

#### Service Architecture

```typescript
class VolumeButtonTriggerService {
  - Press detection and counting
  - Timer management for sequence validation
  - Navigation integration
  - Background operation handling
  - App state monitoring
}
```

#### Integration Points

1. **App.tsx**: Service initialization
2. **AppNavigator.tsx**: Navigation reference setup
3. **DashboardScreen.tsx**: Profile header button addition
4. **FakeShutdownScreen.tsx**: Emergency functionality (existing)

### Security Considerations

- **Stealth Activation**: No visual feedback during button sequence
- **Background Monitoring**: Continues operation when app is minimized
- **Emergency Override**: Cannot be disabled once sequence is detected
- **Hardware Dependency**: Uses physical buttons that can't be easily blocked

### Setup Requirements

#### Dependencies Added

```json
{
  "react-native-gesture-handler": "^2.23.0",
  "react-native-vector-icons": "^10.2.0",
  "react-native-volume-manager": "^1.10.0"
}
```

#### Platform Configuration

- **iOS**: Requires volume button access permissions
- **Android**: Hardware button event handling
- **Expo**: May require ejection for full hardware access

### Usage Instructions

1. **Install Dependencies**: Run `pnpm install` in mobile package
2. **Configure Native Modules**: Follow react-native-volume-manager setup
3. **Test Sequence**: 5 rapid volume button presses should trigger emergency mode
4. **Background Testing**: Verify operation when app is backgrounded

## Testing

### Profile Management Testing

1. **Web Dashboard**:

   ```bash
   cd packages/web
   pnpm dev
   # Navigate to http://localhost:5173/profile
   ```

2. **Mobile App**:

   ```bash
   cd packages/mobile
   expo start
   # Use profile icon in dashboard header
   ```

3. **API Testing**:
   ```bash
   # Test profile endpoints
   curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/users/me
   ```

### Volume Button Testing

1. **Sequence Test**: Press volume buttons 5 times rapidly
2. **Background Test**: Minimize app, then test sequence
3. **Navigation Test**: Verify FakeShutdownScreen activation
4. **Reset Test**: Verify sequence resets after timeout

## Security Notes

### Profile Management

- Never store passwords in plain text
- Validate all user inputs server-side
- Use secure password hashing (bcrypt)
- Implement rate limiting for password changes

### Volume Button Trigger

- Service operates in background for emergency situations
- Cannot be easily detected or disabled by bad actors
- Uses hardware buttons that are difficult to block
- Provides stealth emergency activation

## Deployment

1. **Backend**: Profile API endpoints deployed with existing API
2. **Web**: Profile page integrated into existing dashboard
3. **Mobile**: Profile screen and volume service included in app bundle
4. **Database**: User profile fields available via existing schema

## Future Enhancements

### Profile Management

- Profile photo upload
- Two-factor authentication
- Privacy settings management
- Account deletion functionality

### Volume Button Trigger

- Configurable button sequences
- Multiple trigger patterns
- Custom emergency actions
- Silent mode activation

## Troubleshooting

### Common Issues

1. **Volume Button Not Working**: Check native module installation
2. **Profile Updates Failing**: Verify JWT token validity
3. **Navigation Errors**: Ensure proper navigation setup
4. **Permission Issues**: Check device permissions for hardware access

### Debug Commands

```bash
# Check mobile dependencies
cd packages/mobile && pnpm list

# Test API endpoints
curl -X GET http://localhost:8080/api/v1/users/me

# View service logs
# Check React Native debugger for VolumeButtonTriggerService logs
```

This implementation provides comprehensive profile management and emergency trigger functionality while maintaining the stealth and security requirements of a safety application.
