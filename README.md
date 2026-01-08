# WHIP Streamer

A modern, web-based streaming client using the WHIP (WebRTC-HTTP ingestion
protocol) standard.

## Features

- **WHIP support**: Stream directly to any WHIP-compatible server (like SRS,
  Janus, or Mediasoup).
- **Camera controls**: Switch between front/back cameras, flip, and zoom.
- **Pinch-to-zoom**: Native-like pinch zoom support.
- **Audio/video toggle**: Mute audio or disable video on the fly.
- **Connection stats**: Real-time debug overlay with bitrate, latency, and
  packet loss info.

## Screenshots

<p align="left">
  <img src="screenshots/camera-view.png" alt="Camera View" />
  <img src="screenshots/settings-view.png" alt="Settings View" />
</p>

## Tech stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Icons**: Phosphor Icons
- **Protocol**: WHIP (WebRTC)
