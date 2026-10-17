# Archive Report & Creative Asset Showcase

**Target URL:** `https://videomosaicgallery.framer.website/`  
**Generated Date:** 2026-10-17  
**Local Mirror Directory:** `dist/`  
**Active Preview Server:** `http://localhost:3000`  

---

## 1. Stack Detection Summary
- **Detected Framework / Runtime:** Framer (React 18 / Framer Motion SSR + Hydration)
- **Detection Confidence:** High (100%)
- **Evidence & Signals:**
  - `framerusercontent.com` assets & module chunks (`shared-lib.DWgExkQF.mjs`)
  - Framer layout engine data attributes (`data-framer-name`, `data-framer-component-type`)
  - Framer responsive media container layout and fluid masonry grid

---

## 2. Sanitization & Brand Customizations
- **Neutralized Telemetry & Trackers:**
  - Safely neutered Framer analytics and event reporting (`events.framer.com`) to prevent React hydration mismatches.
- **Removed Builder Elements & Badges:**
  - Completely stripped Framer editor badges and branding.
  - Stripped top filter navigation bar (`ALL`, `PORTRAITS`, `OBJECTS`, `ARCHITECTURE`, `PLACES`) in CSS, pre-rendered DOM, and runtime component configuration (`enableFilter: false`).
- **SMM Inspiration & Notification Banner:**
  - Embedded high-converting dark glass banner at the top of the gallery with direct clickable links:
    - **Active Meta Ad Preview:** [https://fb.me/2dQlXufp1cr05g6](https://fb.me/2dQlXufp1cr05g6)
    - **Meta Ads Library Archive:** [https://www.facebook.com/ads/library/?id=1733728674591526](https://www.facebook.com/ads/library/?id=1733728674591526) (Valid through October 30, 2026)

---

## 3. Media Transcoding & Performance Optimization
All raw creative assets from `Resources/` have been converted into modern next-generation web formats:
- **Video Creatives (MP4 -> WebM):**
  - Transcoded via `ffmpeg` using `libvpx-vp9`, 720p/1080p, 800k video bitrate, muted audio, and hardware-accelerated realtime encoding.
  - Server supports HTTP 206 Partial Content Range requests for video seeking and instant autoplay.
- **Image Creatives (PNG/JPG -> WebP):**
  - Transcoded via `ffmpeg` to `libwebp` at Quality 75 with max-bound scaling (1440px) to drastically reduce page payload while preserving razor-sharp display clarity.
- **Deduplication:**
  - SHA-256 content hashing was performed across all media directories to eliminate redundant creatives.

---

## 4. Creative Inventory & Aspect-Ratio Masonry Grid
A total of **115 unique creatives** are assembled in an aspect-ratio-faithful, dynamic masonry mosaic:
- **3 High-Impact Video Ads (`.webm`)**:
  - `1.webm`: Balcony Solar DIY Kit 30s Quick Setup (`span: tall`)
  - `final.webm`: Turnkey Commercial & Residential Solar Installation (`span: large`)
  - `high.webm`: High-Yield Suncake Portable Solar Showcase (`span: large`)
- **112 Image Creatives (`.webp`)**:
  - **Campaign 1 (TOFU Cold Audience)**: Balcony & Lifestyle, Direct Response AIDA/PAS, Advanced Frameworks FAB/4Ps, Smart Home & Tech.
  - **Campaign 2 (MOFU Warm Retargeting)**: Product Demos & Kits, Educational & Weather Durability, DISC Steady Onboarding, Outdoor Villa & Courtyard Mounts.
  - **Campaign 3 (BOFU Hot Conversion)**: Bottom-of-Funnel Close, ₱45,000 Special Promo Ribbon Editions.
  - **Educational Carousels & Social Feed Posts**: Step-by-step guides, energy calculators, daily insights, and typhoon resilience checklists.

### Ratio-to-Span Distribution:
| Tile Span | Grid Footprint | Aspect Ratio | Count | Description |
| :--- | :--- | :--- | :---: | :--- |
| **`normal`** | 1 col × 3 rows | ~1:1 Square | **91** | Standard square feed posts & direct response ad creatives |
| **`tall`** | 1 col × 4 rows | ~9:16 Vertical / 2:3 Portrait | **7** | Vertical video reels & portrait educational infographics |
| **`wide`** | 2 cols × 3 rows | ~16:9 Landscape / Horizontal | **9** | Wide horizontal banners, calculator tools & comparison charts |
| **`large`** | 2 cols × 4 rows | 2x2 Hero Double Span | **8** | Flagship video ads & high-converting promo hero sets |
| **Total** | | | **115** | **100% of all discovered creatives in `Resources/`** |

---

## 5. Local Server & Verification
- **Command:** `node server.js`
- **Features:** Clean URLs, SSE live-reload, HTTP 206 Range streaming for `.webm` video, MIME type management, zero external npm runtime dependencies.
- **Verification Tests:** 11/11 automated unit and integration tests passing (`npm test`).
