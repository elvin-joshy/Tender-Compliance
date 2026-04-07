# Tender Compliance Validator

Tender Compliance Validator is a full-stack system that validates vendor proposals against RFP requirements using NLP and semantic matching.

It includes:

- A FastAPI backend for extraction, validation, risk detection, and PDF report generation
- A React frontend for document upload and compliance dashboard visualization
- Automated scripts for standard test cases, edge-case testing, and demo execution

## Features

- Mandatory requirement extraction from RFP text
- Semantic requirement matching with confidence scoring (all-MiniLM-L6-v2)
- Risky language detection (may, can, subject to, if possible)
- Compliance summary: matched, weak, missing
- MongoDB-backed analysis history persistence
- Downloadable PDF report (compliance_report.pdf)
- Frontend dashboard with filters, score card, skeleton loading, transitions, and toast notifications
- Analysis History page with open/delete actions for saved analyses
- Automated test runner and edge-case validation scripts
- Node.js enterprise analysis pipeline with requirement-level matching and explainable scoring

## Node Analysis API (New)

Base URL:

- http://localhost:5000/api/analysis

Endpoints:

- POST /run (multipart/form-data)
   - rfp: PDF or text file
   - proposal: PDF or text file
   - optional debug: true|false
- POST /run-text (application/json)
   - rfp_text: string
   - proposal_text: string
   - optional debug: true|false

Response includes:

- final_compliance_score (0-100)
- category_wise_scores (functional, technical, compliance, timeline)
- detailed_explanation
- missing_requirements
- partial_matches
- requirement_matches
- extracted_json (when debug=true)

Optional environment variables:

- LLM_PROVIDER (groq, openai, local, or auto)
- GROQ_API_KEY (enables Groq structured extraction)
- GROQ_BASE_URL (default https://api.groq.com/openai/v1)
- GROQ_MODEL (default llama-3.3-70b-versatile)
- EMBEDDING_PROVIDER (auto, openai, or local)
- OPENAI_API_KEY (optional, for OpenAI embeddings/extraction)
- OPENAI_MODEL (default gpt-4.1-mini)
- OPENAI_EMBEDDING_MODEL (default text-embedding-3-small)
- ANALYSIS_MAX_UPLOAD_MB (default 20)

## Tech Stack

### Backend

- FastAPI
- pdfplumber
- sentence-transformers
- reportlab
- pydantic
- pymongo

### Frontend

- React + Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- Sonner toasts

## Project Structure

- frontend/
  - React app and UI
- pdf-extractor-api/
  - FastAPI app
  - app/services/ for extraction, matching, risk, and report generation
- test_cases/
  - level1/level2/level3 RFP and proposal inputs
- run_test_cases.py
  - Batch validation script for test_cases/
- test_runner.py
  - Structured test runner with compliance summary
- edge_case_tests.py
  - Edge-case validation script
- demo_script.py
  - Guided demo execution for level1, level2, level3

## Setup Instructions

## 1) Backend Setup

1. Open terminal in project root.
2. Create and activate virtual environment (if needed).
3. Install backend dependencies:

   d:/Tender-Compliance/.venv/Scripts/python.exe -m pip install -r pdf-extractor-api/requirements.txt

4. Backend environment file:
   - Create from pdf-extractor-api/.env.example
   - You can customize values as needed

5. Start backend:

   d:/Tender-Compliance/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir d:/Tender-Compliance/Tender-Compliance/pdf-extractor-api --host 127.0.0.1 --port 8000

6. Verify backend:
   - GET http://127.0.0.1:8000/health

## 2) Frontend Setup

1. Install frontend dependencies:

   npm --prefix frontend install

2. Frontend environment file:
   - Already provided at frontend/.env
   - Default API target: http://127.0.0.1:8000

3. Start frontend:

   npm --prefix frontend run dev

4. Open app:
   - http://localhost:8082 (or Vite-assigned port shown in terminal)

## API Usage

## POST /extract

Input (JSON):

- rfp_text: string

Output:

- requirements
- count

## POST /validate

Input (multipart/form-data):

- rfp file
- proposal file

Output:

- analysis_id
- timestamp
- results
- summary
- validation_results
- matched_requirements
- missing_requirements
- confidence_scores
- risk_flags

## POST /validate-text

Input (JSON):

- rfp_text
- proposal_text

Output:

- same structure as /validate

## GET /analyses

Output:

- analyses (most recent first)
- count

## GET /analyses/{analysis_id}

Output:

- full stored analysis payload

## DELETE /analyses/{analysis_id}

Output:

- confirmation message

## GET /analyses/{analysis_id}/report

Output:

- application/pdf download
- filename: compliance*report*{analysis_id}.pdf

## POST /report

Input (multipart/form-data):

- rfp file
- proposal file

Output:

- application/pdf download
- filename: compliance_report.pdf

## POST /report-text

Input (JSON):

- rfp_text
- proposal_text

Output:

- application/pdf download
- filename: compliance_report.pdf

## Automated Testing

## Backend API tests

d:/Tender-Compliance/.venv/Scripts/python.exe -m pytest d:/Tender-Compliance/Tender-Compliance/pdf-extractor-api/tests -q

## Batch test cases

$env:API_BASE_URL="http://127.0.0.1:8000"
d:/Tender-Compliance/.venv/Scripts/python.exe d:/Tender-Compliance/Tender-Compliance/run_test_cases.py

## Structured summary runner

$env:API_BASE_URL="http://127.0.0.1:8000"
d:/Tender-Compliance/.venv/Scripts/python.exe d:/Tender-Compliance/Tender-Compliance/test_runner.py

## Edge-case tests

$env:API_BASE_URL="http://127.0.0.1:8000"
d:/Tender-Compliance/.venv/Scripts/python.exe d:/Tender-Compliance/Tender-Compliance/edge_case_tests.py

## Demo Instructions

Run guided demo script:

$env:API_BASE_URL="http://127.0.0.1:8000"
d:/Tender-Compliance/.venv/Scripts/python.exe d:/Tender-Compliance/Tender-Compliance/demo_script.py

Demo flow:

- Level 1: mostly matched requirements
- Level 2: mixed compliance output
- Level 3: high risk and clear violations

## Production Notes

- CORS is configurable via ALLOWED_ORIGINS
- Upload size limit configurable via MAX_UPLOAD_MB
- Logging level configurable via LOG_LEVEL
- MongoDB connection and collection are configurable via MONGO_URI, MONGO_DATABASE, MONGO_COLLECTION
- Semantic model is loaded once and reused
- Proposal sentence embeddings are cached to reduce recomputation

## Current Status

- Frontend and backend integrated
- No dummy data used in runtime result flow
- Validation, reporting, and tests run successfully end-to-end
- Analysis history is persisted and available through API + frontend history page
