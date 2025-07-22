/**
 * Mobile App Authentication Flow Demo
 * 
 * This demo script shows how to test the mobile authentication functionality
 * without running the full mobile app. It demonstrates the API integration
 * and token management.
 */

import { authAPI, LoginRequest, RegisterRequest } from '../services/api';

// Demo user data
const demoUser: RegisterRequest = {
  firstName: 'John',
  lastName: 'Guardian',
  email: 'john.guardian@example.com',
  phoneNumber: '+1-555-0123',
  password: 'securepass123'
};

const demoLoginCredentials: LoginRequest = {
  email: 'john.guardian@example.com',
  password: 'securepass123'
};

/**
 * Demo: User Registration Flow
 */
async function demoRegistration() {
  console.log('🔐 Testing User Registration...');
  console.log('User Data:', {
    firstName: demoUser.firstName,
    lastName: demoUser.lastName,
    email: demoUser.email,
    phoneNumber: demoUser.phoneNumber,
    password: '***hidden***'
  });

  try {
    const result = await authAPI.register(demoUser);
    
    if (result.success) {
      console.log('✅ Registration successful!');
      console.log('User ID:', result.data?.user.id);
      console.log('Email:', result.data?.user.email);
      console.log('Role:', result.data?.user.role);
      console.log('Token stored in AsyncStorage');
      return true;
    } else {
      console.log('❌ Registration failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('💥 Registration error:', error);
    return false;
  }
}

/**
 * Demo: User Login Flow
 */
async function demoLoginFlow() {
  console.log('\n🔑 Testing User Login...');
  console.log('Credentials:', {
    email: demoLoginCredentials.email,
    password: '***hidden***'
  });

  try {
    const result = await authAPI.login(demoLoginCredentials);
    
    if (result.success) {
      console.log('✅ Login successful!');
      console.log('User ID:', result.data?.user.id);
      console.log('Email:', result.data?.user.email);
      console.log('Role:', result.data?.user.role);
      console.log('Token stored in AsyncStorage');
      return true;
    } else {
      console.log('❌ Login failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('💥 Login error:', error);
    return false;
  }
}

/**
 * Demo: Authentication Status Check
 */
async function demoAuthCheck() {
  console.log('\n🔍 Checking Authentication Status...');

  try {
    const isAuthenticated = await authAPI.isAuthenticated();
    console.log('Authenticated:', isAuthenticated);

    if (isAuthenticated) {
      const user = await authAPI.getCurrentUser();
      console.log('Current User:', user);
      
      const token = await authAPI.getToken();
      console.log('Token exists:', !!token);
      console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'None');
    }
  } catch (error) {
    console.error('💥 Auth check error:', error);
  }
}

/**
 * Demo: User Logout Flow
 */
async function demoLogout() {
  console.log('\n🚪 Testing User Logout...');

  try {
    await authAPI.logout();
    console.log('✅ Logout successful!');
    console.log('AsyncStorage cleared');

    // Verify logout
    const isAuthenticated = await authAPI.isAuthenticated();
    console.log('Still authenticated:', isAuthenticated);
  } catch (error) {
    console.error('💥 Logout error:', error);
  }
}

/**
 * Run complete authentication flow demo
 */
export async function runMobileAuthDemo() {
  console.log('🚀 GuardianPulse Mobile Authentication Demo');
  console.log('==========================================\n');

  // Test registration
  const registrationSuccess = await demoRegistration();
  
  if (registrationSuccess) {
    // Check auth status after registration
    await demoAuthCheck();
    
    // Test logout
    await demoLogout();
    
    // Test login with existing account
    await demoLoginFlow();
    
    // Final auth check
    await demoAuthCheck();
    
    // Final logout
    await demoLogout();
  }

  console.log('\n✨ Demo completed!');
}

/**
 * Usage Instructions
 */
export const mobileAuthInstructions = `
🎯 Mobile App Authentication Demo

This demo tests the complete authentication flow for the GuardianPulse mobile app:

1. User Registration
2. Authentication Status Check  
3. User Login
4. Token Management
5. User Logout

To run this demo:

1. Ensure the backend API server is running on localhost:3001
2. Import and run the demo function:

   import { runMobileAuthDemo } from './demo/mobile-auth-demo';
   runMobileAuthDemo();

3. Check the console output for detailed results

The demo will:
✅ Create a new user account
✅ Verify authentication status
✅ Test login/logout flows
✅ Demonstrate token storage and retrieval

This validates that the mobile app can successfully:
- Register new users
- Authenticate existing users  
- Store JWT tokens securely
- Manage user sessions
- Handle logout properly

For the full mobile experience, run the Expo app:
npm run web (for browser testing)
npm run ios (for iOS simulator)
npm run android (for Android emulator)
`;

// Export demo for testing
if (require.main === module) {
  runMobileAuthDemo().catch(console.error);
}
