# GuardianPulse Mobile App

A React Native mobile application built with Expo for the GuardianPulse safety monitoring platform.

## Features

- 🔐 **User Authentication**: Secure login and registration with JWT tokens
- 📱 **Mobile-First Design**: Optimized for iOS and Android devices
- 🔒 **Secure Storage**: JWT tokens and user data stored using AsyncStorage
- 🌐 **API Integration**: Full integration with GuardianPulse backend API
- 📊 **Real-time Updates**: Stay connected to your safety network
- 🎨 **Modern UI**: Clean, intuitive interface with Tailwind-inspired styling

## Technology Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and toolchain
- **TypeScript**: Type-safe JavaScript development
- **React Navigation**: Navigation library for screen transitions
- **Axios**: HTTP client for API requests
- **AsyncStorage**: Secure local storage for authentication tokens

## Project Structure

```
packages/mobile/
├── App.tsx                     # Main app component
├── contexts/
│   └── AuthContext.tsx         # Authentication context and state management
├── navigation/
│   └── AppNavigator.tsx        # Main navigation configuration
├── screens/
│   ├── LoginScreen.tsx         # User login screen
│   ├── RegisterScreen.tsx      # User registration screen
│   ├── DashboardScreen.tsx     # Main dashboard after login
│   └── LoadingScreen.tsx       # Loading state screen
└── services/
    └── api.ts                  # API service and authentication functions
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g @expo/cli`
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

### Installation

1. Navigate to the mobile package directory:
   ```bash
   cd packages/mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (see Configuration section below)

### Running the App

#### Web Development (Quick Testing)
```bash
npm run web
```

#### iOS Simulator (macOS only)
```bash
npm run ios
```

#### Android Emulator
```bash
npm run android
```

#### Expo Go App (Physical Device)
1. Install Expo Go from App Store or Google Play
2. Run: `npx expo start`
3. Scan QR code with Expo Go app

## Configuration

### API Configuration

The app connects to the GuardianPulse backend API. Update the API base URL in `services/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:3001/api'; // Development
// const API_BASE_URL = 'https://your-api-domain.com/api'; // Production
```

### Environment Variables

Create a `.env` file in the mobile package root:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# App Configuration
EXPO_PUBLIC_APP_NAME=GuardianPulse
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Authentication Flow

### Registration
1. User fills out registration form with:
   - First Name (required)
   - Last Name (required)
   - Email (required, validated)
   - Phone Number (optional)
   - Password (minimum 6 characters)
   - Password confirmation
2. Form validation ensures all required fields are completed
3. API request creates new user account
4. JWT token stored in AsyncStorage upon success
5. User redirected to Dashboard

### Login
1. User enters email and password
2. Credentials validated on frontend
3. API request authenticates user
4. JWT token stored in AsyncStorage upon success
5. User data cached locally
6. User redirected to Dashboard

### Session Management
- JWT tokens automatically included in API requests
- Token expiration handled with automatic logout
- User session persists across app restarts
- Secure logout clears all stored data

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Client-side validation for all forms
- **Secure Storage**: Sensitive data stored using AsyncStorage
- **API Error Handling**: Comprehensive error handling and user feedback
- **Token Management**: Automatic token refresh and expiration handling

## API Integration

The mobile app integrates with the following backend endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile
- Additional endpoints for evidence, alerts, and monitoring

## Development Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator  
- `npm run web` - Run in web browser
- `npx tsc --noEmit` - Type checking without compilation

## Building for Production

### Android APK
```bash
npx expo build:android
```

### iOS IPA (macOS only)
```bash
npx expo build:ios
```

### Expo Application Services (EAS)
```bash
npm install -g @expo/eas-cli
eas build --platform all
```

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:
   ```bash
   npx expo start --clear
   ```

2. **iOS simulator not found**:
   - Ensure Xcode is installed and iOS simulator is available
   - Run: `npx expo run:ios`

3. **Android emulator connection issues**:
   - Verify Android Studio is installed
   - Check emulator is running: `adb devices`

4. **API connection errors**:
   - Verify backend server is running
   - Check API_BASE_URL configuration
   - For Android emulator, use `10.0.2.2:3001` instead of `localhost:3001`

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// In services/api.ts
const DEBUG = __DEV__; // Enable in development

if (DEBUG) {
  console.log('API Request:', config);
}
```

## Contributing

1. Follow TypeScript best practices
2. Use meaningful component and variable names  
3. Add proper error handling for all API calls
4. Test on both iOS and Android platforms
5. Maintain consistent styling with existing components

## License

This project is part of the GuardianPulse safety monitoring platform.
