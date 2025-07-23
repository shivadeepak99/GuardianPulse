import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  Vibration,
  TouchableOpacity,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/**
 * FakeShutdownScreen - Deceptive UI that mimics native power-off screen
 *
 * This screen looks identical to the OS power-off menu but triggers silent alerts
 * instead of actually shutting down the device. Critical for emergency situations
 * where the user needs to appear to comply with an attacker's demands.
 */
const FakeShutdownScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [slideValue] = useState(new Animated.Value(0));
  const [isSliding, setIsSliding] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);

  // Platform-specific styling
  const isIOS = Platform.OS === "ios";

  useEffect(() => {
    // Hide status bar for authentic look
    StatusBar.setHidden(true, "fade");

    // Cleanup on unmount
    return () => {
      StatusBar.setHidden(false, "fade");
    };
  }, []);

  /**
   * Trigger fake shutdown alert and simulate power off
   */
  const triggerFakeShutdownAlert = async () => {
    if (alertTriggered) return;

    try {
      setAlertTriggered(true);

      // Vibrate to provide subtle feedback
      Vibration.vibrate(100);

      // Send silent alert to backend
      await api.post("/incidents/fake-shutdown", {
        timestamp: Date.now(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        location: null, // Will be filled by backend if location permission granted
        triggerMethod: "slide_to_power_off",
        metadata: {
          screenResolution: `${screenWidth}x${screenHeight}`,
          userAgent: Platform.OS,
        },
      });

      console.log("🔇 Fake shutdown alert sent silently");

      // Navigate to black screen after brief delay
      setTimeout(() => {
        navigation.navigate("BlackScreen" as never);
      }, 1500);
    } catch (error) {
      console.error("Failed to send fake shutdown alert:", error);
      // Still navigate to black screen even if alert fails
      setTimeout(() => {
        navigation.navigate("BlackScreen" as never);
      }, 1500);
    }
  };

  /**
   * Handle slide gesture
   */
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: slideValue } }],
    { useNativeDriver: false },
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      setIsSliding(true);
    } else if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      const slideThreshold = screenWidth * 0.6; // 60% of screen width

      if (translationX > slideThreshold) {
        // User completed the slide - trigger fake shutdown
        Animated.timing(slideValue, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          triggerFakeShutdownAlert();
        });
      } else {
        // Slide not completed - reset
        Animated.spring(slideValue, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        setIsSliding(false);
      }
    }
  };

  if (isIOS) {
    return (
      <IOSFakeShutdownScreen
        slideValue={slideValue}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        isSliding={isSliding}
      />
    );
  } else {
    return (
      <AndroidFakeShutdownScreen
        slideValue={slideValue}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        isSliding={isSliding}
      />
    );
  }
};

/**
 * iOS-style fake shutdown screen
 */
const IOSFakeShutdownScreen: React.FC<{
  slideValue: Animated.Value;
  onGestureEvent: any;
  onHandlerStateChange: any;
  isSliding: boolean;
}> = ({ slideValue, onGestureEvent, onHandlerStateChange, isSliding }) => {
  return (
    <View style={[styles.container, { backgroundColor: "#1a1a1a" }]}>
      {/* Cancel button */}
      <TouchableOpacity style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      {/* Power icon */}
      <View style={styles.powerIconContainer}>
        <Ionicons name="power" size={60} color="#ffffff" />
      </View>

      {/* Slide to power off */}
      <View style={styles.slideContainer}>
        <View style={styles.slideTrack}>
          <Text style={styles.slideText}>slide to power off</Text>

          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.slider,
                {
                  transform: [{ translateX: slideValue }],
                },
              ]}
            >
              <View style={styles.sliderButton}>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </View>

      {/* Emergency SOS */}
      <View style={styles.emergencyContainer}>
        <Text style={styles.emergencyText}>Emergency SOS</Text>
        <Text style={styles.emergencySubtext}>
          Press and hold the side button and either volume button to call
          emergency services
        </Text>
      </View>
    </View>
  );
};

/**
 * Android-style fake shutdown screen
 */
const AndroidFakeShutdownScreen: React.FC<{
  slideValue: Animated.Value;
  onGestureEvent: any;
  onHandlerStateChange: any;
  isSliding: boolean;
}> = ({ slideValue, onGestureEvent, onHandlerStateChange, isSliding }) => {
  return (
    <View style={[styles.container, { backgroundColor: "#000000" }]}>
      {/* Power off text */}
      <View style={styles.androidHeader}>
        <Text style={styles.androidTitle}>Power off</Text>
        <Text style={styles.androidSubtitle}>Your phone will shut down</Text>
      </View>

      {/* Slide area */}
      <View style={styles.androidSlideContainer}>
        <View style={styles.androidSlideTrack}>
          <Text style={styles.androidSlideText}>Slide to power off</Text>

          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.androidSlider,
                {
                  transform: [{ translateX: slideValue }],
                },
              ]}
            >
              <View style={styles.androidSliderButton}>
                <Ionicons name="power" size={24} color="#ffffff" />
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </View>

      {/* Cancel area */}
      <View style={styles.androidCancelContainer}>
        <Text style={styles.androidCancelText}>Tap outside to cancel</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  // iOS Styles
  cancelButton: {
    position: "absolute",
    top: 60,
    right: 20,
  },
  cancelText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "400",
  },
  powerIconContainer: {
    marginBottom: 80,
  },
  slideContainer: {
    width: "100%",
    marginBottom: 60,
  },
  slideTrack: {
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  slideText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  slider: {
    position: "absolute",
    left: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sliderButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff3b30",
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emergencyText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 10,
  },
  emergencySubtext: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  // Android Styles
  androidHeader: {
    alignItems: "center",
    marginBottom: 80,
  },
  androidTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "400",
    marginBottom: 8,
  },
  androidSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
  },
  androidSlideContainer: {
    width: "100%",
    marginBottom: 100,
  },
  androidSlideTrack: {
    height: 70,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  androidSlideText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "400",
  },
  androidSlider: {
    position: "absolute",
    left: 5,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  androidSliderButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff5722",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  androidCancelContainer: {
    alignItems: "center",
  },
  androidCancelText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
});

export default FakeShutdownScreen;
