import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useImpactDetector } from '../hooks/useImpactDetector';
import { impactAPI, ImpactEventData } from '../services/api';
import * as Location from 'expo-location';

interface LiveModeScreenProps {
  navigation: any;
}

/**
 * Example integration of Impact Detection into a Live Mode screen
 * This shows how to integrate the impact detector into your existing app screens
 */
export const LiveModeScreen: React.FC<LiveModeScreenProps> = ({ navigation }) => {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [lastIncidentTime, setLastIncidentTime] = useState<number | null>(null);

  /**
   * Handle impact detection - this is the core integration point
   */
  const handleImpactDetected = useCallback(async (event: any) => {
    console.log('🚨 IMPACT DETECTED - Triggering emergency protocol!', event);
    
    try {
      // Get current location
      let location = undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const locationResult = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          location = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
            accuracy: locationResult.coords.accuracy || undefined,
          };
        }
      } catch (locationError) {
        console.warn('Could not get location for impact report:', locationError);
      }

      // Prepare impact data for API
      const impactEventData: ImpactEventData = {
        timestamp: event.timestamp,
        accelerometerData: event.accelerometerData,
        gyroscopeData: event.gyroscopeData,
        pattern: event.pattern,
        severity: event.severity,
        location,
        deviceInfo: {
          model: 'Mobile Device', // Get from device info in real implementation
          os: 'React Native',
          appVersion: '1.0.0',
        },
      };

      // Call the new API endpoint (to be created in next step)
      const response = await impactAPI.reportImpact(impactEventData);
      
      setLastIncidentTime(event.timestamp);

      // Show immediate alert to user with options
      Alert.alert(
        '🚨 IMPACT DETECTED!',
        `The app detected that your phone may have been thrown or impacted.\n\nSeverity: ${event.severity}\nConfidence: ${(event.pattern.confidence * 100).toFixed(1)}%\n\nGuardians have been notified (${response.alertsSent} alerts sent).`,
        [
          {
            text: 'False Alarm',
            onPress: async () => {
              try {
                await impactAPI.updateImpactStatus(response.impactId, 'FALSE_ALARM');
                Alert.alert('Status Updated', 'Marked as false alarm. Guardians will be notified.');
              } catch (error) {
                console.error('Error updating status:', error);
              }
            },
            style: 'cancel',
          },
          {
            text: "I'm OK",
            onPress: async () => {
              try {
                await impactAPI.updateImpactStatus(response.impactId, 'RESOLVED');
                Alert.alert('Status Updated', 'Guardians will be notified that you are safe.');
              } catch (error) {
                console.error('Error updating status:', error);
              }
            },
          },
          {
            text: 'EMERGENCY!',
            onPress: async () => {
              try {
                await impactAPI.updateImpactStatus(response.impactId, 'CONFIRMED');
                Alert.alert('Emergency Confirmed', 'Emergency services and guardians have been alerted!');
                // Navigate to emergency screen or trigger additional emergency protocols
                // navigation.navigate('EmergencyScreen');
              } catch (error) {
                console.error('Error confirming emergency:', error);
              }
            },
            style: 'destructive',
          },
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.error('Error handling impact detection:', error);
      
      // Even if API fails, show alert to user
      Alert.alert(
        '⚠️ Impact Detected (Offline)',
        `The app detected a potential impact but couldn't reach the server.\n\nSeverity: ${event.severity}\nConfidence: ${(event.pattern.confidence * 100).toFixed(1)}%\n\nPlease check your connection and manually contact your guardians if needed.`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Initialize impact detector
  const {
    isMonitoring,
    lastImpactTime,
    currentPattern,
  } = useImpactDetector({
    isLiveMode,
    onImpactDetected: handleImpactDetected,
    sensitivity: 'medium', // Can be made configurable
    debugMode: __DEV__, // Enable debug mode in development
  });

  /**
   * Toggle live mode on/off
   */
  const toggleLiveMode = useCallback(() => {
    setIsLiveMode(prev => {
      const newMode = !prev;
      
      if (newMode) {
        Alert.alert(
          'Live Mode Activated',
          'Impact detection is now active. Your guardians will be automatically notified if the app detects that your phone has been thrown or impacted.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Live Mode Deactivated',
          'Impact detection has been turned off.',
          [{ text: 'OK' }]
        );
      }
      
      return newMode;
    });
  }, []);

  /**
   * Test the impact detection system
   */
  const testImpactSystem = useCallback(async () => {
    try {
      const response = await impactAPI.testImpactDetection();
      Alert.alert('Test Complete', response.message);
    } catch (error) {
      Alert.alert('Test Failed', 'Could not test impact detection. Check your connection.');
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guardian Pulse</Text>
      <Text style={styles.subtitle}>Live Protection Mode</Text>

      {/* Live Mode Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isLiveMode ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {isLiveMode ? 'Live Mode Active' : 'Live Mode Inactive'}
        </Text>
      </View>

      {/* Impact Detection Status */}
      {isLiveMode && (
        <View style={styles.detectionStatus}>
          <Text style={styles.detectionTitle}>🛡️ Impact Detection Active</Text>
          <Text style={styles.detectionDescription}>
            Your phone is monitoring for thrown/impact patterns. 
            Guardians will be automatically notified if an incident is detected.
          </Text>
          
          {/* Real-time pattern indicators */}
          {(currentPattern.throwPhase || currentPattern.tumblePhase || currentPattern.impactPhase) && (
            <View style={styles.patternIndicators}>
              <Text style={styles.patternTitle}>Detection Pattern:</Text>
              <View style={styles.patternRow}>
                <Text style={currentPattern.throwPhase ? styles.patternActive : styles.patternInactive}>
                  Throw {currentPattern.throwPhase ? '✓' : '○'}
                </Text>
                <Text style={currentPattern.tumblePhase ? styles.patternActive : styles.patternInactive}>
                  Tumble {currentPattern.tumblePhase ? '✓' : '○'}
                </Text>
                <Text style={currentPattern.impactPhase ? styles.patternActive : styles.patternInactive}>
                  Impact {currentPattern.impactPhase ? '✓' : '○'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Last Incident Display */}
      {lastIncidentTime && (
        <View style={styles.lastIncident}>
          <Text style={styles.lastIncidentTitle}>⚠️ Last Incident</Text>
          <Text style={styles.lastIncidentTime}>
            {new Date(lastIncidentTime).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isLiveMode ? styles.buttonStop : styles.buttonStart]}
          onPress={toggleLiveMode}
        >
          <Text style={styles.buttonText}>
            {isLiveMode ? '🛑 Stop Live Mode' : '▶️ Start Live Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonTest]}
          onPress={testImpactSystem}
        >
          <Text style={styles.buttonText}>🧪 Test Impact System</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Options */}
      <View style={styles.options}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            // Navigate to settings or configuration screen
            Alert.alert('Coming Soon', 'Impact detection sensitivity settings');
          }}
        >
          <Text style={styles.optionText}>⚙️ Detection Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            // Navigate to incident history
            Alert.alert('Coming Soon', 'View incident history');
          }}
        >
          <Text style={styles.optionText}>📋 Incident History</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info (Development only) */}
      {__DEV__ && isMonitoring && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>Monitoring: {isMonitoring ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Last Impact: {lastImpactTime || 'None'}</Text>
          <Text style={styles.debugText}>
            Pattern Confidence: {(currentPattern.confidence * 100).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detectionStatus: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  detectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  detectionDescription: {
    fontSize: 14,
    color: '#388E3C',
    lineHeight: 20,
  },
  patternIndicators: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  patternActive: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  patternInactive: {
    fontSize: 14,
    color: '#A5D6A7',
  },
  lastIncident: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  lastIncidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  lastIncidentTime: {
    fontSize: 14,
    color: '#FF8F00',
  },
  controls: {
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonStart: {
    backgroundColor: '#4CAF50',
  },
  buttonStop: {
    backgroundColor: '#F44336',
  },
  buttonTest: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  options: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  debugInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 2,
  },
});

export default LiveModeScreen;
