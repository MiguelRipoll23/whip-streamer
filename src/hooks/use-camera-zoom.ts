import { useEffect, useState } from 'react';

interface UseCameraZoomOptions {
  mediaStream: MediaStream | null;
}

interface CameraZoomCapabilities {
  supported: boolean;
  min: number;
  max: number;
  step: number;
  current: number;
}

interface MediaTrackCapabilitiesWithZoom extends MediaTrackCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
}

interface MediaTrackConstraintSetWithZoom extends MediaTrackConstraintSet {
  zoom?: number;
}

export function useCameraZoom({ mediaStream }: UseCameraZoomOptions) {
  const [capabilities, setCapabilities] = useState<CameraZoomCapabilities>({
    supported: false,
    min: 1,
    max: 1,
    step: 0.1,
    current: 1,
  });

  useEffect(() => {
    if (!mediaStream) {
      setCapabilities({
        supported: false,
        min: 1,
        max: 1,
        step: 0.1,
        current: 1,
      });
      return;
    }

    const videoTrack = mediaStream.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }

    // Check if zoom is supported
    const trackCapabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilitiesWithZoom | undefined;
    
    if (trackCapabilities && trackCapabilities.zoom) {
      const zoomCapabilities = trackCapabilities.zoom;
      const currentZoom = videoTrack.getSettings().zoom;
      
      setCapabilities({
        supported: true,
        min: zoomCapabilities.min ?? 1,
        max: zoomCapabilities.max ?? 1,
        step: zoomCapabilities.step ?? 0.1,
        current: currentZoom ?? zoomCapabilities.min ?? 1,
      });
    } else {
      setCapabilities({
        supported: false,
        min: 1,
        max: 1,
        step: 0.1,
        current: 1,
      });
    }
  }, [mediaStream]);

  const setZoom = async (zoomLevel: number) => {
    if (!mediaStream || !capabilities.supported) {
      return false;
    }

    const videoTrack = mediaStream.getVideoTracks()[0];
    if (!videoTrack) {
      return false;
    }

    try {
      const clampedZoom = Math.max(
        capabilities.min,
        Math.min(capabilities.max, zoomLevel)
      );

      const constraints: MediaTrackConstraintSetWithZoom = {
        zoom: clampedZoom,
      };

      await videoTrack.applyConstraints({
        advanced: [constraints],
      });

      setCapabilities(prev => ({
        ...prev,
        current: clampedZoom,
      }));

      return true;
    } catch (error) {
      console.error('Failed to apply zoom:', error);
      return false;
    }
  };

  const resetZoom = async () => {
    // Reset to 1 or the minimum zoom level, whichever is higher
    const resetLevel = Math.max(1, capabilities.min);
    return setZoom(resetLevel);
  };

  return {
    capabilities,
    setZoom,
    resetZoom,
  };
}
