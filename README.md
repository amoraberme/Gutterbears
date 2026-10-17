# Gutterbears — Adaptive Website Mirror & SMM Creative Mosaic Gallery

A production-grade offline mirror and high-performance social media marketing (SMM) creative showcase adapted from Framer, completely localized and converted into next-generation web formats (`.webp` and `.webm`).

---

## Features

- **Adaptive Framework Localization:** Neutralized Framer telemetry, tracking beacons, and editor bars with zero React hydration crashes.
- **Top Filter Navigation Cleaned:** Stripped builder tags (`ALL`, `PORTRAITS`, `OBJECTS`, `ARCHITECTURE`, `PLACES`) across SSR HTML, CSS, and client-side component runtime.
- **Live Meta Ad Inspiration Banner:** Direct access to active Meta Ad previews and the Meta Ads Library archive:
  - **Live Ad Preview:** [https://fb.me/2dQlXufp1cr05g6](https://fb.me/2dQlXufp1cr05g6)
  - **Meta Ads Library Archive:** [https://www.facebook.com/ads/library/?id=1733728674591526](https://www.facebook.com/ads/library/?id=1733728674591526) (Active through October 30, 2026)
- **115 Creative Assets Transcoded:**
  - 3 video ads converted to `.webm` (VP9, 720p/1080p, 800k bitrate, hardware-accelerated realtime encoding).
  - 112 image creatives converted to `.webp` (Quality 75, max 1440px resolution for high web performance).
- **Aspect-Ratio-Faithful Dynamic Mosaic Grid:**
  - `normal` (1x3 span) — 91 square feed creatives (1:1 aspect ratio)
  - `tall` (1x4 span) — 7 vertical video reels and portrait educational infographics
  - `wide` (2x3 span) — 9 wide banners, ROI calculators, and comparison charts
  - `large` (2x4 span) — 8 flagship video commercials and promo hero sets
- **Authentic Direct-Response Copy:** Mapped from comprehensive marketing curriculum across TOFU, MOFU, and BOFU campaigns.
- **Local Dev Server & Vercel Ready:**
  - Built-in zero-dependency Node.js server with clean URLs, SSE live reload, and HTTP 206 Range video streaming.
  - Native Vercel edge deployment configuration via `vercel.json`.

---

## Getting Started

### Local Development
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view and edit the local site.

### Run Test Suite
```bash
npm test
```

### Deploy to Vercel
```bash
vercel --prod
```
