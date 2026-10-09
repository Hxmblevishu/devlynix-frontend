# Devlynix — Retro Developer Matchmaking Web Application

> **Frontend Client for Devlynix Buildathon 2.0**  
> A cyberpunk, cassette-deck-themed matchmaking and collaboration interface built for developers, hackers, and open-source builders. Swipe on candidate profile cassettes, inspect tech stack synergies, receive incoming signal radar alerts, and collaborate via low-latency chat.

---

## 🚀 Live Deployments & Cross-Links

- **Live Web App:** [https://devlynix-frontend12-git-main-hxmblevishus-projects.vercel.app/](https://devlynix-frontend12-git-main-hxmblevishus-projects.vercel.app/)
- **Backend API Base:** `https://devlynix-buildathon-2-0.onrender.com/api`
- **Backend Source Repository:** [Devlynix-Buildathon-2.0](../Devlynix-Buildathon-2.0)

---

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI & Runtime:** React 19, TypeScript 5
- **Styling & Design System:** Tailwind CSS v4, Custom Cyberpunk Retro Design Tokens
- **Animations:** Framer Motion (`^12.40.0`), CSS Keyframe Oscillators
- **Sound Effects:** Zero-dependency procedural Web Audio API synthesizers (`lib/sound.ts`)
- **Networking:** Native `fetch` with concurrency-safe silent token refresh interceptor
- **Deployment:** Vercel

---

## 🎨 Key Features & Architecture

### 1. Cassette-Deck Candidate Cards & Discovery
- Retro tape-reel candidate profiles showcasing:
  - Developer Handle, Location/Timezone, and GitHub Avatar resolution
  - Primary Tech Stack chips with compatibility synergy badges
  - Project Pitch and Hackathon Intent
- Swipe interactions: **`[LIKE]`** (mutual match opportunity) or **`[PASS]`** with mechanical click audio feedback.
- Detailed dossier inspection via `CandidateDetailModal`.

### 2. Signal Radar (Incoming Match Requests)
- Persistent corner radar counter on the Dashboard: **`SIGNAL RADAR // INCOMING REQUESTS [N]`** featuring an animated pulsing radar dot.
- Slide-out drawer displaying developers who have already liked your profile.
- Direct actions:
  - **`[ACCEPT & MATCH]`** — Instantly confirms mutual match and enables immediate chat.
  - **`[DECLINE]`** — Discreetly passes on the incoming request.

### 3. Dynamic Tech Stack Filtering & Queue Rewind
- Retro filter bar above the discovery feed with preset chips (React, Next.js, TypeScript, Java, Spring Boot, Python, Rust, Docker, AI/ML).
- Arbitrary custom stack search input (e.g., search for `GraphQL` or `Solidity`).
- **Rewind Queue Button (`[REWIND_QUEUE // RESET_SKIPPED_PASSES]`):** Automatically calls `api.resetPasses()` to re-evaluate previously skipped candidates when the queue runs dry.

### 4. Real-Time Chat & Adaptive Delta Synchronization
- **Adaptive Polling Engine:**
  - Active tab: Polls for new messages every **2 seconds** using incremental delta sync (`?after={latestId}`).
  - Backgrounded tab: Backs off to **30 seconds** via the browser **Page Visibility API** to conserve client battery and reduce database load by >90%.
  - Regains sub-second sync immediately upon tab refocus.
- **Optimistic UI:** Outgoing chat messages render instantly with temporary state before server confirmation.
- **Teammate Intel Panel:** Collapsible side drawer in `/matches` displaying:
  - Full developer background and GitHub repository link.
  - **`[UNMATCH]`** action: Severs connection and cleans up conversation.
  - **`[CLEAR CHAT]`** action: Wipes conversation history.

### 5. Multi-Device Sessions & RTR Security Dashboard (`/sessions`)
- **Refresh Token Rotation (RTR):** Short-lived access tokens (10 mins) paired with rotating refresh tokens (7 days).
- **Silent Refresh Interceptor:** The API client in `lib/api.ts` transparently catches `401 Unauthorized` responses, refreshes tokens with a concurrency mutex lock, and retries the original request.
- **Active Devices Telemetry Page (`/sessions`):**
  - Displays primary device session with IP, OS, browser, and last active time.
  - Lists all active remote devices with remote indicators.
  - Actions: **`[REVOKE ACCESS]`** per remote device, **`[DISCONNECT ALL OTHER DEVICES]`**, and **`[LOGOUT EVERYWHERE]`**.

### 6. Zero-Dependency Procedural Audio Engine (`lib/sound.ts`)
- Procedural audio synthesis using browser native `AudioContext` (no heavy MP3 audio assets):
  - Mechanical tape deck click on swiping
  - Resonant celebratory chime on mutual match
  - High-frequency retro terminal click on message dispatch

---

## 📂 Project Structure

```
devlynix-frontend/
├── app/
│   ├── page.tsx            # Retro landing page with animated cassette deck
│   ├── login/page.tsx      # Cyberpunk authentication portal
│   ├── register/page.tsx   # Developer onboarding & stack configuration
│   ├── dashboard/page.tsx  # Discovery deck, radar widget, skill filter
│   ├── matches/page.tsx    # Active matches, chat, teammate dossier
│   ├── sessions/page.tsx   # Device security & token family manager
│   ├── globals.css         # Tailwind CSS v4 styling & retro themes
│   └── layout.tsx          # Root layout & monospace typography
├── components/
│   ├── landing/            # Landing hero & presentation components
│   ├── theme/              # 16 reusable cyberpunk UI components
│   │   ├── CassetteCard.tsx
│   │   ├── CassettePlayerIllustration.tsx
│   │   ├── IncomingRequestsModal.tsx
│   │   ├── TeammateIntelPanel.tsx
│   │   ├── CandidateDetailModal.tsx
│   │   ├── EditProfileModal.tsx
│   │   ├── RetroButton.tsx / RetroModal.tsx / RetroInput.tsx
│   │   └── TechnicalFrame.tsx / WaveformBackground.tsx
│   └── auth/               # Protected route guards
├── lib/
│   ├── api.ts              # 20 typed API methods + silent token refresh
│   ├── session.ts          # Local session storage & token synchronization
│   └── sound.ts            # Web Audio API sound synthesizer
└── public/                 # Static assets & icons
```

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js 18+** or **Node.js 20+**
- **npm**, **yarn**, or **pnpm**

### Step-by-Step Setup
1. Clone the repository and navigate to the project directory:
   ```bash
   cd devlynix-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   *By default, `.env.local` points to `http://localhost:8080/api` for local backend development, or to the live Render backend.*

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Build & Deployment

To verify and create an optimized production build:
```bash
npm run build
npm run start
```

Deployable with zero configuration on **Vercel**:
1. Connect the GitHub repository to Vercel.
2. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: `https://devlynix-buildathon-2-0.onrender.com/api`
3. Deploy!

---

## 👨‍💻 Author

**Nikunj Garg**  
- **Email:** [gargnikunj991@gmail.com](mailto:gargnikunj991@gmail.com)  
- **Portfolio:** [nikunjgarg.xyz](https://nikunjgarg.xyz)  
- **GitHub:** [@gargnikunj991-ux](https://github.com/gargnikunj991-ux)
