/**
 * Evidence Upload Integration Demo
 *
 * This file demonstrates how to integrate the evidence upload functionality
 * with incident detection in the GuardianPulse mobile app.
 */

import React, { useEffect, useState } from "react";
import { View, Text, Alert, Button, StyleSheet } from "react-native";
import { useAudio } from "../hooks/useAudio";
import { useImpactDetector } from "../hooks/useImpactDetector";
import { useAuth } from "../contexts/AuthContext";

interface EvidenceUploadDemoProps {
  serverUrl: string;
}

export const EvidenceUploadDemo: React.FC<EvidenceUploadDemoProps> = ({
  serverUrl,
}) => {
  const { user } = useAuth();
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Initialize audio recording with buffering
  const {
    isRecording,
    startRecording,
    stopRecording,
    uploadBufferedAudio,
    getBufferSize,
    clearBuffer,
    error: audioError,
  } = useAudio({
    serverUrl,
    guardianId: user?.id || "",
    enabled: isLiveMode,
  });

  // Handle impact detection and automatic evidence upload
  const handleImpactDetected = async (impactEvent: any) => {
    console.log("Impact detected!", impactEvent);
    setUploadStatus("Impact detected! Creating incident...");

    try {
      // Step 1: Create an incident in the backend
      const incidentResponse = await fetch(`${serverUrl}/api/v1/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          type: "THROWN_AWAY",
          location: {
            latitude: 37.7749, // This would come from actual location service
            longitude: -122.4194,
          },
          description: `Automatic incident detected - Impact severity: ${impactEvent.severity}`,
        }),
      });

      if (!incidentResponse.ok) {
        throw new Error(
          `Failed to create incident: ${incidentResponse.status}`,
        );
      }

      const incidentData = await incidentResponse.json();
      const incidentId = incidentData.data.id;
      setLastIncidentId(incidentId);
      setUploadStatus(`Incident created: ${incidentId}. Uploading evidence...`);

      // Step 2: Upload buffered audio evidence
      const uploadSuccess = await uploadBufferedAudio(incidentId);

      if (uploadSuccess) {
        setUploadStatus(
          `✅ Evidence uploaded successfully for incident ${incidentId}`,
        );

        // Show success alert
        Alert.alert(
          "Emergency Evidence Uploaded",
          `Your last ${getBufferSize()} seconds of audio have been automatically uploaded as evidence for the detected incident.`,
          [{ text: "OK" }],
        );

        // Clear buffer after successful upload
        clearBuffer();
      } else {
        setUploadStatus(
          `❌ Failed to upload evidence for incident ${incidentId}`,
        );
        Alert.alert(
          "Upload Failed",
          "Failed to upload evidence. The incident has been logged but no audio evidence was saved.",
        );
      }
    } catch (error) {
      console.error("Error handling impact detection:", error);
      setUploadStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      Alert.alert("Error", "Failed to process the detected incident.");
    }
  };

  // Helper function to get auth token
  const getAuthToken = async (): Promise<string> => {
    // This would typically come from AsyncStorage or auth context
    const { getToken } = require("@react-native-async-storage/async-storage");
    return await getToken("guardian_pulse_token");
  };

  // Initialize impact detector
  const { isMonitoring, startMonitoring, stopMonitoring } = useImpactDetector({
    isLiveMode,
    onImpactDetected: handleImpactDetected,
    sensitivity: "medium",
    debugMode: true,
  });

  // Start/stop live mode with automatic monitoring
  const toggleLiveMode = async () => {
    if (!isLiveMode) {
      // Starting live mode
      setIsLiveMode(true);
      await startRecording(); // Start audio buffering
      startMonitoring(); // Start impact detection
      setUploadStatus(
        "🟢 Live mode active - Audio buffering and impact monitoring enabled",
      );
    } else {
      // Stopping live mode
      setIsLiveMode(false);
      await stopRecording(); // Stop audio recording
      stopMonitoring(); // Stop impact detection
      setUploadStatus("🔴 Live mode disabled");
    }
  };

  // Manual evidence upload for testing
  const manualUpload = async () => {
    if (!lastIncidentId) {
      Alert.alert(
        "No Incident",
        "Please create an incident first or trigger impact detection.",
      );
      return;
    }

    setUploadStatus("Manually uploading evidence...");
    const success = await uploadBufferedAudio(lastIncidentId);

    if (success) {
      setUploadStatus(
        `✅ Manual upload successful for incident ${lastIncidentId}`,
      );
    } else {
      setUploadStatus(`❌ Manual upload failed for incident ${lastIncidentId}`);
    }
  };

  // Manual incident creation for testing
  const createTestIncident = async () => {
    try {
      setUploadStatus("Creating test incident...");

      const response = await fetch(`${serverUrl}/api/v1/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          type: "MANUAL_SOS",
          location: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
          description: "Test incident for evidence upload demo",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create test incident: ${response.status}`);
      }

      const data = await response.json();
      setLastIncidentId(data.data.id);
      setUploadStatus(`✅ Test incident created: ${data.data.id}`);
    } catch (error) {
      console.error("Error creating test incident:", error);
      setUploadStatus(
        `❌ Failed to create test incident: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Evidence Upload Integration Demo</Text>

      {/* Status Display */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Live Mode:</Text>
        <Text
          style={[
            styles.statusValue,
            isLiveMode ? styles.active : styles.inactive,
          ]}
        >
          {isLiveMode ? "ACTIVE" : "INACTIVE"}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Audio Recording:</Text>
        <Text
          style={[
            styles.statusValue,
            isRecording ? styles.active : styles.inactive,
          ]}
        >
          {isRecording ? "RECORDING" : "STOPPED"}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Impact Monitoring:</Text>
        <Text
          style={[
            styles.statusValue,
            isMonitoring ? styles.active : styles.inactive,
          ]}
        >
          {isMonitoring ? "MONITORING" : "STOPPED"}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Buffer Size:</Text>
        <Text style={styles.statusValue}>{getBufferSize()} seconds</Text>
      </View>

      {lastIncidentId && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Last Incident:</Text>
          <Text style={styles.statusValue}>{lastIncidentId}</Text>
        </View>
      )}

      {/* Upload Status */}
      <Text style={styles.uploadStatus}>{uploadStatus}</Text>

      {/* Error Display */}
      {audioError && (
        <Text style={styles.error}>Audio Error: {audioError}</Text>
      )}

      {/* Controls */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLiveMode ? "Stop Live Mode" : "Start Live Mode"}
          onPress={toggleLiveMode}
          color={isLiveMode ? "#EF4444" : "#10B981"}
        />

        <Button
          title="Create Test Incident"
          onPress={createTestIncident}
          color="#3B82F6"
        />

        <Button
          title="Manual Upload Evidence"
          onPress={manualUpload}
          disabled={!lastIncidentId || getBufferSize() === 0}
          color="#F59E0B"
        />

        <Button title="Clear Buffer" onPress={clearBuffer} color="#6B7280" />
      </View>

      {/* Usage Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>How to Test:</Text>
        <Text style={styles.instruction}>
          1. Start Live Mode to begin audio buffering
        </Text>
        <Text style={styles.instruction}>
          2. Create a test incident or trigger impact detection
        </Text>
        <Text style={styles.instruction}>
          3. Evidence will automatically upload when impact is detected
        </Text>
        <Text style={styles.instruction}>
          4. Or use manual upload to test with existing incident
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1F2937",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  active: {
    color: "#10B981",
  },
  inactive: {
    color: "#6B7280",
  },
  uploadStatus: {
    fontSize: 14,
    marginVertical: 16,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    color: "#374151",
  },
  error: {
    fontSize: 14,
    color: "#EF4444",
    marginVertical: 8,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  buttonContainer: {
    marginVertical: 20,
    gap: 12,
  },
  instructionsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1E40AF",
  },
  instruction: {
    fontSize: 14,
    marginBottom: 4,
    color: "#1E3A8A",
  },
});

export default EvidenceUploadDemo;
