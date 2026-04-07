# Deployment Guide (Vercel + Railway + MongoDB Atlas)

This guide deploys:

- Frontend (React + Vite) on Vercel
- Backend (FastAPI) on Railway
- Database (MongoDB) on MongoDB Atlas

## What Is Already Prepared In This Repo

- Vercel SPA rewrite config: frontend/vercel.json
- Vercel serverless API proxy: frontend/api/[...path].ts
- Backend env template includes production origin guidance: pdf-extractor-api/.env.example
- Railway start command file: pdf-extractor-api/Procfile

## 1) MongoDB Atlas

1. Create a cluster in MongoDB Atlas.
2. Create database user credentials.
3. Allow network access from your backend host (or 0.0.0.0/0 during setup).
4. Copy connection string and keep it for MONGO_URI.

## 2) Deploy Backend On Railway

1. In Railway, create a new project from this repository.
2. Create a service from the repo and set the service Root Directory to pdf-extractor-api.
3. Ensure Railway uses these commands (or rely on Procfile):
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
4. Set env vars in Railway:
   - MONGO_URI = your Atlas connection string
   - ALLOWED_ORIGINS = https://your-frontend.vercel.app
   - MONGO_DATABASE = tender_compliance
   - MONGO_COLLECTION = analyses
   - MONGO_ANALYSIS_ID_FIELD = analysis_id
   - MAX_UPLOAD_MB = 20
   - LOG_LEVEL = INFO
5. Deploy and copy backend URL, example:
   - https://your-api.up.railway.app

Verify backend:

- GET https://your-api.up.railway.app/health
- GET https://your-api.up.railway.app/analyses

## 3) Deploy Frontend On Vercel

1. Import this repository into Vercel.
2. Set project Root Directory to frontend.
3. Build settings:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
4. Add environment variable:
   - BACKEND_API_URL = https://your-api.up.railway.app
5. Deploy.

How this works:

- Browser calls /api/* on the same Vercel domain.
- Vercel function at frontend/api/[...path].ts proxies to BACKEND_API_URL.
- SPA routes still rewrite to index.html via frontend/vercel.json.

## 4) Validate End-To-End

1. Open your Vercel URL.
2. Run a new analysis from Upload page.
3. Confirm it appears in History page.
4. Open that history entry and verify Results page loads correctly.
5. Optionally test report download:
   - GET https://your-api.up.railway.app/analyses/{analysis_id}/report

## 5) Optional: Vercel CLI Deployment (Frontend)

From frontend directory:

- npm i -g vercel
- vercel
- vercel --prod

Set BACKEND_API_URL in Vercel project env after first link if needed.
