# Guitar Tuner PWA

A private, installable guitar tuner for standard tuning. Pitch detection and CC0 FreePats acoustic-guitar reference tones run entirely in the browser; no audio leaves the device.

## Features

- Standard E2–A2–D3–G3–B3–E4 tuning at A4 = 440 Hz
- Automatic string detection with optional manual locking
- Six sampled nylon-string acoustic-guitar reference tones
- Offline, installable PWA
- English and Spanish interface
- Responsive light and dark themes

Microphone access requires HTTPS in production. `localhost` works during development.

## Development

```bash
npm install
npm run dev
```

Run all quality checks with `npm run check`. Set `VITE_BASE_PATH=/` for root-hosted builds; the default deployment path is `/guitar-tuner-pwa/`.

Production builds download the pinned FreePats archive, verify its SHA-256 checksum, and extract only the six required FLAC samples. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for attribution.

## License

The application source is licensed under **GPL-3.0-or-later**. The bundled FreePats guitar samples are dedicated to the public domain under **CC0-1.0**.
