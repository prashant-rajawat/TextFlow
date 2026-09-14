# TextFlow — Production-Ready Text-to-Speech Platform

TextFlow is a next-generation, full-stack Text-to-Speech (TTS) and AI text enhancement web application built with React, Vite, Tailwind CSS, Express, TypeScript, and Supabase.

## ✨ Core Features

1. **Natural Text-to-Speech Generation**:
   - Supports 7 languages (English, Hindi, Gujarati, Marathi, Spanish, French, German).
   - High-quality voice catalog with multi-gender and style capabilities.
   - Fine-grained voice customization (speed, pitch, volume, style).
   - Document text extraction (TXT, PDF, DOCX) with size & length validation.

2. **AI Text Enhancement**:
   - Improve Grammar, Rewrite for Clarity, Summarize, and Make Conversational.
   - Side-by-side review modal to inspect enhanced text before applying.

3. **Secure Cloud Persistence & Storage**:
   - User authentication and session management via Supabase Auth & RLS.
   - Private Supabase Storage bucket for generated audio files with short-lived signed URLs.
   - Complete speech history, favorites, and usage tracking.

4. **Robust Usage & Quota Controls**:
   - Server-enforced daily TTS generation limits, AI enhancement limits, and character quotas.
   - Atomic database transactions with race-condition prevention and rollback safety.
   - Real-time usage indicators and limits dashboard.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, HTML5 Audio Player.
- **Backend**: Node.js, Express, TypeScript, tsx, esbuild.
- **Database & Storage**: Supabase PostgreSQL (with Row Level Security), Supabase Storage.
- **AI & TTS Providers**: Google Gemini API & Google Cloud Text-to-Speech.

---

## 🚀 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Frontend (Browser Safe)
VITE_SUPABASE_URL=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
VITE_API_BASE_URL=""

# Backend (Server Side Only)
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
GEMINI_API_KEY=""
TTS_API_KEY=""
TTS_REGION=""
TTS_ENDPOINT=""
TTS_DAILY_LIMIT="20"
AI_DAILY_LIMIT="20"
MAX_TTS_CHARACTERS="5000"
APP_TIMEZONE="UTC"
```

---

## 💻 Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server (boots Express API backend + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Start production server:
   ```bash
   npm start
   ```

---

## 🌐 Production Deployment Guide

### 1. Supabase Setup
- Create or use an existing Supabase project.
- Ensure database tables (`profiles`, `speech_history`, `usage_records`) are created and Row Level Security (RLS) is enabled.
- Create a private storage bucket named `textflow-audio` with correct ownership security policies.

### 2. Backend Deployment (Render / Railway)
- Connect your GitHub repository to Render or Railway as a **Node.js** service.
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- Configure Environment Variables:
  - `NODE_ENV=production`
  - `FRONTEND_URL=https://your-frontend-domain.vercel.app`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`, `TTS_API_KEY`, etc.

### 3. Frontend Deployment (Vercel / Netlify)
- Connect your GitHub repository to Vercel or Netlify.
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- Configure Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_API_BASE_URL=https://your-backend-service.onrender.com/api`

---

## 🔌 API Endpoints

- **Health Check**: `GET /api/health`
- **Voices**: `GET /api/voices?language=en-US`
- **Text-to-Speech**: `POST /api/tts`
- **AI Enhancement**: `POST /api/ai/enhance`
- **Speech History**: `GET /api/history`, `DELETE /api/history`, `DELETE /api/history/:id`, `GET /api/history/:id/download`, `PATCH /api/history/:id/favorite`
- **Favorites**: `GET /api/favorites`
- **Usage & Quotas**: `GET /api/usage`

---

## 🔒 Security Notes

- All private API keys (Gemini, Supabase Service Role, TTS credentials) remain strictly server-side.
- Supabase Row Level Security (RLS) ensures absolute data isolation between users.
- Supabase Storage buckets are private; audio files are securely accessed via short-lived signed URLs.
- Input validation, character limits (5,000 chars), and atomic rate limiting protect against abuse.

