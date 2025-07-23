import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Switch,
  Animated,
  Dimensions,
  PanResponder,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../src/contexts/SocketContext";
import { useLocation } from "../hooks/useLocation";
import { useAudio } from "../hooks/useAudio";

const { width } = Dimensions.get("window");

const DashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { isConnected, connectionStatus, emit } = useSocket();
  const {
    currentLocation,
    isTracking,
    hasPermission,
    error: locationError,
    requestPermissions,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
  } = useLocation();

  // Live audio streaming
  const {
    isRecording,
    isConnected: audioConnected,
    error: audioError,
    permissionStatus,
    startRecording,
    stopRecording,
    toggleRecording,
    requestPermissions: requestAudioPermissions,
  } = useAudio({
    serverUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001",
    guardianId: user?.id || "",
    enabled: isTracking, // Only enable when in Live Mode
  });

  const [isLive, setIsLive] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [showDetailedStatus, setShowDetailedStatus] = useState(false);

  // Secret gesture state for fake shutdown
  const [secretTapCount, setSecretTapCount] = useState(0);
  const secretTapTimer = useRef<NodeJS.Timeout | null>(null);
  const REQUIRED_TAPS = 5; // Require 5 rapid taps
  const TAP_TIMEOUT = 2000; // Reset after 2 seconds

  // Secret gesture handler - 5 rapid taps on the status area
  const handleSecretTap = () => {
    const newCount = secretTapCount + 1;
    setSecretTapCount(newCount);

    // Clear existing timer
    if (secretTapTimer.current) {
      clearTimeout(secretTapTimer.current);
    }

    if (newCount >= REQUIRED_TAPS) {
      // Secret gesture completed - navigate to fake shutdown
      setSecretTapCount(0);
      navigation.navigate("FakeShutdown" as never);
    } else {
      // Set timer to reset count
      secretTapTimer.current = setTimeout(() => {
        setSecretTapCount(0);
      }, TAP_TIMEOUT);
    }
  };

  // Update live mode state when tracking status changes
  useEffect(() => {
    setIsLive(isTracking);
  }, [isTracking]);

  // Pulse animation for live mode
  useEffect(() => {
    if (isLive) {
      const pulseEffect = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseEffect.start();

      return () => {
        pulseEffect.stop();
        pulseAnimation.setValue(1);
      };
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isLive, pulseAnimation]);

  // Handle Live Mode toggle
  const handleLiveModeToggle = async () => {
    if (!isLive) {
      // Starting Live Mode
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Location permission is required for Live Mode. Please enable it to protect your safety.",
            [{ text: "OK" }],
          );
          return;
        }
      }

      if (!isConnected) {
        Alert.alert(
          "Connection Required",
          "Internet connection is required for Live Mode. Please check your connection and try again.",
          [{ text: "OK" }],
        );
        return;
      }

      const success = await startLocationTracking();
      if (success) {
        // Emit start-live-session event
        emit("start-live-session", {
          userId: user?.id,
          timestamp: Date.now(),
          location: currentLocation,
        });

        // Request audio permissions and start streaming
        if (permissionStatus !== "granted") {
          await requestAudioPermissions();
        }

        // Auto-start audio streaming in Live Mode
        setTimeout(() => {
          startRecording();
        }, 1000); // Small delay to ensure everything is initialized

        Alert.alert(
          "Live Mode Activated",
          "You are now protected! Your guardians will receive real-time updates including location and audio.",
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Failed to Start Live Mode",
          "Unable to start location tracking. Please check your device settings and try again.",
          [{ text: "OK" }],
        );
      }
    } else {
      // Stopping Live Mode
      Alert.alert(
        "Stop Live Mode?",
        "Are you sure you want to stop Live Mode? Your guardians will no longer receive real-time updates.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Stop",
            style: "destructive",
            onPress: () => {
              stopLocationTracking();
              stopRecording(); // Stop audio streaming

              // Emit stop-live-session event
              emit("stop-live-session", {
                userId: user?.id,
                timestamp: Date.now(),
                finalLocation: currentLocation,
              });

              Alert.alert(
                "Live Mode Stopped",
                "Live Mode has been deactivated. Stay safe!",
                [{ text: "OK" }],
              );
            },
          },
        ],
      );
    }
  };

  // Get current location manually
  const handleGetCurrentLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      Alert.alert(
        "Current Location",
        `Latitude: ${location.latitude.toFixed(6)}\nLongitude: ${location.longitude.toFixed(6)}\nAccuracy: ${location.accuracy?.toFixed(0)}m`,
        [{ text: "OK" }],
      );
    } else {
      Alert.alert(
        "Location Error",
        "Unable to get current location. Please check your permissions and try again.",
        [{ text: "OK" }],
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // Stop location tracking before logout
          if (isTracking) {
            stopLocationTracking();
          }
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>

          {/* Status Display - Secret gesture area */}
          <TouchableOpacity
            style={styles.statusContainer}
            onPress={handleSecretTap}
            activeOpacity={1}
          >
            <Text
              style={[
                styles.statusText,
                isLive ? styles.statusLive : styles.statusSafe,
              ]}
            >
              Status: {isLive ? "Live & Protected" : "Safe"}
            </Text>
            {isLive && (
              <View style={styles.liveIndicator}>
                <Text style={styles.liveIndicatorText}>🔴 LIVE</Text>
              </View>
            )}
            {/* Visual feedback for secret gesture */}
            {secretTapCount > 0 && (
              <View style={styles.secretGestureIndicator}>
                <Text style={styles.secretGestureText}>
                  {Array(secretTapCount).fill("•").join("")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Live Mode Control */}
        <View style={styles.liveControlContainer}>
          <Animated.View
            style={[
              styles.liveModeButton,
              { transform: [{ scale: pulseAnimation }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.liveModeButtonInner,
                isLive
                  ? styles.liveModeButtonActive
                  : styles.liveModeButtonInactive,
              ]}
              onPress={handleLiveModeToggle}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.liveModeButtonText,
                  isLive ? styles.buttonTextActive : styles.buttonTextInactive,
                ]}
              >
                {isLive ? "STOP" : "GO LIVE"}
              </Text>
              <Text
                style={[
                  styles.liveModeSubtext,
                  isLive ? styles.subtextActive : styles.subtextInactive,
                ]}
              >
                {isLive ? "Tap to stop protection" : "Tap to start protection"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Connection & Location Status */}
        <View style={styles.quickStatusContainer}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Connection</Text>
              <View
                style={[
                  styles.statusDot,
                  isConnected ? styles.connectedDot : styles.disconnectedDot,
                ]}
              />
              <Text style={styles.statusValue}>
                {isConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Location</Text>
              <View
                style={[
                  styles.statusDot,
                  hasPermission ? styles.grantedDot : styles.deniedDot,
                ]}
              />
              <Text style={styles.statusValue}>
                {hasPermission ? "Enabled" : "Disabled"}
              </Text>
            </View>
          </View>

          {currentLocation && isLive && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                📍 {currentLocation.latitude.toFixed(4)},{" "}
                {currentLocation.longitude.toFixed(4)}
              </Text>
              <Text style={styles.locationAccuracy}>
                Accuracy: {currentLocation.accuracy?.toFixed(0)}m •{" "}
                {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>

        {/* Error Display */}
        {locationError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {locationError}</Text>
          </View>
        )}

        {/* Advanced Controls Toggle */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowDetailedStatus(!showDetailedStatus)}
        >
          <Text style={styles.advancedToggleText}>
            {showDetailedStatus
              ? "Hide Advanced Settings"
              : "Show Advanced Settings"}
          </Text>
        </TouchableOpacity>

        {/* Detailed Status (Collapsible) */}
        {showDetailedStatus && (
          <>
            {/* User Info Card */}
            <View style={styles.userCard}>
              <Text style={styles.cardTitle}>Account Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>

              {user?.phoneNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{user.phoneNumber}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role:</Text>
                <Text style={styles.infoValue}>{user?.role || "User"}</Text>
              </View>
            </View>

            {/* Connection Status Card */}
            <View style={styles.statusCard}>
              <Text style={styles.cardTitle}>Connection Details</Text>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Socket Connection:</Text>
                <View
                  style={[
                    styles.statusIndicator,
                    isConnected ? styles.connected : styles.disconnected,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Text>
                </View>
              </View>

              {connectionStatus.socketId && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Socket ID:</Text>
                  <Text style={styles.infoValue}>
                    {connectionStatus.socketId.substring(0, 8)}...
                  </Text>
                </View>
              )}
            </View>

            {/* Location Details Card */}
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Text style={styles.cardTitle}>Location Details</Text>
                <Switch
                  value={isLive}
                  onValueChange={() => handleLiveModeToggle()}
                  trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                  thumbColor={isLive ? "#FFFFFF" : "#9CA3AF"}
                />
              </View>

              <Text style={styles.locationDescription}>
                Advanced location tracking controls and information
              </Text>

              {currentLocation && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Latitude:</Text>
                    <Text style={styles.infoValue}>
                      {currentLocation.latitude.toFixed(6)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Longitude:</Text>
                    <Text style={styles.infoValue}>
                      {currentLocation.longitude.toFixed(6)}
                    </Text>
                  </View>

                  {currentLocation.accuracy && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Accuracy:</Text>
                      <Text style={styles.infoValue}>
                        {currentLocation.accuracy.toFixed(0)}m
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Update:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(currentLocation.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetCurrentLocation}
              >
                <Text style={styles.locationButtonText}>
                  Get Current Location
                </Text>
              </TouchableOpacity>
            </View>

            {/* Audio Streaming Card */}
            <View style={styles.audioCard}>
              <View style={styles.audioHeader}>
                <Text style={styles.cardTitle}>Live Audio Streaming</Text>
                <View
                  style={[
                    styles.statusIndicator,
                    audioConnected ? styles.connected : styles.disconnected,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {audioConnected ? "Connected" : "Disconnected"}
                  </Text>
                </View>
              </View>

              <Text style={styles.audioDescription}>
                Real-time audio streaming to your guardians during Live Mode
              </Text>

              <View style={styles.audioStatus}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Audio Permission:</Text>
                  <View
                    style={[
                      styles.statusIndicator,
                      permissionStatus === "granted"
                        ? styles.connected
                        : styles.disconnected,
                    ]}
                  >
                    <Text style={styles.statusText}>{permissionStatus}</Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Recording Status:</Text>
                  <View
                    style={[
                      styles.statusIndicator,
                      isRecording ? styles.recording : styles.stopped,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {isRecording ? "Recording" : "Stopped"}
                    </Text>
                  </View>
                </View>
              </View>

              {audioError && (
                <View style={styles.audioError}>
                  <Text style={styles.errorText}>⚠️ {audioError}</Text>
                </View>
              )}

              <View style={styles.audioControls}>
                <TouchableOpacity
                  style={[
                    styles.audioButton,
                    isRecording ? styles.stopButton : styles.startButton,
                  ]}
                  onPress={toggleRecording}
                  disabled={!isLive} // Only allow when in Live Mode
                >
                  <Text style={styles.audioButtonText}>
                    {isRecording ? "🛑 Stop Audio" : "🎤 Start Audio"}
                  </Text>
                </TouchableOpacity>

                {permissionStatus !== "granted" && (
                  <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestAudioPermissions}
                  >
                    <Text style={styles.permissionButtonText}>
                      Grant Audio Permission
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isLive && (
                <Text style={styles.audioNote}>
                  🛡️ Audio streaming is only available during Live Mode
                </Text>
              )}
            </View>
          </>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 32,
    paddingTop: 16,
  },
  welcomeText: {
    fontSize: 18,
    color: "#6B7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },

  // Status Display Styles
  statusContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  statusLive: {
    color: "#DC2626",
  },
  statusSafe: {
    color: "#059669",
  },
  liveIndicator: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  liveIndicatorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },

  // Live Mode Control Styles
  liveControlContainer: {
    alignItems: "center",
    marginVertical: 40,
  },
  liveModeButton: {
    width: width * 0.6,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  liveModeButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: width * 0.3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  liveModeButtonActive: {
    backgroundColor: "#DC2626",
  },
  liveModeButtonInactive: {
    backgroundColor: "#059669",
  },
  liveModeButtonText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  buttonTextActive: {
    color: "#FFFFFF",
  },
  buttonTextInactive: {
    color: "#FFFFFF",
  },
  liveModeSubtext: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  subtextActive: {
    color: "#FEE2E2",
  },
  subtextInactive: {
    color: "#D1FAE5",
  },

  // Quick Status Styles
  quickStatusContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusItem: {
    flex: 1,
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  connectedDot: {
    backgroundColor: "#059669",
  },
  disconnectedDot: {
    backgroundColor: "#DC2626",
  },
  grantedDot: {
    backgroundColor: "#059669",
  },
  deniedDot: {
    backgroundColor: "#DC2626",
  },
  statusValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },
  locationInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
  },
  locationAccuracy: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Advanced Toggle
  advancedToggle: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },

  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  infoValue: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
    textAlign: "right",
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Status and Location Card Styles
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  connected: {
    backgroundColor: "#10B981",
  },
  disconnected: {
    backgroundColor: "#EF4444",
  },
  granted: {
    backgroundColor: "#10B981",
  },
  denied: {
    backgroundColor: "#EF4444",
  },
  active: {
    backgroundColor: "#3B82F6",
  },
  inactive: {
    backgroundColor: "#9CA3AF",
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
  },
  locationButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Audio streaming styles
  audioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  audioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  audioDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  audioStatus: {
    marginBottom: 16,
  },
  audioError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  audioControls: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  audioButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#10B981",
  },
  stopButton: {
    backgroundColor: "#EF4444",
  },
  audioButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  permissionButton: {
    flex: 1,
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  audioNote: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
  recording: {
    backgroundColor: "#EF4444",
  },
  stopped: {
    backgroundColor: "#6B7280",
  },
  // Secret gesture visual feedback styles
  secretGestureIndicator: {
    position: "absolute",
    top: -8,
    right: 0,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  secretGestureText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
  },
});

export default DashboardScreen;
