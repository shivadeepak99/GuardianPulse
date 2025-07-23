import { useState, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import io, { Socket } from "socket.io-client";

interface UseAudioOptions {
  serverUrl: string;
  guardianId: string;
  enabled?: boolean;
}

interface AudioState {
  isRecording: boolean;
  isConnected: boolean;
  error: string | null;
  permissionStatus: "granted" | "denied" | "undetermined";
}

interface AudioChunk {
  data: string; // base64 encoded audio data
  timestamp: number;
  uri: string; // local file URI
}

const TOKEN_KEY = "guardian_pulse_token";

export const useAudio = ({
  serverUrl,
  guardianId,
  enabled = false,
}: UseAudioOptions) => {
  const [state, setState] = useState<AudioState>({
    isRecording: false,
    isConnected: false,
    error: null,
    permissionStatus: "undetermined",
  });

  const socketRef = useRef<Socket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Circular buffer for last 30 seconds of audio (30 chunks of 1 second each)
  const audioBufferRef = useRef<AudioChunk[]>([]);
  const BUFFER_SIZE = 30; // 30 seconds of audio chunks

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    socketRef.current = io(serverUrl, {
      transports: ["websocket"],
      query: { guardianId },
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
      console.log("Audio WebSocket connected");
    });

    socket.on("disconnect", () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      console.log("Audio WebSocket disconnected");
    });

    socket.on("connect_error", (error) => {
      setState((prev) => ({
        ...prev,
        error: error.message,
        isConnected: false,
      }));
      console.error("Audio WebSocket error:", error);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [serverUrl, guardianId, enabled]);

  // Request audio permissions
  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const permissionStatus = status === "granted" ? "granted" : "denied";
      setState((prev) => ({ ...prev, permissionStatus }));
      return status === "granted";
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to request audio permissions",
        permissionStatus: "denied",
      }));
      return false;
    }
  };

  // Configure audio session
  const configureAudioSession = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
      });
    } catch (error) {
      console.warn("Failed to configure audio session:", error);
    }
  };

  // Start continuous audio recording with chunks
  const startRecording = async () => {
    try {
      if (state.permissionStatus !== "granted") {
        const granted = await requestPermissions();
        if (!granted) {
          setState((prev) => ({ ...prev, error: "Audio permission denied" }));
          return;
        }
      }

      await configureAudioSession();

      // Create recording instance
      const recording = new Audio.Recording();

      const recordingOptions = {
        android: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_LOW,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };

      await recording.prepareToRecordAsync(recordingOptions);
      recordingRef.current = recording;

      setState((prev) => ({ ...prev, isRecording: true, error: null }));

      // Start recording
      await recording.startAsync();
      console.log("Recording started");

      // Start continuous chunk processing
      startChunkProcessing();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to start recording: ${error}`,
        isRecording: false,
      }));
      console.error("Recording error:", error);
    }
  };

  // Process audio in chunks and send via WebSocket
  const startChunkProcessing = () => {
    const processChunk = async () => {
      if (!recordingRef.current || !socketRef.current?.connected) {
        return;
      }

      try {
        // Stop current recording to get chunk
        const uri = await recordingRef.current.stopAndUnloadAsync();

        if (uri) {
          // Read audio file as base64
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onloadend = () => {
            if (reader.result && socketRef.current?.connected) {
              const base64Data = (reader.result as string).split(",")[1];

              // Add to circular buffer
              const audioChunk: AudioChunk = {
                data: base64Data,
                timestamp: Date.now(),
                uri: uri.uri || "", // Get the actual URI from the recording status
              };

              // Maintain circular buffer of last 30 seconds
              audioBufferRef.current.push(audioChunk);
              if (audioBufferRef.current.length > BUFFER_SIZE) {
                audioBufferRef.current.shift(); // Remove oldest chunk
              }

              // Send audio chunk via WebSocket
              socketRef.current.emit("audio-stream", {
                guardianId,
                audioData: base64Data,
                timestamp: Date.now(),
                format: "m4a",
                sampleRate: 16000,
                channels: 1,
              });
            }
          };

          reader.readAsDataURL(blob);
        }

        // Start next chunk if still recording
        if (state.isRecording) {
          const recording = new Audio.Recording();
          const recordingOptions = {
            android: {
              extension: ".m4a",
              outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
              audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 32000,
            },
            ios: {
              extension: ".m4a",
              outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
              audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_LOW,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 32000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {},
          };

          await recording.prepareToRecordAsync(recordingOptions);
          recordingRef.current = recording;
          await recording.startAsync();
        }
      } catch (error) {
        console.error("Chunk processing error:", error);
      }

      // Schedule next chunk processing
      if (state.isRecording) {
        recordingTimeoutRef.current = setTimeout(processChunk, 1000); // 1-second chunks
      }
    };

    // Start first chunk
    recordingTimeoutRef.current = setTimeout(processChunk, 1000);
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      setState((prev) => ({ ...prev, isRecording: false }));

      // Clear chunk processing timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      // Stop and cleanup recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      console.log("Recording stopped");
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to stop recording: ${error}`,
      }));
      console.error("Stop recording error:", error);
    }
  };

  // Toggle recording
  const toggleRecording = async () => {
    if (state.isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // Upload buffered audio to S3 and associate with incident
  const uploadBufferedAudio = async (incidentId: string): Promise<boolean> => {
    try {
      if (audioBufferRef.current.length === 0) {
        console.warn("No audio data in buffer to upload");
        return false;
      }

      // Get authentication token
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        console.error("No authentication token found");
        setState((prev) => ({
          ...prev,
          error: "Authentication required for evidence upload",
        }));
        return false;
      }

      // Combine all buffered audio chunks into a single blob
      const combinedAudioData = audioBufferRef.current
        .map((chunk) => chunk.data)
        .join("");

      // Convert base64 to blob
      const binaryString = atob(combinedAudioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: "audio/mp4" });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `emergency-audio-${guardianId}-${timestamp}.m4a`;

      // Step 1: Get pre-signed upload URL
      const uploadUrlResponse = await fetch(
        `${serverUrl}/api/v1/evidence/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName,
            fileType: "audio/mp4",
            fileSize: audioBlob.size,
          }),
        },
      );

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json().catch(() => ({}));
        throw new Error(
          `Failed to get upload URL: ${uploadUrlResponse.status} - ${errorData.message || "Unknown error"}`,
        );
      }

      const uploadUrlData = await uploadUrlResponse.json();
      const { uploadUrl, fileKey } = uploadUrlData.data;

      // Step 2: Upload audio to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "audio/mp4",
        },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload audio to S3: ${uploadResponse.status}`,
        );
      }

      // Step 3: Associate evidence with incident
      const associateResponse = await fetch(
        `${serverUrl}/api/v1/incidents/${incidentId}/associate-evidence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            storageUrl: fileKey,
            type: "AUDIO",
            description: `Emergency audio recording from ${new Date().toISOString()} - ${audioBufferRef.current.length} seconds of buffered audio`,
          }),
        },
      );

      if (!associateResponse.ok) {
        const errorData = await associateResponse.json().catch(() => ({}));
        throw new Error(
          `Failed to associate evidence: ${associateResponse.status} - ${errorData.message || "Unknown error"}`,
        );
      }

      console.log(
        "Successfully uploaded and associated emergency audio evidence",
        {
          fileName,
          fileKey,
          incidentId,
          bufferSize: audioBufferRef.current.length,
          audioSize: audioBlob.size,
        },
      );

      return true;
    } catch (error) {
      console.error("Error uploading buffered audio:", error);
      setState((prev) => ({
        ...prev,
        error: `Failed to upload evidence: ${error instanceof Error ? error.message : "Unknown error"}`,
      }));
      return false;
    }
  };

  // Get current buffer size (for debugging/monitoring)
  const getBufferSize = (): number => {
    return audioBufferRef.current.length;
  };

  // Clear audio buffer
  const clearBuffer = (): void => {
    audioBufferRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Clear buffer on cleanup
      audioBufferRef.current = [];
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    requestPermissions,
    uploadBufferedAudio,
    getBufferSize,
    clearBuffer,
  };
};
