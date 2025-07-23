import { useEffect, useRef, useState, useCallback } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Subscription } from 'expo-sensors/build/Pedometer';

/**
 * Types for sensor data and impact detection
 */
interface SensorReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface ImpactPattern {
  throwPhase: boolean;
  tumblePhase: boolean;
  impactPhase: boolean;
  confidence: number;
}

interface ImpactEvent {
  timestamp: number;
  accelerometerData: SensorReading[];
  gyroscopeData: SensorReading[];
  pattern: ImpactPattern;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface UseImpactDetectorProps {
  isLiveMode: boolean;
  onImpactDetected: (event: ImpactEvent) => void;
  sensitivity?: 'low' | 'medium' | 'high';
  debugMode?: boolean;
}

/**
 * Configuration thresholds for impact detection
 */
const IMPACT_THRESHOLDS = {
  low: {
    throwAcceleration: 15, // m/s²
    tumbleRotation: 3, // rad/s
    impactForce: 25, // m/s²
    patternDuration: 2000, // ms
  },
  medium: {
    throwAcceleration: 12,
    tumbleRotation: 2.5,
    impactForce: 20,
    patternDuration: 2500,
  },
  high: {
    throwAcceleration: 10,
    tumbleRotation: 2,
    impactForce: 15,
    patternDuration: 3000,
  },
};

/**
 * Advanced Impact Detection Hook
 * 
 * Detects "thrown-away" patterns by analyzing:
 * 1. Throw phase: High acceleration/deceleration
 * 2. Tumble phase: Chaotic rotational velocity
 * 3. Impact phase: Sharp spike in g-force
 */
export const useImpactDetector = ({
  isLiveMode,
  onImpactDetected,
  sensitivity = 'medium',
  debugMode = false,
}: UseImpactDetectorProps) => {
  // State management
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastImpactTime, setLastImpactTime] = useState(0);
  
  // Sensor subscriptions
  const accelerometerSubscription = useRef<Subscription | null>(null);
  const gyroscopeSubscription = useRef<Subscription | null>(null);
  
  // Data buffers for pattern analysis
  const accelerometerBuffer = useRef<SensorReading[]>([]);
  const gyroscopeBuffer = useRef<SensorReading[]>([]);
  
  // Pattern detection state
  const detectionState = useRef({
    isDetecting: false,
    throwStartTime: 0,
    tumbleStartTime: 0,
    impactStartTime: 0,
    patternData: {
      throwPhase: false,
      tumblePhase: false,
      impactPhase: false,
      confidence: 0,
    },
  });

  // Get configuration based on sensitivity
  const config = IMPACT_THRESHOLDS[sensitivity];

  /**
   * Calculate magnitude of 3D vector
   */
  const calculateMagnitude = useCallback((x: number, y: number, z: number): number => {
    return Math.sqrt(x * x + y * y + z * z);
  }, []);

  /**
   * Calculate moving average for smoothing
   */
  const calculateMovingAverage = useCallback((data: number[], windowSize: number): number => {
    if (data.length < windowSize) return data.reduce((a, b) => a + b, 0) / data.length;
    const window = data.slice(-windowSize);
    return window.reduce((a, b) => a + b, 0) / windowSize;
  }, []);

  /**
   * Detect throw phase: High acceleration/deceleration
   */
  const detectThrowPhase = useCallback((accelData: SensorReading[]): boolean => {
    if (accelData.length < 5) return false;

    const recentData = accelData.slice(-10);
    const magnitudes = recentData.map(reading => 
      calculateMagnitude(reading.x, reading.y, reading.z)
    );

    // Look for sudden acceleration spike
    const maxAccel = Math.max(...magnitudes);
    const avgAccel = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    
    // Check for acceleration significantly above gravity + threshold
    const throwDetected = maxAccel > (9.81 + config.throwAcceleration);
    
    if (debugMode && throwDetected) {
      console.log('🚀 Throw phase detected:', { maxAccel, avgAccel, threshold: config.throwAcceleration });
    }

    return throwDetected;
  }, [calculateMagnitude, config.throwAcceleration, debugMode]);

  /**
   * Detect tumble phase: Chaotic rotational motion
   */
  const detectTumblePhase = useCallback((gyroData: SensorReading[]): boolean => {
    if (gyroData.length < 5) return false;

    const recentData = gyroData.slice(-15);
    const rotationMagnitudes = recentData.map(reading =>
      calculateMagnitude(reading.x, reading.y, reading.z)
    );

    // Check for high rotational velocity
    const maxRotation = Math.max(...rotationMagnitudes);
    const avgRotation = rotationMagnitudes.reduce((a, b) => a + b, 0) / rotationMagnitudes.length;
    
    // Check for variability in rotation (chaotic motion)
    const variance = rotationMagnitudes.reduce((acc, val) => {
      return acc + Math.pow(val - avgRotation, 2);
    }, 0) / rotationMagnitudes.length;
    
    const standardDeviation = Math.sqrt(variance);
    
    // Tumble detected if high rotation and high variability
    const tumbleDetected = maxRotation > config.tumbleRotation && standardDeviation > 1.0;
    
    if (debugMode && tumbleDetected) {
      console.log('🌪️ Tumble phase detected:', { 
        maxRotation, 
        avgRotation, 
        standardDeviation,
        threshold: config.tumbleRotation 
      });
    }

    return tumbleDetected;
  }, [calculateMagnitude, config.tumbleRotation, debugMode]);

  /**
   * Detect impact phase: Sharp spike in accelerometer
   */
  const detectImpactPhase = useCallback((accelData: SensorReading[]): boolean => {
    if (accelData.length < 3) return false;

    const recentData = accelData.slice(-5);
    const magnitudes = recentData.map(reading =>
      calculateMagnitude(reading.x, reading.y, reading.z)
    );

    // Look for sudden, sharp impact
    const maxImpact = Math.max(...magnitudes);
    const previousMagnitudes = accelData.slice(-10, -5).map(reading =>
      calculateMagnitude(reading.x, reading.y, reading.z)
    );
    const avgPrevious = previousMagnitudes.length > 0 
      ? previousMagnitudes.reduce((a, b) => a + b, 0) / previousMagnitudes.length 
      : 0;

    // Impact detected if sudden spike above threshold
    const impactDetected = maxImpact > config.impactForce && 
                          maxImpact > (avgPrevious * 2);
    
    if (debugMode && impactDetected) {
      console.log('💥 Impact phase detected:', { 
        maxImpact, 
        avgPrevious, 
        threshold: config.impactForce 
      });
    }

    return impactDetected;
  }, [calculateMagnitude, config.impactForce, debugMode]);

  /**
   * Calculate pattern confidence based on timing and signal strength
   */
  const calculatePatternConfidence = useCallback((
    throwTime: number,
    tumbleTime: number,
    impactTime: number
  ): number => {
    const totalDuration = impactTime - throwTime;
    const tumbleDuration = impactTime - tumbleTime;

    // Ideal pattern timing (500ms throw -> 1000ms tumble -> impact)
    const idealThrowToTumble = 500;
    const idealTumbleDuration = 1000;
    const idealTotalDuration = 1500;

    // Calculate timing accuracy
    const throwToTumbleAccuracy = Math.max(0, 1 - Math.abs((tumbleTime - throwTime) - idealThrowToTumble) / idealThrowToTumble);
    const tumbleDurationAccuracy = Math.max(0, 1 - Math.abs(tumbleDuration - idealTumbleDuration) / idealTumbleDuration);
    const totalDurationAccuracy = Math.max(0, 1 - Math.abs(totalDuration - idealTotalDuration) / idealTotalDuration);

    // Weight the accuracies
    const confidence = (throwToTumbleAccuracy * 0.3 + tumbleDurationAccuracy * 0.4 + totalDurationAccuracy * 0.3);
    
    return Math.min(1, Math.max(0, confidence));
  }, []);

  /**
   * Determine impact severity based on sensor readings
   */
  const calculateImpactSeverity = useCallback((
    maxAcceleration: number,
    maxRotation: number,
    confidence: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    const severityScore = (maxAcceleration / 50) + (maxRotation / 10) + confidence;
    
    if (severityScore > 2.5) return 'CRITICAL';
    if (severityScore > 2.0) return 'HIGH';
    if (severityScore > 1.5) return 'MEDIUM';
    return 'LOW';
  }, []);

  /**
   * Process accelerometer data for pattern detection
   */
  const processAccelerometerData = useCallback((data: { x: number; y: number; z: number }) => {
    const timestamp = Date.now();
    const reading: SensorReading = { ...data, timestamp };
    
    // Add to buffer (keep last 100 readings ~2 seconds at 50Hz)
    accelerometerBuffer.current.push(reading);
    if (accelerometerBuffer.current.length > 100) {
      accelerometerBuffer.current.shift();
    }

    const state = detectionState.current;
    const currentTime = timestamp;

    // Reset detection if too much time has passed
    if (state.isDetecting && (currentTime - state.throwStartTime) > config.patternDuration) {
      state.isDetecting = false;
      state.patternData = { throwPhase: false, tumblePhase: false, impactPhase: false, confidence: 0 };
    }

    // Phase 1: Detect throw
    if (!state.isDetecting && !state.patternData.throwPhase) {
      if (detectThrowPhase(accelerometerBuffer.current)) {
        state.isDetecting = true;
        state.throwStartTime = currentTime;
        state.patternData.throwPhase = true;
        
        if (debugMode) {
          console.log('🎯 Throw phase initiated at:', new Date(currentTime).toISOString());
        }
      }
    }

    // Phase 3: Detect impact (requires throw phase to be active)
    if (state.isDetecting && state.patternData.throwPhase && !state.patternData.impactPhase) {
      if (detectImpactPhase(accelerometerBuffer.current)) {
        state.impactStartTime = currentTime;
        state.patternData.impactPhase = true;

        // Check if we have all phases for a complete pattern
        if (state.patternData.tumblePhase) {
          const confidence = calculatePatternConfidence(
            state.throwStartTime,
            state.tumbleStartTime,
            state.impactStartTime
          );

          state.patternData.confidence = confidence;

          // If confidence is high enough, trigger impact detection
          if (confidence > 0.6) {
            const maxAccel = Math.max(...accelerometerBuffer.current.slice(-5).map(r => 
              calculateMagnitude(r.x, r.y, r.z)
            ));
            const maxRotation = Math.max(...gyroscopeBuffer.current.slice(-5).map(r => 
              calculateMagnitude(r.x, r.y, r.z)
            ));

            const severity = calculateImpactSeverity(maxAccel, maxRotation, confidence);

            const impactEvent: ImpactEvent = {
              timestamp: currentTime,
              accelerometerData: [...accelerometerBuffer.current],
              gyroscopeData: [...gyroscopeBuffer.current],
              pattern: { ...state.patternData },
              severity,
            };

            // Trigger the callback
            onImpactDetected(impactEvent);
            setLastImpactTime(currentTime);

            if (debugMode) {
              console.log('🚨 IMPACT DETECTED!', {
                confidence,
                severity,
                duration: currentTime - state.throwStartTime,
              });
            }
          }

          // Reset detection state
          state.isDetecting = false;
          state.patternData = { throwPhase: false, tumblePhase: false, impactPhase: false, confidence: 0 };
        }
      }
    }
  }, [
    config.patternDuration,
    detectThrowPhase,
    detectImpactPhase,
    calculatePatternConfidence,
    calculateMagnitude,
    calculateImpactSeverity,
    onImpactDetected,
    debugMode,
  ]);

  /**
   * Process gyroscope data for tumble detection
   */
  const processGyroscopeData = useCallback((data: { x: number; y: number; z: number }) => {
    const timestamp = Date.now();
    const reading: SensorReading = { ...data, timestamp };
    
    // Add to buffer (keep last 100 readings)
    gyroscopeBuffer.current.push(reading);
    if (gyroscopeBuffer.current.length > 100) {
      gyroscopeBuffer.current.shift();
    }

    const state = detectionState.current;

    // Phase 2: Detect tumble (requires throw phase to be active)
    if (state.isDetecting && state.patternData.throwPhase && !state.patternData.tumblePhase) {
      if (detectTumblePhase(gyroscopeBuffer.current)) {
        state.tumbleStartTime = timestamp;
        state.patternData.tumblePhase = true;
        
        if (debugMode) {
          console.log('🌀 Tumble phase detected at:', new Date(timestamp).toISOString());
        }
      }
    }
  }, [detectTumblePhase, debugMode]);

  /**
   * Start sensor monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    // Set update intervals (50Hz for responsive detection)
    Accelerometer.setUpdateInterval(20);
    Gyroscope.setUpdateInterval(20);

    // Subscribe to accelerometer
    accelerometerSubscription.current = Accelerometer.addListener(processAccelerometerData);
    
    // Subscribe to gyroscope
    gyroscopeSubscription.current = Gyroscope.addListener(processGyroscopeData);

    setIsMonitoring(true);

    if (debugMode) {
      console.log('📱 Impact detection monitoring started');
    }
  }, [isMonitoring, processAccelerometerData, processGyroscopeData, debugMode]);

  /**
   * Stop sensor monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }

    if (gyroscopeSubscription.current) {
      gyroscopeSubscription.current.remove();
      gyroscopeSubscription.current = null;
    }

    setIsMonitoring(false);

    // Reset detection state
    detectionState.current = {
      isDetecting: false,
      throwStartTime: 0,
      tumbleStartTime: 0,
      impactStartTime: 0,
      patternData: { throwPhase: false, tumblePhase: false, impactPhase: false, confidence: 0 },
    };

    // Clear buffers
    accelerometerBuffer.current = [];
    gyroscopeBuffer.current = [];

    if (debugMode) {
      console.log('📱 Impact detection monitoring stopped');
    }
  }, [debugMode]);

  /**
   * Effect to manage monitoring based on live mode
   */
  useEffect(() => {
    if (isLiveMode) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isLiveMode, startMonitoring, stopMonitoring]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    isMonitoring,
    lastImpactTime,
    startMonitoring,
    stopMonitoring,
    currentPattern: detectionState.current.patternData,
    bufferSizes: {
      accelerometer: accelerometerBuffer.current.length,
      gyroscope: gyroscopeBuffer.current.length,
    },
  };
};

export default useImpactDetector;
