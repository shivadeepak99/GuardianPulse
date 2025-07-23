import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import io, { Socket } from 'socket.io-client';

interface UseAudioOptions {
  serverUrl: string;
  guardianId: string;
  enabled?: boolean;
}

interface AudioState {
  isRecording: boolean;
  isConnected: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

export const useAudio = ({ serverUrl, guardianId, enabled = false }: UseAudioOptions) => {
  const [state, setState] = useState<AudioState>({
    isRecording: false,
    isConnected: false,
    error: null,
    permissionStatus: 'undetermined',
  });

  const socketRef = useRef<Socket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    socketRef.current = io(serverUrl, {
      transports: ['websocket'],
      query: { guardianId },
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      console.log('Audio WebSocket connected');
    });

    socket.on('disconnect', () => {
      setState(prev => ({ ...prev, isConnected: false }));
      console.log('Audio WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      setState(prev => ({ ...prev, error: error.message, isConnected: false }));
      console.error('Audio WebSocket error:', error);
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
      const permissionStatus = status === 'granted' ? 'granted' : 'denied';
      setState(prev => ({ ...prev, permissionStatus }));
      return status === 'granted';
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request audio permissions',
        permissionStatus: 'denied'
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
      console.warn('Failed to configure audio session:', error);
    }
  };

  // Start continuous audio recording with chunks
  const startRecording = async () => {
    try {
      if (state.permissionStatus !== 'granted') {
        const granted = await requestPermissions();
        if (!granted) {
          setState(prev => ({ ...prev, error: 'Audio permission denied' }));
          return;
        }
      }

      await configureAudioSession();

      // Create recording instance
      const recording = new Audio.Recording();
      
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: '.m4a',
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

      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Start recording
      await recording.startAsync();
      console.log('Recording started');

      // Start continuous chunk processing
      startChunkProcessing();

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to start recording: ${error}`,
        isRecording: false 
      }));
      console.error('Recording error:', error);
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
              const base64Data = (reader.result as string).split(',')[1];
              
              // Send audio chunk via WebSocket
              socketRef.current.emit('audio-stream', {
                guardianId,
                audioData: base64Data,
                timestamp: Date.now(),
                format: 'm4a',
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
              extension: '.m4a',
              outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
              audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 32000,
            },
            ios: {
              extension: '.m4a',
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
        console.error('Chunk processing error:', error);
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
      setState(prev => ({ ...prev, isRecording: false }));

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

      console.log('Recording stopped');
    } catch (error) {
      setState(prev => ({ ...prev, error: `Failed to stop recording: ${error}` }));
      console.error('Stop recording error:', error);
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
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    requestPermissions,
  };
};
