import { Badge } from '@/components/ui/badge';
import { ConnectionState } from '@/lib/whip-client';
import { Circle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          label: 'LIVE',
          className: 'bg-success text-success-foreground',
          showPulse: true,
        };
      case 'connecting':
        return {
          label: 'CONNECTING',
          className: 'bg-yellow-600 text-white',
          showPulse: true,
        };
      case 'error':
        return {
          label: 'ERROR',
          className: 'bg-destructive text-destructive-foreground',
          showPulse: false,
        };
      case 'disconnected':
      default:
        return {
          label: 'OFFLINE',
          className: 'bg-muted text-muted-foreground',
          showPulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={`${config.className} font-semibold tracking-wider px-4 py-1.5 flex items-center gap-2`}>
      {config.showPulse ? (
        <motion.div
          animate={{
            opacity: [1, 0.4, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Circle weight="fill" className="h-3 w-3" />
        </motion.div>
      ) : (
        <Circle weight="fill" className="h-3 w-3" />
      )}
      {config.label}
    </Badge>
  );
}
