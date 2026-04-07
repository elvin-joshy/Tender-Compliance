# TenderCV: AI Tender Compliance and Vendor Ranking System

TenderCV helps procurement teams evaluate vendor responses faster and more consistently by combining compliance analysis and multi-vendor ranking.

## The Problem
Procurement teams spend significant time manually reviewing RFPs and vendor proposals, then mapping requirements to evidence across long documents. This process is slow, hard to standardize, and difficult to audit. Missing mandatory requirements or risk signals can lead to poor vendor selection and compliance issues.

## The Solution
TenderCV provides two practical workflows in one platform:

1. Compliance Analysis (RFP vs one proposal): requirement extraction, semantic matching, compliance scoring, risk detection, history, and PDF reporting.
2. Vendor Ranking (one RFP vs multiple proposals): uploads multiple vendor documents, calculates match scores, and returns a ranked list with simple explanations.

The system is explainable by design, showing requirement-level status, confidence, matched text, risk context, and ranking reasons.

## Key Features
- Upload and analyze RFP and proposal documents (PDF and text).
- Mandatory requirement extraction from RFP content.
- Semantic requirement matching using sentence-transformers.
- Compliance scorecard with matched, weak, and missing breakdown.
- Risk detection for vague/non-committal language.
- Analysis history persisted in MongoDB with reopen and delete actions.
- Downloadable compliance PDF reports.
- Vendor Ranking System:
  - Exactly one RFP document upload
  - Multiple vendor proposal uploads
  - Optional vendor names
  - Ranked vendors with score percentage and explanation
- Node analysis pipeline with category-wise scoring and detailed explanation.
- Vercel-compatible frontend proxy routing and deployment support.

## Tech Stack
### Frontend
- React 18
- TypeScript
- Vite
- React Router DOM
- TanStack React Query
- Tailwind CSS
- Framer Motion
- Radix UI
- Sonner
- Lucide React

### Backend (Node.js)
- Node.js
- Express
- Mongoose
- Multer
- pdf-parse
- OpenAI SDK (used for Groq/OpenAI-compatible extraction flow)
- dotenv
- cors

### Backend (Python)
- FastAPI
- Uvicorn
- pdfplumber
- sentence-transformers
- torch
- reportlab
- pymongo
- python-dotenv
- python-multipart

### Database
- MongoDB

## System Architecture
1. Frontend handles document upload, user actions, and results visualization.
2. Compliance workflow routes to FastAPI:
   - Extracts text from uploads
   - Extracts RFP requirements
   - Performs semantic matching
   - Generates summary and risk flags
   - Persists analysis in MongoDB
   - Returns structured response and report output
3. Vendor ranking workflow routes to Node/Express:
   - Accepts one RFP file and multiple vendor files
   - Reuses shared file parsing logic
   - Computes per-vendor score and explanation
   - Returns ranked vendors descending by score
4. Frontend renders compliance dashboard, risk details, history pages, and vendor ranking results.

## Setup Instructions

### Clone
```bash
git clone https://github.com/elvin-joshy/Tender-Compliance.git
cd Tender-Compliance
```

### Backend
This repository has two backend services.

#### 1) Node Backend (Vendor Ranking + Node Analysis API)
```bash
npm install
```
Create `.env` in project root using `.env.example`, then run:
```bash
npm start
```
Default: `http://127.0.0.1:5000`

#### 2) FastAPI Backend (Compliance Analysis)
```bash
cd pdf-extractor-api
python -m venv .venv
```
Windows PowerShell:
```bash
.\.venv\Scripts\Activate.ps1
```
Install and run:
```bash
pip install -r requirements.txt
```
Create `.env` in `pdf-extractor-api` using `.env.example`, then run:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Default: `http://127.0.0.1:8000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Default: `http://localhost:8080` (or next available port)

## Environment Variables

### Root `.env` (Node backend)
- `PORT`
- `MONGO_URI`
- `CORS_ORIGIN`
- `LLM_PROVIDER`
- `GROQ_API_KEY`
- `GROQ_BASE_URL`
- `GROQ_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `EMBEDDING_PROVIDER`
- `ANALYSIS_MAX_UPLOAD_MB`
- `ANALYSIS_MAX_TEXT_BYTES`

### `pdf-extractor-api/.env` (FastAPI backend)
- `APP_NAME`
- `APP_VERSION`
- `ALLOWED_ORIGINS`
- `MAX_UPLOAD_MB`
- `LOG_LEVEL`
- `MONGO_URI`
- `MONGO_DATABASE`
- `MONGO_COLLECTION`
- `MONGO_ANALYSIS_ID_FIELD`

### `frontend/.env`
- `VITE_API_BASE_URL`
- `VITE_VENDOR_API_BASE_URL`

### Vercel runtime env (optional)
- `BACKEND_API_URL`

## Usage Guide
1. Open the app.
2. For compliance analysis:
   - Go to Upload Documents
   - Upload one RFP and one vendor proposal
   - Click Analyze Compliance
   - Review scorecard, table, risk details, and history
3. For vendor evaluation:
   - Go to Vendor Ranking
   - Upload one RFP document
   - Upload multiple vendor proposal documents
   - Click Analyze Vendors
   - Review ranked vendors with explanations

## Example Output
```json
{
  "success": true,
  "rankings": [
    {
      "name": "Vendor B",
      "score": 37.5,
      "explanation": "Matched 37.5% of RFP requirements"
    },
    {
      "name": "Vendor A",
      "score": 12.5,
      "explanation": "Matched 12.5% of RFP requirements"
    }
  ]
}
```

## Future Improvements
- Upgrade vendor ranking from keyword overlap to requirement-level semantic ranking.
- Add weighted scoring profiles by procurement category and tender type.
- Add collaborative evaluator review with comments and approvals.
- Add side-by-side vendor comparison dashboard with exportable reports.
- Add asynchronous processing queue for very large document batches.

## License
ISC
