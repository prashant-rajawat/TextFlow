# TextFlow Production Deployment Checklist

Use this checklist to ensure every component of TextFlow is correctly configured before deploying to production.

## 🗄️ Supabase & Database
- [ ] Supabase project active and configured.
- [ ] Database schema initialized (`profiles`, `speech_history`, `usage_records`).
- [ ] Row Level Security (RLS) enabled on all user tables with strict ownership policies.
- [ ] Supabase Storage bucket (`textflow-audio`) set to **Private**.
- [ ] Storage security policies verified (`audio/{user_id}/{history_id}/...`).

## 🌐 Environment Variables
### Frontend (Vercel / Netlify)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- [ ] `VITE_API_BASE_URL` (Pointing to backend production URL, e.g., `https://your-backend.onrender.com/api`)

### Backend (Render / Railway)
- [ ] `PORT` (Assigned by hosting provider)
- [ ] `NODE_ENV="production"`
- [ ] `FRONTEND_URL` (Your deployed frontend domain)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Server-side only)
- [ ] `GEMINI_API_KEY` (Server-side only)
- [ ] `TTS_API_KEY` (Server-side only)
- [ ] `TTS_REGION`
- [ ] `TTS_ENDPOINT`
- [ ] `TTS_DAILY_LIMIT` ("20")
- [ ] `AI_DAILY_LIMIT` ("20")
- [ ] `MAX_TTS_CHARACTERS` ("5000")
- [ ] `APP_TIMEZONE` ("UTC")

## 🔒 Security & CORS
- [ ] CORS restricted to `FRONTEND_URL` in production (no wildcard origins with credentials).
- [ ] Helmet security headers enabled.
- [ ] Rate limiting and request size limits active.
- [ ] Secret credentials (`GEMINI_API_KEY`, Supabase service role keys) kept strictly server-side.
- [ ] `.env` files excluded from Git (`.gitignore`).

## 🛠️ Build & Verification
- [ ] Frontend production build passes (`npm run build`).
- [ ] Backend production server bundle builds successfully (`dist/server.cjs`).
- [ ] TypeScript type-check passes with zero errors (`npm run lint`).
- [ ] API Health endpoint works (`GET /api/health`).
- [ ] Authentication (Signup / Login / Session persistence) verified.
- [ ] Text-to-Speech generation and Supabase Storage private bucket access verified.
- [ ] Speech History, Favorites, File Upload, AI Text Enhancement, and Usage Limits verified.
- [ ] Mobile and desktop responsive layouts verified.
- [ ] README.md and documentation updated.
