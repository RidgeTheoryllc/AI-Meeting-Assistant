# Meeting Copilot v2 🎧

Real-time AI meeting assistant with **multi-speaker diarization**. Records audio, auto-detects when each speaker stops, transcribes and labels speakers (A, B, C...), then provides your boss with live suggestions via GPT-4o.

## Features

- 🎙️ **Auto-stop recording** — detects silence and stops automatically
- 👥 **Speaker diarization** — identifies and labels each speaker separately
- 🏷️ **Name your speakers** — rename "Speaker A" → "My Boss", "Speaker B" → "John (Client)"
- 🤖 **GPT-4o suggestions** — streamed in real-time per exchange
- 📜 **Session memory** — AI remembers full meeting context
- 🖱️ **Draggable floating modal** — sits beside your meeting window
- ⌨️ **Manual input fallback** — type if mic isn't available
- 🔒 **Secure** — both API keys are server-side only (safe for Vercel)

## Setup

### 1. Install
```bash
cd meeting-copilot-v2
npm install
```

### 2. API Keys
```bash
cp .env.example .env.local
```
Edit `.env.local`:
- `OPENAI_API_KEY` — from platform.openai.com
- `ASSEMBLYAI_API_KEY` — free at assemblyai.com (no credit card needed for trial)

### 3. Run
```bash
npm run dev
# Open http://localhost:3000 in Chrome
```

## Deploy to Vercel

1. Push to GitHub
2. Import at vercel.com → New Project
3. Add both environment variables:
   - `OPENAI_API_KEY`
   - `ASSEMBLYAI_API_KEY`
4. Deploy ✅

> **Note:** Vercel Hobby plan has a 10s function timeout. Upgrade to Pro (60s) or use the Vercel `maxDuration` config if transcription times out on longer segments.

## How to Use

1. Open in Chrome, join your meeting in another tab
2. Click the **mic button** — start speaking
3. Recording **auto-stops** after ~2 seconds of silence
4. AssemblyAI transcribes and labels each speaker
5. GPT-4o streams suggestions for your boss
6. Click **Speakers** in the header to rename Speaker A/B/C to real names
7. Suggestions update with correct names after renaming

## Vercel Timeout Note

AssemblyAI transcription takes ~5–15 seconds per segment depending on length.
- **Hobby plan**: 10s limit — may timeout on longer recordings
- **Pro plan**: 60s limit — works comfortably
- Add to `next.config.js` for Pro: `experimental: { serverActionsBodySizeLimit: '10mb' }`
