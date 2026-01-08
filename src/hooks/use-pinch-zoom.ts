import { useEffect, useRef, useState } from 'react';

interface UsePinchZoomOptions {
  enabled?: boolean;
  onZoomChange?: (zoomLevel: number) => Promise<boolean> | void;
  minZoom?: number;
  maxZoom?: number;
}

export function usePinchZoom({
  enabled = true,
  onZoomChange,
  minZoom = 1,
  maxZoom = 10,
}: UsePinchZoomOptions = {}) {
  const [currentZoom, setCurrentZoom] = useState(minZoom);
  const initialDistanceRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(minZoom);

  // Reset current zoom when min/max bounds change
  useEffect(() => {
    setCurrentZoom(minZoom);
  }, [minZoom, maxZoom]);

  useEffect(() => {
    if (!enabled) return;

    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistanceRef.current = getDistance(e.touches);
        initialZoomRef.current = currentZoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistanceRef.current > 0) {
        e.preventDefault();
        
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistanceRef.current;
        
        let newZoom = initialZoomRef.current * scale;
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        setCurrentZoom(newZoom);
        // Fire and forget - we don't want to block gesture handling on async operations
        void onZoomChange?.(newZoom);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistanceRef.current = 0;
      }
    };

    // Note: Using document-level listeners is intentional for this full-screen camera app
    // to ensure pinch gestures work anywhere on the screen
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onZoomChange, minZoom, maxZoom]);

  const resetZoom = () => {
    const resetLevel = Math.max(1, minZoom);
    setCurrentZoom(resetLevel);
    // Fire and forget - we don't want to block on async operations
    void onZoomChange?.(resetLevel);
  };

  return {
    currentZoom,
    resetZoom,
  };
}
