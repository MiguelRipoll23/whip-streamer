export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectionStats {
  bitrate: number;
  latency: number;
  packetLoss: number;
  jitter: number;
}

export interface WHIPClientConfig {
  baseUrl: string;
  appName: string;
  streamId: string;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: string) => void;
  onStatsUpdate?: (stats: ConnectionStats) => void;
}

export class WHIPClient {
  private pc: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;
  private config: WHIPClientConfig;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private shouldReconnect = true;
  private statsInterval: number | null = null;
  private lastStats: RTCStatsReport | null = null;
  private updateSequence = 0;

  constructor(config: WHIPClientConfig) {
    this.config = config;
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    this.config.onStateChange?.(newState);
  }

  private getWhipUrl(): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    return `${baseUrl}/rtc/v1/whip/?app=${encodeURIComponent(this.config.appName)}&stream=${encodeURIComponent(this.config.streamId)}`;
  }

  async startStream(mediaStream: MediaStream): Promise<void> {
    try {
      if (this.state !== 'reconnecting') {
        this.setState('connecting');
      }
      this.mediaStream = mediaStream;
      this.shouldReconnect = true;

      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.pc.oniceconnectionstatechange = () => {
        if (!this.pc) return;
        
        const iceState = this.pc.iceConnectionState;
        
        if (iceState === 'connected' || iceState === 'completed') {
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.startStatsCollection();
        } else if (iceState === 'failed' || iceState === 'disconnected') {
          this.stopStatsCollection();
          if (this.shouldReconnect && this.mediaStream) {
            this.handleReconnect();
          } else {
            this.setState('error');
            this.config.onError?.('Connection lost');
          }
        } else if (iceState === 'checking') {
          if (this.state === 'connected') {
            this.setState('reconnecting');
          } else {
            this.setState('connecting');
          }
        }
      };

      mediaStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, mediaStream);
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const whipUrl = this.getWhipUrl();
      
      const response = await fetch(whipUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHIP server error: ${response.status} ${response.statusText}`);
      }

      const answerSdp = await response.text();
      
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

    } catch (error) {
      this.setState('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to WHIP server';
      this.config.onError?.(errorMessage);
      throw error;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('error');
      this.config.onError?.('Connection lost after multiple reconnect attempts');
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

    this.reconnectTimeout = window.setTimeout(async () => {
      if (!this.mediaStream || !this.shouldReconnect) return;

      if (this.pc) {
        this.pc.close();
        this.pc = null;
      }

      try {
        await this.startStream(this.mediaStream);
      } catch (error) {
        this.handleReconnect();
      }
    }, delay);
  }

  private startStatsCollection(): void {
    this.stopStatsCollection();
    
    this.statsInterval = window.setInterval(async () => {
      if (!this.pc) return;
      
      try {
        const stats = await this.pc.getStats();
        this.processStats(stats);
      } catch (error) {
        console.error('Failed to get stats:', error);
      }
    }, 1000);
  }

  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.lastStats = null;
  }

  private processStats(stats: RTCStatsReport): void {
    let totalBitrate = 0;
    let latency = 0;
    let packetLoss = 0;
    let jitter = 0;

    stats.forEach((report) => {
      if (report.type === 'outbound-rtp') {
        if (this.lastStats) {
          const lastReport = Array.from(this.lastStats.values()).find(
            (r: any) => r.type === 'outbound-rtp' && r.id === report.id
          ) as any;

          if (lastReport && report.bytesSent && lastReport.bytesSent) {
            const bytesSent = report.bytesSent - lastReport.bytesSent;
            const timeDiff = (report.timestamp - lastReport.timestamp) / 1000;
            totalBitrate += (bytesSent * 8) / timeDiff;
          }
        }
      }

      if (report.type === 'remote-inbound-rtp') {
        if (report.roundTripTime !== undefined) {
          latency = Math.max(latency, report.roundTripTime * 1000);
        }
        if (report.jitter !== undefined) {
          jitter = Math.max(jitter, report.jitter * 1000);
        }
        if (report.packetsLost !== undefined && report.packetsSent !== undefined) {
          const lossRate = report.packetsSent > 0 
            ? (report.packetsLost / report.packetsSent) * 100 
            : 0;
          packetLoss = Math.max(packetLoss, lossRate);
        }
      }
    });

    this.lastStats = stats;

    this.config.onStatsUpdate?.({
      bitrate: totalBitrate,
      latency,
      packetLoss,
      jitter,
    });
  }

  async updateMediaStream(newMediaStream: MediaStream): Promise<void> {
    // Only allow track replacement when connection is stable
    if (!this.pc || this.state !== 'connected' || this.pc.signalingState !== 'stable') {
      return;
    }

    // Don't update if it's the same stream
    if (this.mediaStream === newMediaStream) {
      return;
    }

    // Increment sequence number to track this update
    this.updateSequence++;
    const currentSequence = this.updateSequence;

    // Get current senders
    const senders = this.pc.getSenders();

    // Get new tracks
    const newVideoTrack = newMediaStream.getVideoTracks()[0];
    const newAudioTrack = newMediaStream.getAudioTracks()[0];

    // Replace tracks in existing senders, collecting any errors
    const errors: Error[] = [];
    const replacePromises = senders.map(async (sender) => {
      if (!sender.track) {
        return Promise.resolve();
      }
      
      try {
        if (sender.track.kind === 'video') {
          // Replace with new video track or null if not available
          await sender.replaceTrack(newVideoTrack || null);
        } else if (sender.track.kind === 'audio') {
          // Replace with new audio track or null if not available
          await sender.replaceTrack(newAudioTrack || null);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Failed to replace ${sender.track.kind} track:`, err);
        errors.push(err);
      }
    });

    await Promise.all(replacePromises);

    // If any track replacement failed, throw the first error
    if (errors.length > 0) {
      throw errors[0];
    }

    // Only update the internal stream reference if this is still the most recent update
    // This prevents older updates from overwriting newer ones in case of rapid camera flips
    if (currentSequence === this.updateSequence) {
      this.mediaStream = newMediaStream;
    }
  }

  stopStream(): void {
    this.shouldReconnect = false;
    this.stopStatsCollection();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    this.mediaStream = null;
    this.reconnectAttempts = 0;
    
    this.setState('disconnected');
  }

  getState(): ConnectionState {
    return this.state;
  }

  isStreaming(): boolean {
    return this.state === 'connected' || this.state === 'connecting' || this.state === 'reconnecting';
  }
}
