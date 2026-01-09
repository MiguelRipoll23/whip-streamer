import { useMediaStream, useWHIPStream } from '@/hooks/use-whip-stream';
import { useAudioLevel } from '@/hooks/use-audio-level';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useCameraZoom } from '@/hooks/use-camera-zoom';
import { usePinchZoom } from '@/hooks/use-pinch-zoom';
import { StreamSettings } from '@/components/SettingsSheet';
import { STORAGE_KEY_SETTINGS } from '@/lib/constants';
import { Gear, CameraRotate, VideoCamera, VideoCameraSlash, Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsSheet } from '@/components/SettingsSheet';
import { DebugOverlay } from '@/components/DebugOverlay';
import { useState, useEffect, useRef } from 'react';

function App() {
  const [settings, setSettings] = useLocalStorage<StreamSettings>(STORAGE_KEY_SETTINGS, {
    baseUrl: 'https://raspberrypi.local:1990',
    streamId: `web-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    showDebug: false,
  });

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showInstruction, setShowInstruction] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  // PTT Logic
  const wasMutedOnPress = useRef(false);
  const pressStartTime = useRef(0);
  const hasStartedPress = useRef(false);

  const handleMicDown = (e: React.PointerEvent) => {
    e.preventDefault();
    hasStartedPress.current = true;
    wasMutedOnPress.current = isMuted;
    pressStartTime.current = Date.now();

    if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleMicUp = (e: React.PointerEvent) => {
    if (!hasStartedPress.current) return;
    e.preventDefault();
    hasStartedPress.current = false;
    
    const duration = Date.now() - pressStartTime.current;
    const isHold = duration > 200;

    if (wasMutedOnPress.current) {
      // Was muted
      if (isHold) {
        setIsMuted(true); // PTT finished
      }
      // Else: Toggle (stay unmuted)
    } else {
      // Was unmuted
      setIsMuted(true); // Toggle to mute
    }
  };

  const handleMicClick = (e: React.MouseEvent) => {
    // Only handle click if it wasn't part of a press gesture
    if (!hasStartedPress.current) {
      e.preventDefault();
      setIsMuted(!isMuted);
    }
  };

  const { mediaStream, videoRef, hasPermission, requestPermissions } = useMediaStream(facingMode);
  const audioLevel = useAudioLevel(mediaStream);
  
  const { capabilities, setZoom } = useCameraZoom({ mediaStream });
  
  usePinchZoom({
    enabled: capabilities.supported && hasPermission,
    onZoomChange: setZoom,
    minZoom: capabilities.min,
    maxZoom: capabilities.max,
  });
  
  const { 
    connectionState, 
    startStreaming, 
    stopStreaming, 
    isStreaming,
    stats,
  } = useWHIPStream({
    baseUrl: settings.baseUrl,
    appName: 'live',
    streamId: settings.streamId,
    mediaStream,
  });

  useEffect(() => {
    if (hasPermission && !isStreaming) {
      setShowInstruction(true);
      const timer = setTimeout(() => {
        setShowInstruction(false);
      }, 5000); // Increased time a bit since text is longer
      return () => clearTimeout(timer);
    }
  }, [hasPermission, isStreaming]);

  // Handle Mute/Camera Toggle
  useEffect(() => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      mediaStream.getVideoTracks().forEach(track => {
        track.enabled = isCameraEnabled;
      });
    }
  }, [mediaStream, isMuted, isCameraEnabled]);

  const handleToggleStream = async () => {
    if (!hasPermission || connectionState === 'connecting') return;
    
    if (isStreaming) {
      stopStreaming();
    } else {
      await startStreaming();
    }
  };

  const handleSettingsChange = (newSettings: StreamSettings) => {
    setSettings(newSettings);
  };

  const toggleCamera = () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  const toggleVideo = () => {
    setIsCameraEnabled(prev => !prev);
  };

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return { label: 'LIVE', color: 'bg-live/60', textColor: 'text-live-foreground', showDot: true };
      case 'reconnecting':
        return { label: 'RECONNECTING', color: 'bg-orange-500', textColor: 'text-white', showDot: false };
      case 'connecting':
        return { label: 'CONNECTING', color: 'bg-orange-500', textColor: 'text-white', showDot: false };
      default:
        return { label: 'OFFLINE', color: 'bg-muted/60', textColor: 'text-foreground', showDot: false };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div 
        className="relative w-full h-full touch-none select-none"
      >
        {hasPermission ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-background cursor-pointer"
            onClick={requestPermissions}
          >
            <div className="text-center space-y-3 px-6">
              <p className="text-lg font-semibold text-foreground">Tap to grant camera access</p>
              <p className="text-base text-muted-foreground">
                Camera and microphone permissions required
              </p>
            </div>
          </div>
        )}

        {/* Status Badge - Top Left */}
        {hasPermission && (
          <div className="absolute top-4 left-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${statusConfig.color} ${statusConfig.textColor} px-4 py-1.5 rounded-full font-mono text-base font-semibold tracking-wider flex items-center gap-2 backdrop-blur-sm`}
            >
              {statusConfig.showDot && (
                <motion.div
                  key="pulse"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-2 h-2 bg-live-foreground rounded-full animate-pulse"
                />
              )}
              {statusConfig.label}
            </motion.div>
          </div>
        )}

        {/* Debug Overlay - Top Right */}
        <AnimatePresence>
          {hasPermission && settings.showDebug && connectionState === 'connected' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-4 right-4 pointer-events-none"
            >
              <DebugOverlay stats={stats} audioLevel={audioLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start/Stop Streaming Ring Button - Bottom Center */}
        {hasPermission && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center justify-center">
              <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleStream}
                  className={`w-20 h-20 rounded-full border-[6px] backdrop-blur-sm flex items-center justify-center transition-colors ${
                      isStreaming 
                          ? 'border-red-500 bg-red-500/20' 
                          : 'border-white/50 bg-black/20 hover:bg-black/30'
                  }`}
              >
                  <div className={`w-14 h-14 rounded-full transition-all duration-300 ${
                      isStreaming ? 'bg-red-500 rounded-lg scale-50' : 'bg-red-500' 
                  }`} />
              </motion.button>
          </div>
        )}

        {/* Settings Button - Bottom Left */}
        <AnimatePresence>
          {!isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-8 left-8 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SettingsSheet 
                settings={settings} 
                onChange={handleSettingsChange}
                disabled={isStreaming}
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="bg-background/60 backdrop-blur-sm rounded-full p-3 flex items-center justify-center hover:bg-background/70 transition-colors"
                >
                  <Gear className="h-6 w-6 text-foreground" weight="bold" />
                </motion.button>
              </SettingsSheet>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Stack - Bottom Right */}
        {hasPermission && (
          <div 
            className="absolute bottom-8 right-8 pointer-events-auto flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enable/Disable Camera */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleVideo}
              className={`backdrop-blur-sm rounded-full p-3 flex items-center justify-center transition-colors ${
                  !isCameraEnabled ? 'bg-destructive/80 text-destructive-foreground' : 'bg-background/60 hover:bg-background/70 text-foreground'
              }`}
            >
              {isCameraEnabled ? (
                  <VideoCamera className="h-6 w-6" weight="fill" />
              ) : (
                  <VideoCameraSlash className="h-6 w-6" weight="fill" />
              )}
            </motion.button>

            {/* Flip Camera */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleCamera}
              className="bg-background/60 backdrop-blur-sm rounded-full p-3 flex items-center justify-center hover:bg-background/70 transition-colors"
            >
              <CameraRotate className="h-6 w-6 text-foreground" weight="bold" />
            </motion.button>

            {/* Mute/Unmute Mic */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onPointerDown={handleMicDown}
              onPointerUp={handleMicUp}
              onPointerLeave={handleMicUp}
              onClick={handleMicClick}
              className={`backdrop-blur-sm rounded-full p-3 flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-destructive/80 text-destructive-foreground' : 'bg-background/60 hover:bg-background/70 text-foreground'
              }`}
            >
              {isMuted ? (
                  <MicrophoneSlash className="h-6 w-6" weight="fill" />
              ) : (
                  <Microphone className="h-6 w-6" weight="fill" />
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
