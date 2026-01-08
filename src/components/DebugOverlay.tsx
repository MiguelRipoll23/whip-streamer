import { ConnectionStats } from '@/lib/whip-client';
import { motion } from 'framer-motion';

interface DebugOverlayProps {
  stats: ConnectionStats | null;
  audioLevel: number;
}

export function DebugOverlay({ stats, audioLevel }: DebugOverlayProps) {
  if (!stats) return null;

  const formatBitrate = (bitrate: number): string => {
    if (bitrate === 0) return '0 bps';
    
    const kbps = bitrate / 1000;
    if (kbps < 1000) {
      return `${kbps.toFixed(1)} kbps`;
    }
    
    const mbps = kbps / 1000;
    return `${mbps.toFixed(2)} Mbps`;
  };

  const getQualityColor = (packetLoss: number): string => {
    if (packetLoss < 1) return 'text-success';
    if (packetLoss < 5) return 'text-connecting';
    return 'text-destructive';
  };

  const getQualityLabel = (packetLoss: number): string => {
    if (packetLoss < 1) return 'Excellent';
    if (packetLoss < 3) return 'Good';
    if (packetLoss < 5) return 'Fair';
    return 'Poor';
  };

  const audioLevelPercent = Math.min(audioLevel * 100, 100);

  const getAudioLevelColor = (level: number): string => {
    if (level < 60) return 'bg-success';
    if (level < 85) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-background/40 backdrop-blur-sm rounded-lg p-3 font-mono text-base space-y-2 min-w-[260px]"
    >
        <div className="flex items-center justify-between">
          <span className="text-white/70">Quality</span>
          <span className={`font-semibold ${getQualityColor(stats.packetLoss)}`}>
            {getQualityLabel(stats.packetLoss)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/70">Bitrate</span>
          <span className="text-white font-semibold">
            {formatBitrate(stats.bitrate)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/70">Latency</span>
          <span className="text-white font-semibold">
            {stats.latency > 0 ? `${stats.latency.toFixed(0)} ms` : '-- ms'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/70">Packet Loss</span>
          <span className={`font-semibold ${getQualityColor(stats.packetLoss)}`}>
            {stats.packetLoss.toFixed(2)}%
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Audio Level</span>
            <span className="text-white font-semibold">
              {audioLevelPercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getAudioLevelColor(audioLevelPercent)}`}
              initial={{ width: 0 }}
              animate={{ width: `${audioLevelPercent}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </motion.div>
  );
}
