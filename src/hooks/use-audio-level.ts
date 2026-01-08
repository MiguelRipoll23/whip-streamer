import { useEffect, useState } from 'react';

const AUDIO_LEVEL_NORMALIZATION_DIVISOR = 40;

export function useAudioLevel(mediaStream: MediaStream | null): number {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!mediaStream) {
      setAudioLevel(0);
      return;
    }

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      setAudioLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(mediaStream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 512;

    microphone.connect(analyser);

    let animationId: number;

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalized = Math.min(average / AUDIO_LEVEL_NORMALIZATION_DIVISOR, 1);
      
      setAudioLevel(normalized);
      animationId = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      cancelAnimationFrame(animationId);
      microphone.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [mediaStream]);

  return audioLevel;
}
