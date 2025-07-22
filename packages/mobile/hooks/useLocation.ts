import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { useSocket } from '../src/contexts/SocketContext';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface LocationState {
  currentLocation: LocationData | null;
  isTracking: boolean;
  hasPermission: boolean;
  permissionStatus: Location.LocationPermissionResponse | null;
  error: string | null;
}

export interface LocationHook extends LocationState {
  requestPermissions: () => Promise<boolean>;
  startLocationTracking: () => Promise<boolean>;
  stopLocationTracking: () => void;
  getCurrentLocation: () => Promise<LocationData | null>;
  refreshPermissions: () => Promise<void>;
}

/**
 * Custom hook for GPS location tracking and permissions management
 * 
 * This hook provides comprehensive location services for the GuardianPulse mobile app,
 * including permission management, real-time tracking, and automatic server updates.
 */
export const useLocation = (): LocationHook => {
  const { emit, isConnected } = useSocket();
  const [locationState, setLocationState] = useState<LocationState>({
    currentLocation: null,
    isTracking: false,
    hasPermission: false,
    permissionStatus: null,
    error: null,
  });

  // Store the location watch subscription
  const locationWatchRef = useRef<{ remove: () => void } | null>(null);
  
  // Track last emission to prevent spam
  const lastEmissionRef = useRef<number>(0);
  const EMISSION_THROTTLE = 4000; // 4 seconds minimum between emissions

  /**
   * Check and request location permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      console.log('📍 Requesting location permissions...');

      // Check current permission status
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Location permissions already granted');
        setLocationState(prev => ({
          ...prev,
          hasPermission: true,
          error: null,
        }));
        return true;
      }

      // Request foreground permissions
      const permissionResponse = await Location.requestForegroundPermissionsAsync();
      
      setLocationState(prev => ({
        ...prev,
        permissionStatus: permissionResponse,
        hasPermission: permissionResponse.status === 'granted',
        error: permissionResponse.status !== 'granted' ? 'Location permission denied' : null,
      }));

      if (permissionResponse.status !== 'granted') {
        console.warn('⚠️ Location permission denied');
        
        // Show user-friendly alert
        Alert.alert(
          'Location Permission Required',
          'GuardianPulse needs location access to provide safety monitoring and emergency services. Please enable location permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // iOS doesn't allow direct opening of app settings from the app
                  Alert.alert(
                    'Enable Location',
                    'Go to Settings > Privacy & Security > Location Services > GuardianPulse and enable location access.'
                  );
                } else {
                  // Android can open app settings
                  Location.enableNetworkProviderAsync();
                }
              }
            },
          ]
        );
        return false;
      }

      console.log('✅ Location permissions granted');
      return true;
    } catch (error) {
      console.error('💥 Error requesting location permissions:', error);
      setLocationState(prev => ({
        ...prev,
        error: 'Failed to request location permissions',
        hasPermission: false,
      }));
      return false;
    }
  };

  /**
   * Get current location once
   */
  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      if (!locationState.hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return null;
      }

      console.log('📍 Getting current location...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 0,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };

      setLocationState(prev => ({
        ...prev,
        currentLocation: locationData,
        error: null,
      }));

      console.log('📍 Current location obtained:', {
        lat: locationData.latitude,
        lng: locationData.longitude,
        accuracy: locationData.accuracy,
      });

      return locationData;
    } catch (error) {
      console.error('💥 Error getting current location:', error);
      setLocationState(prev => ({
        ...prev,
        error: 'Failed to get current location',
      }));
      return null;
    }
  };

  /**
   * Start continuous location tracking
   */
  const startLocationTracking = async (): Promise<boolean> => {
    try {
      // Check permissions first
      if (!locationState.hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }

      // Stop existing tracking if any
      if (locationWatchRef.current) {
        console.log('🔄 Stopping existing location tracking...');
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }

      console.log('📍 Starting location tracking...');
      
      // Configure location tracking options
      const watchOptions: Location.LocationOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update when moved 10 meters
      };

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        watchOptions,
        (location) => {
          const now = Date.now();
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };

          // Update local state
          setLocationState(prev => ({
            ...prev,
            currentLocation: locationData,
            error: null,
          }));

          // Emit to server with throttling
          if (isConnected && (now - lastEmissionRef.current) >= EMISSION_THROTTLE) {
            const payload = {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              timestamp: locationData.timestamp,
              accuracy: locationData.accuracy,
              speed: locationData.speed,
              heading: locationData.heading,
            };

            emit('update-location', payload);
            lastEmissionRef.current = now;
            
            console.log('📡 Location update sent to server:', {
              lat: payload.latitude,
              lng: payload.longitude,
              accuracy: payload.accuracy,
            });
          } else if (!isConnected) {
            console.warn('⚠️ Socket not connected - location update not sent');
          }
        }
      );

      // Store subscription reference
      locationWatchRef.current = subscription;

      setLocationState(prev => ({
        ...prev,
        isTracking: true,
        error: null,
      }));

      console.log('✅ Location tracking started successfully');
      return true;
    } catch (error) {
      console.error('💥 Error starting location tracking:', error);
      setLocationState(prev => ({
        ...prev,
        error: 'Failed to start location tracking',
        isTracking: false,
      }));
      return false;
    }
  };

  /**
   * Stop location tracking
   */
  const stopLocationTracking = (): void => {
    try {
      if (locationWatchRef.current) {
        console.log('🛑 Stopping location tracking...');
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
        
        setLocationState(prev => ({
          ...prev,
          isTracking: false,
        }));
        
        console.log('✅ Location tracking stopped');
      } else {
        console.log('📍 No active location tracking to stop');
      }
    } catch (error) {
      console.error('💥 Error stopping location tracking:', error);
    }
  };

  /**
   * Refresh permission status
   */
  const refreshPermissions = async (): Promise<void> => {
    try {
      const permissionResponse = await Location.getForegroundPermissionsAsync();
      setLocationState(prev => ({
        ...prev,
        permissionStatus: permissionResponse,
        hasPermission: permissionResponse.status === 'granted',
        error: permissionResponse.status !== 'granted' ? 'Location permission not granted' : null,
      }));
    } catch (error) {
      console.error('💥 Error refreshing permissions:', error);
    }
  };

  // Check permissions on mount
  useEffect(() => {
    refreshPermissions();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
    };
  }, []);

  // Monitor socket connection changes
  useEffect(() => {
    if (!isConnected && locationState.isTracking) {
      console.warn('⚠️ Socket disconnected while tracking location');
    }
  }, [isConnected, locationState.isTracking]);

  return {
    ...locationState,
    requestPermissions,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    refreshPermissions,
  };
};
