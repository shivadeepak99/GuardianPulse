import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Audio Queue Item Interface
 */
interface AudioQueueItem {
  buffer: AudioBuffer;
  timestamp: number;
}

/**
 * Live Audio Hook State Interface
 */
interface LiveAudioState {
  isConnected: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  error: string | null;
}

/**
 * Live Audio Hook Return Interface
 */
interface UseLiveAudioReturn extends LiveAudioState {
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  connect: (token: string) => void;
  disconnect: () => void;
}

/**
 * Custom Hook for Live Audio Playback
 * 
 * Manages real-time audio streaming from Ward devices to Guardian dashboard.
 * Uses Web Audio API for low-latency buffering and seamless playback.
 */
export const useLiveAudio = (): UseLiveAudioReturn => {
  // Audio Context and Nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // Audio Queue Management
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const nextPlayTimeRef = useRef<number>(0);
  
  // Component State
  const [state, setState] = useState<LiveAudioState>({
    isConnected: false,
    isPlaying: false,
    isMuted: false,
    volume: 0.8,
    error: null
  });

  /**
   * Initialize Audio Context and Gain Node
   */
  const initializeAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create gain node for volume control
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = state.volume;
      }

      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      setState(prev => ({ ...prev, error: null }));
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize audio. Please check browser permissions.' 
      }));
    }
  }, [state.volume]);

  /**
   * Decode Base64 Audio Data to AudioBuffer
   */
  const decodeAudioData = useCallback(async (base64Data: string): Promise<AudioBuffer | null> => {
    try {
      if (!audioContextRef.current) {
        throw new Error('Audio context not initialized');
      }

      // Convert Base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const arrayBuffer = bytes.buffer;

      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      return audioBuffer;
      
    } catch (error) {
      console.error('Failed to decode audio data:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to decode audio data' 
      }));
      return null;
    }
  }, []);

  /**
   * Add Audio Buffer to Playback Queue
   */
  const addToQueue = useCallback((audioBuffer: AudioBuffer) => {
    const queueItem: AudioQueueItem = {
      buffer: audioBuffer,
      timestamp: Date.now()
    };
    
    audioQueueRef.current.push(queueItem);
    
    // Start playback if not already playing
    if (!isPlayingRef.current) {
      scheduleNextBuffer();
    }
  }, []);

  /**
   * Schedule Next Audio Buffer for Playback
   */
  const scheduleNextBuffer = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current || state.isMuted) {
      return;
    }

    const queue = audioQueueRef.current;
    if (queue.length === 0) {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    // Get next buffer from queue
    const queueItem = queue.shift()!;
    const audioBuffer = queueItem.buffer;

    try {
      // Create buffer source node
      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(gainNodeRef.current);

      // Calculate when to start playing
      const currentTime = audioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      
      // Start playback
      sourceNode.start(startTime);
      
      // Update next play time for gapless playback
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      
      // Mark as playing
      isPlayingRef.current = true;
      setState(prev => ({ ...prev, isPlaying: true }));

      // Schedule next buffer when this one ends
      sourceNode.onended = () => {
        scheduleNextBuffer();
      };

    } catch (error) {
      console.error('Failed to schedule audio buffer:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to play audio buffer' 
      }));
      
      // Try next buffer
      scheduleNextBuffer();
    }
  }, [state.isMuted]);

  /**
   * Handle Incoming Audio Chunk
   */
  const handleAudioChunk = useCallback(async (data: { audioData: string; timestamp: number }) => {
    try {
      const audioBuffer = await decodeAudioData(data.audioData);
      if (audioBuffer) {
        addToQueue(audioBuffer);
      }
    } catch (error) {
      console.error('Failed to handle audio chunk:', error);
    }
  }, [decodeAudioData, addToQueue]);

  /**
   * Connect to WebSocket for Audio Streaming
   */
  const connect = useCallback((token: string) => {
    try {
      // Initialize audio context first
      initializeAudioContext();

      // Connect to WebSocket
      const socket = io(process.env.VITE_API_URL || 'http://localhost:8080', {
        auth: { token },
        transports: ['websocket']
      });

      socket.on('connect', () => {
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        console.log('Connected to live audio stream');
      });

      socket.on('disconnect', () => {
        setState(prev => ({ ...prev, isConnected: false, isPlaying: false }));
        isPlayingRef.current = false;
        audioQueueRef.current = [];
        console.log('Disconnected from live audio stream');
      });

      socket.on('audio-chunk-received', handleAudioChunk);

      socket.on('connect_error', (error: Error) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          error: `Connection failed: ${error.message}` 
        }));
        console.error('WebSocket connection error:', error);
      });

      socketRef.current = socket;

    } catch (error) {
      console.error('Failed to connect to audio stream:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to audio stream' 
      }));
    }
  }, [initializeAudioContext, handleAudioChunk]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Stop playback and clear queue
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;

    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isPlaying: false 
    }));
  }, []);

  /**
   * Toggle Mute/Unmute
   */
  const toggleMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.isMuted;
      
      // Update gain node
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newMuted ? 0 : prev.volume;
      }
      
      // If unmuting and we have queued audio, start playback
      if (!newMuted && audioQueueRef.current.length > 0 && !isPlayingRef.current) {
        scheduleNextBuffer();
      }
      
      return { ...prev, isMuted: newMuted };
    });
  }, [scheduleNextBuffer]);

  /**
   * Set Volume Level
   */
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    setState(prev => {
      // Update gain node if not muted
      if (gainNodeRef.current && !prev.isMuted) {
        gainNodeRef.current.gain.value = clampedVolume;
      }
      
      return { ...prev, volume: clampedVolume };
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disconnect]);

  return {
    ...state,
    toggleMute,
    setVolume,
    connect,
    disconnect
  };
};
