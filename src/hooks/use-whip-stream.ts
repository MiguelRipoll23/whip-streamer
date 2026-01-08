import { useEffect, useRef, useState } from 'react';
import { WHIPClient, ConnectionState, ConnectionStats } from '@/lib/whip-client';

interface UseMediaStreamResult {
  mediaStream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
  hasPermission: boolean;
  requestPermissions: () => Promise<void>;
}

export function useMediaStream(facingMode: 'user' | 'environment' = 'user'): UseMediaStreamResult {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: facingMode },
        },
        audio: true,
      });

      setMediaStream(stream);
      setHasPermission(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera/microphone';
      setError(errorMessage);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
        // If we already have permission, re-request to handle facingMode changes
        // checking if stream exists to avoid double requests or initial empty request
        if(mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        requestPermissions();
    }
    
    return () => {
      // Cleanup is handled by the effect below or when component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
     return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return { mediaStream, videoRef, error, hasPermission, requestPermissions };
}

interface UseWHIPStreamConfig {
  baseUrl: string;
  appName: string;
  streamId: string;
  mediaStream: MediaStream | null;
}

interface UseWHIPStreamResult {
  connectionState: ConnectionState;
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  isStreaming: boolean;
  error: string | null;
  stats: ConnectionStats | null;
}

export function useWHIPStream(config: UseWHIPStreamConfig): UseWHIPStreamResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const whipClientRef = useRef<WHIPClient | null>(null);

  const startStreaming = async () => {
    if (!config.mediaStream) {
      setError('No media stream available');
      return;
    }

    try {
      setError(null);
      
      whipClientRef.current = new WHIPClient({
        baseUrl: config.baseUrl,
        appName: config.appName,
        streamId: config.streamId,
        onStateChange: setConnectionState,
        onError: setError,
        onStatsUpdate: setStats,
      });

      await whipClientRef.current.startStream(config.mediaStream);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start streaming';
      setError(errorMessage);
    }
  };

  const stopStreaming = () => {
    if (whipClientRef.current) {
      whipClientRef.current.stopStream();
      whipClientRef.current = null;
    }
    setError(null);
    setStats(null);
  };

  useEffect(() => {
    return () => {
      if (whipClientRef.current) {
        whipClientRef.current.stopStream();
      }
    };
  }, []);

  // Update media stream when it changes (e.g., camera flip)
  useEffect(() => {
    let aborted = false;
    
    const updateStream = async () => {
      if (whipClientRef.current && 
          whipClientRef.current.isStreaming() && 
          config.mediaStream && 
          !aborted) {
        try {
          await whipClientRef.current.updateMediaStream(config.mediaStream);
        } catch (err) {
          if (!aborted) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update media stream';
            setError(errorMessage);
          }
        }
      }
    };
    
    updateStream();
    
    return () => {
      aborted = true;
    };
  }, [config.mediaStream]);

  return {
    connectionState,
    startStreaming,
    stopStreaming,
    isStreaming: connectionState === 'connected' || connectionState === 'connecting' || connectionState === 'reconnecting',
    error,
    stats,
  };
}
