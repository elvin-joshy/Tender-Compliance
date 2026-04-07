# Deployment Guide (Vercel + Render + MongoDB Atlas)

This guide deploys:

- Frontend (React + Vite) on Vercel
- Backend (FastAPI) on Render
- Database (MongoDB) on MongoDB Atlas

## What Is Already Prepared In This Repo

- Vercel SPA rewrite config: frontend/vercel.json
- Render backend blueprint: render.yaml
- Backend env template includes production origin guidance: pdf-extractor-api/.env.example

## 1) MongoDB Atlas

1. Create a cluster in MongoDB Atlas.
2. Create database user credentials.
3. Allow network access from your backend host (or 0.0.0.0/0 during setup).
4. Copy connection string and keep it for MONGO_URI.

## 2) Deploy Backend On Render

1. In Render, create a new service from this repository.
2. If prompted, use render.yaml from the repo root.
3. Confirm root directory is pdf-extractor-api.
4. Set env vars in Render:
   - MONGO_URI = your Atlas connection string
   - ALLOWED_ORIGINS = https://your-frontend.vercel.app
   - MONGO_DATABASE = tender_compliance
   - MONGO_COLLECTION = analyses
   - MONGO_ANALYSIS_ID_FIELD = analysis_id
   - MAX_UPLOAD_MB = 20
   - LOG_LEVEL = INFO
5. Deploy and copy backend URL, example:
   - https://your-api.onrender.com

Verify backend:

- GET https://your-api.onrender.com/health
- GET https://your-api.onrender.com/analyses

## 3) Deploy Frontend On Vercel

1. Import this repository into Vercel.
2. Set project Root Directory to frontend.
3. Build settings:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
4. Add environment variable:
   - VITE_API_BASE_URL = https://your-api.onrender.com
5. Deploy.

## 4) Validate End-To-End

1. Open your Vercel URL.
2. Run a new analysis from Upload page.
3. Confirm it appears in History page.
4. Open that history entry and verify Results page loads correctly.
5. Optionally test report download:
   - GET https://your-api.onrender.com/analyses/{analysis_id}/report

## 5) Optional: Vercel CLI Deployment (Frontend)

From frontend directory:

- npm i -g vercel
- vercel
- vercel --prod

Set VITE_API_BASE_URL in Vercel project env after first link if needed.
