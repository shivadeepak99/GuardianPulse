import React, { useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FakeShutdownScreen from "../screens/FakeShutdownScreen";
import LoadingScreen from "../screens/LoadingScreen";
import { volumeButtonTriggerService } from "../services/VolumeButtonTriggerService";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Profile: undefined;
  FakeShutdown: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef(null);

  useEffect(() => {
    // Initialize volume button trigger service when navigation is ready
    if (navigationRef.current && isAuthenticated) {
      volumeButtonTriggerService.initialize(navigationRef.current);
    }

    return () => {
      // Cleanup when component unmounts or user logs out
      if (!isAuthenticated) {
        volumeButtonTriggerService.destroy();
      }
    };
  }, [isAuthenticated]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#F9FAFB" },
        }}
      >
        {isAuthenticated ? (
          // Authenticated stack
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerShown: true,
                title: "GuardianPulse",
                headerStyle: {
                  backgroundColor: "#3B82F6",
                },
                headerTintColor: "#FFFFFF",
                headerTitleStyle: {
                  fontWeight: "bold",
                  fontSize: 18,
                },
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: "Profile",
                headerStyle: {
                  backgroundColor: "#6366F1",
                },
                headerTintColor: "#FFFFFF",
                headerTitleStyle: {
                  fontWeight: "bold",
                  fontSize: 18,
                },
              }}
            />
            <Stack.Screen
              name="FakeShutdown"
              component={FakeShutdownScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          </>
        ) : (
          // Authentication stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: true,
                title: "Create Account",
                headerStyle: {
                  backgroundColor: "#10B981",
                },
                headerTintColor: "#FFFFFF",
                headerTitleStyle: {
                  fontWeight: "bold",
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
