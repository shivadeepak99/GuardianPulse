import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useImpactDetector } from '../hooks/useImpactDetector';
import { impactAPI, ImpactEventData } from '../services/api';
import * as Location from 'expo-location';

interface ImpactDetectionDemoProps {
  userId: string;
  isLiveMode: boolean;
  onToggleLiveMode: () => void;
}

/**
 * Demo component for testing Impact Detection functionality
 * This would typically be integrated into the main app screens
 */
export const ImpactDetectionDemo: React.FC<ImpactDetectionDemoProps> = ({
  userId,
  isLiveMode,
  onToggleLiveMode,
}) => {
  const [detectionHistory, setDetectionHistory] = useState<ImpactEventData[]>([]);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [debugMode, setDebugMode] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  /**
   * Handle impact detection event
   */
  const handleImpactDetected = useCallback(async (event: any) => {
    console.log('🚨 Impact detected in demo component!', event);
    
    try {
      setIsReporting(true);
      
      // Get current location if available
      let location = undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const locationResult = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          location = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
            accuracy: locationResult.coords.accuracy || undefined,
          };
        }
      } catch (locationError) {
        console.warn('Could not get location:', locationError);
      }

      // Prepare impact event data for API
      const impactEventData: ImpactEventData = {
        timestamp: event.timestamp,
        accelerometerData: event.accelerometerData,
        gyroscopeData: event.gyroscopeData,
        pattern: event.pattern,
        severity: event.severity,
        location,
        deviceInfo: {
          model: 'Demo Device', // In real app, get from device info
          os: 'iOS/Android',    // In real app, get from Platform
          appVersion: '1.0.0',  // In real app, get from app.json
        },
      };

      // Report to API
      const response = await impactAPI.reportImpact(impactEventData);
      
      // Update local history
      setDetectionHistory(prev => [impactEventData, ...prev.slice(0, 9)]);

      // Show alert to user
      Alert.alert(
        '🚨 Impact Detected!',
        `Severity: ${event.severity}\nConfidence: ${(event.pattern.confidence * 100).toFixed(1)}%\nAlerts sent: ${response.alertsSent}`,
        [
          {
            text: 'False Alarm',
            onPress: () => handleUpdateStatus(response.impactId, 'FALSE_ALARM'),
            style: 'cancel',
          },
          {
            text: 'Confirm Emergency',
            onPress: () => handleUpdateStatus(response.impactId, 'CONFIRMED'),
            style: 'destructive',
          },
          {
            text: 'I\'m OK',
            onPress: () => handleUpdateStatus(response.impactId, 'RESOLVED'),
          },
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.error('Error handling impact detection:', error);
      Alert.alert(
        'Error',
        'Failed to report impact. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsReporting(false);
    }
  }, []);

  /**
   * Update impact status via API
   */
  const handleUpdateStatus = useCallback(async (
    impactId: string, 
    status: 'CONFIRMED' | 'FALSE_ALARM' | 'RESOLVED'
  ) => {
    try {
      await impactAPI.updateImpactStatus(impactId, status);
      console.log('Impact status updated:', status);
    } catch (error) {
      console.error('Error updating impact status:', error);
    }
  }, []);

  /**
   * Test impact detection system
   */
  const handleTestDetection = useCallback(async () => {
    try {
      Alert.alert(
        'Test Impact Detection',
        'This will simulate an impact event and test the alert system.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Run Test',
            onPress: async () => {
              try {
                const response = await impactAPI.testImpactDetection();
                Alert.alert('Test Result', response.message);
              } catch (error) {
                Alert.alert('Test Failed', 'Could not run test. Check connection.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error testing impact detection:', error);
    }
  }, []);

  // Use the impact detector hook
  const {
    isMonitoring,
    lastImpactTime,
    currentPattern,
    bufferSizes,
  } = useImpactDetector({
    isLiveMode,
    onImpactDetected: handleImpactDetected,
    sensitivity,
    debugMode,
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Impact Detection System</Text>
      
      {/* Live Mode Toggle */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Live Mode</Text>
          <Switch
            value={isLiveMode}
            onValueChange={onToggleLiveMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isLiveMode ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.status}>
          Status: {isMonitoring ? '🟢 Monitoring' : '🔴 Inactive'}
        </Text>
      </View>

      {/* Sensitivity Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detection Sensitivity</Text>
        <View style={styles.sensitivityContainer}>
          {(['low', 'medium', 'high'] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.sensitivityButton,
                sensitivity === level && styles.sensitivityButtonActive,
              ]}
              onPress={() => setSensitivity(level)}
            >
              <Text
                style={[
                  styles.sensitivityButtonText,
                  sensitivity === level && styles.sensitivityButtonTextActive,
                ]}
              >
                {level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Debug Mode */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Debug Mode</Text>
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={debugMode ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.subtext}>
          Enable console logging for detection phases
        </Text>
      </View>

      {/* Current Detection State */}
      {isMonitoring && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detection State</Text>
          <View style={styles.stateGrid}>
            <View style={styles.stateItem}>
              <Text style={styles.stateLabel}>Throw Phase</Text>
              <Text style={currentPattern.throwPhase ? styles.stateActive : styles.stateInactive}>
                {currentPattern.throwPhase ? '✅' : '⭕'}
              </Text>
            </View>
            <View style={styles.stateItem}>
              <Text style={styles.stateLabel}>Tumble Phase</Text>
              <Text style={currentPattern.tumblePhase ? styles.stateActive : styles.stateInactive}>
                {currentPattern.tumblePhase ? '✅' : '⭕'}
              </Text>
            </View>
            <View style={styles.stateItem}>
              <Text style={styles.stateLabel}>Impact Phase</Text>
              <Text style={currentPattern.impactPhase ? styles.stateActive : styles.stateInactive}>
                {currentPattern.impactPhase ? '✅' : '⭕'}
              </Text>
            </View>
          </View>
          <Text style={styles.confidenceText}>
            Confidence: {(currentPattern.confidence * 100).toFixed(1)}%
          </Text>
          <Text style={styles.bufferText}>
            Buffers: Accel({bufferSizes.accelerometer}) Gyro({bufferSizes.gyroscope})
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestDetection}
        >
          <Text style={styles.buttonText}>🧪 Test Detection System</Text>
        </TouchableOpacity>
      </View>

      {/* Last Impact Time */}
      {lastImpactTime > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Impact</Text>
          <Text style={styles.timeText}>
            {new Date(lastImpactTime).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Detection History */}
      {detectionHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Detections</Text>
          {detectionHistory.slice(0, 3).map((event, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyTime}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </Text>
              <Text style={styles.historySeverity}>
                Severity: {event.severity}
              </Text>
              <Text style={styles.historyConfidence}>
                Confidence: {(event.pattern.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Reporting Status */}
      {isReporting && (
        <View style={styles.section}>
          <Text style={styles.reportingText}>📡 Reporting impact...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  subtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  sensitivityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sensitivityButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  sensitivityButtonActive: {
    backgroundColor: '#007AFF',
  },
  sensitivityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  sensitivityButtonTextActive: {
    color: 'white',
  },
  stateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stateItem: {
    alignItems: 'center',
  },
  stateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  stateActive: {
    fontSize: 20,
    color: '#4CAF50',
  },
  stateInactive: {
    fontSize: 20,
    color: '#E0E0E0',
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  bufferText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
  },
  historyItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historySeverity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyConfidence: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reportingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default ImpactDetectionDemo;
