# 🥷 RoomChat: Ultra-Secure, Stealth 1-on-1 Real-Time Chat

A production-ready, highly secure, stealth-protected 1-on-1 real-time web application architected exclusively for two people. Engineered with deceptive cover UI ("Ninja Mode"), multi-layer dual-identity authentication, strict zero-cache/zero-storage policies, sub-second Socket.io messaging, and rich media sharing via Cloudinary.

---

## 🌟 Key Features

### 🥷 1. Stealth Cover UI & Secret Entry Flow ("Ninja Mode")
- **Innocent Landing Utility:** Opens as a fully functional, minimalist **Daily Tasks & Scratchpad App** (`FocusFlow`). Anyone picking up the device or peeking at the screen sees standard productivity tasks.
- **Secret Entry Trigger:**
  - **Triple-tap / Triple-click:** Clicking the subtle `"FocusFlow"` header title 3 times within 1.2s triggers the secret gateway.
  - **Secondary Trigger:** Double-clicking the discreet `"Offline-Ready"` status dot in the bottom-right footer.
- **Emergency Panic Button / Quick Wipe:**
  - Hit the **`Stealth Exit`** button in chat or press **`[Escape]` twice** rapidly.
  - Instantly drops WebSocket connections, wipes all session tokens from memory, and displays the harmless To-Do screen.

---

### 🔒 2. Multi-Layer Security & Strict Privacy Architecture
- **Layer 1 - Dual Credentials Gate:** Requires specific `User ID` and `Password` with rate-limiting and brute-force lockouts. Issues a short-lived (3-minute) partial stage token.
- **Layer 2 - 4-Digit Secret PIN Gate:** Tactile keypad requiring a separate hashed 4-digit PIN before the chat room unlocks.
- **🚨 ZERO STORAGE / NO TRACE LEFT POLICY:**
  - Credentials, passwords, PINs, and session tokens are **NEVER saved in `localStorage`, `sessionStorage`, or browser cookies**.
  - Sessions live exclusively in volatile JavaScript runtime memory closures.
  - Closing the browser tab, refreshing, or triggering the panic button purges every trace.

---

### ⚡ 3. Real-Time Chat & Performance (<0.1s Latency)
- **Engine:** Node.js, Express, and Socket.io with binary WebSocket fallback.
- **Real-Time Latency Meter:** Live ping ticker monitoring sub-second latency (`⚡ <0.1s`).
- **Automatic Reconnection:** Seamlessly handles network drops and reconnects automatically.
- **Message Delivery Ticks:**
  - Single tick (`✓` gray) = Sent to server
  - Double tick (`✓✓` gray) = Delivered to partner's device
  - Double cyan tick (`✓✓` cyan) = Read by partner
- **Live Typing Indicator:** Instant visual feedback when the other person is typing.

---

### 📸 4. Rich Media & Voice Sharing (Cloudinary Integration)
- **Live Camera Snap:** In-browser camera access (`getUserMedia`) to capture and send live moments instantly.
- **Gallery Uploads:** Share high-resolution photos and compressed videos.
- **Voice Notes ("Hold to Record"):** Built-in audio recorder via the browser `MediaRecorder` API with live timer and tactile waveform bars.
- **Database Optimization:** Heavy media streams directly to Cloudinary; MongoDB only stores lightweight metadata and secure CDN URLs, keeping MongoDB Atlas within the free M0 tier (512MB).

---

### 💖 5. Romantic Couple Enhancements
- **Love Bomb 💥❤️:** Full-screen floating heart shower and confetti particles broadcasted synchronously to both screens.
- **Live Countdown Timer ✈️:** Synchronized countdown widget for upcoming flights, meetings, or anniversaries.
- **Burn-After-Reading Notes 🔥:** Self-destructing secret text messages with selectable countdown timers (5s, 10s, 30s) that incinerate on both devices once viewed.
- **Custom Vibe Status 💭:** Real-time mood badges (e.g., `💖 Thinking of you`, `🥰 Missing you`, `😴 Sleepy cuddle time`).

---

### 🛠️ 6. Anti-Sleep Keep-Alive Mechanism (24/7 Hosting)
- Dedicated `/ping` and `/health` endpoints in Express.
- Ready for free automated monitoring (UptimeRobot / Cron-Job) to ping every 5-10 minutes, keeping free-tier cloud instances (Render / Railway) active 24/7 without cold-start delays.

---

## 📁 Repository Structure

```
RoomChat/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             # Resilient MongoDB Atlas / In-Memory Fallback
│   │   │   └── cloudinary.js     # Cloudinary media streaming & Multer buffer
│   │   ├── controllers/
│   │   │   ├── authController.js # Step 1 & Step 2 authentication logic
│   │   │   └── chatController.js # Messages, media, vibes, burn notes, countdown
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT in-memory token verification
│   │   ├── models/
│   │   │   ├── User.js           # User schema (bcrypt password & PIN hashes)
│   │   │   ├── Message.js        # Message schema (ticks, media, burn notes)
│   │   │   └── CoupleMeta.js     # Couple countdown and anniversary meta
│   │   ├── routes/
│   │   │   ├── authRoutes.js     # Rate-limited auth routes
│   │   │   ├── chatRoutes.js     # Chat & media endpoints
│   │   │   └── healthRoutes.js   # /ping endpoint for anti-sleep keep-alive
│   │   ├── sockets/
│   │   │   └── socketHandler.js  # 1-on-1 private room, ticks, Love Bomb, typing
│   │   ├── utils/
│   │   │   └── seedUsers.js      # Auto-seeds the 2 partner accounts
│   │   └── server.js             # Express HTTP & Socket.io server
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── StealthCover/
    │   │   │   └── CoverApp.jsx  # Deceptive To-Do app & hidden trigger
    │   │   ├── Auth/
    │   │   │   └── AuthModal.jsx # Step 1 (credentials) & Step 2 (PIN keypad)
    │   │   ├── Chat/
    │   │   │   ├── ChatApp.jsx      # Main chat coordinator & socket manager
    │   │   │   ├── ChatHeader.jsx   # Partner presence, latency, panic exit
    │   │   │   ├── MessageList.jsx  # Message stream & typing dots
    │   │   │   ├── MessageBubble.jsx# Ticks, audio waveform, burn notes
    │   │   │   └── MessageInput.jsx # Text, camera, gallery, mic, burn mode
    │   │   └── Modals/
    │   │       ├── LiveCameraModal.jsx    # Browser camera capture
    │   │       ├── LoveBombModal.jsx      # Full-screen heart/confetti burst
    │   │       ├── CountdownModal.jsx     # Couple anniversary/meeting countdown
    │   │       ├── VibeModal.jsx          # Mood & status broadcaster
    │   │       └── ImageLightboxModal.jsx # Full-resolution photo preview
    │   ├── services/
    │   │   ├── api.js            # Zero-storage closure API service
    │   │   └── socket.js         # Socket.io connection & latency tracker
    │   ├── App.jsx               # Root state controller (Cover -> Auth -> Chat)
    │   ├── index.css             # Tailwind CSS & keyframe animations
    │   └── main.jsx
    ├── tailwind.config.js
    ├── .env.example
    └── package.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18+)
- **NPM** (v9+)

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
```
Default pre-configured test partner accounts in `.env`:
| Partner | User ID | Password | Secret 4-digit PIN |
|---|---|---|---|
| **Partner 1** | `alex` | `SecretPass@123` | `1337` |
| **Partner 2** | `sam` | `SecretPass@456` | `7331` |

Start backend server:
```bash
npm run dev
# Server will run on http://localhost:5000
```
> *Note: If `MONGO_URI` is not yet configured, the backend automatically initializes an in-memory test store so you can test immediately without any setup delay!*

### 3. Configure Frontend
Open a second terminal window:
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Test the Stealth Flow
1. Open `http://localhost:5173` in your browser. You will see **FocusFlow - Daily Tasks & Scratchpad**.
2. **Activate Secret Entry:** Click the **"FocusFlow"** title 3 times rapidly (or double-click the green bottom-right "Offline-Ready" dot).
3. **Phase 1:** Enter User ID `alex` and Password `SecretPass@123`.
4. **Phase 2:** Enter the 4-digit PIN `1337` on the tactile PIN pad.
5. You are now inside the ultra-secure chat room!
6. Open an Incognito window or another browser at `http://localhost:5173`, perform the secret gesture, and sign in as `sam` with password `SecretPass@456` and PIN `7331`.
7. You now have a live, synchronized, sub-second encrypted channel between Alex and Sam!
8. Press `[Esc]` twice or click **`Stealth Exit`** to instantly wipe all credentials and return to the To-Do list.

---

## 🌐 Production Deployment Guide

### A. Deploy Backend to Render or Railway
1. Push your repository to GitHub.
2. In Render / Railway, create a new **Web Service** pointing to the `backend` directory.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add Environment Variables in your dashboard:
   - `PORT`: `5000` (or cloud default)
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
   - `JWT_SECRET`: A long random 32+ character string
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `PARTNER_ONE_USER_ID`, `PARTNER_ONE_PASS`, `PARTNER_ONE_PIN`, `PARTNER_ONE_NAME`
   - `PARTNER_TWO_USER_ID`, `PARTNER_TWO_PASS`, `PARTNER_TWO_PIN`, `PARTNER_TWO_NAME`

### B. Setup 24/7 Anti-Sleep Keep-Alive (UptimeRobot)
Free-tier hosting instances (like Render) sleep after 15 minutes of inactivity. To keep your private gateway warm 24/7 with zero cold starts:
1. Go to [UptimeRobot.com](https://uptimerobot.com) (free account).
2. Click **Add New Monitor**.
3. Monitor Type: **HTTP(s)**
4. Friendly Name: `RoomChat Keep-Alive`
5. URL: `https://your-backend.onrender.com/ping`
6. Monitoring Interval: **Every 5 minutes**
7. Click **Create Monitor**. Your backend will remain active 24/7!

### C. Deploy Frontend to Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Framework Preset: `Vite`.
4. Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com`
5. Deploy!

