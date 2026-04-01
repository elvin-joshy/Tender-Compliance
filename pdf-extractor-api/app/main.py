from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.responses import ExtractTextResponse
from app.services.pdf_service import extract_text_from_pdf

app = FastAPI(
    title="PDF Text Extraction API",
    version="1.0.0",
    description="Extract clean text from uploaded PDF files using pdfplumber.",
)

# Allow all origins for simplicity.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"message": "Welcome to the PDF Text Extraction API."}


@app.post("/extract-text", response_model=ExtractTextResponse)
def extract_text(file: UploadFile = File(...)) -> ExtractTextResponse:
    if file is None:
        raise HTTPException(status_code=400, detail="No file provided.")

    is_pdf_type = file.content_type == "application/pdf"
    has_pdf_extension = file.filename.lower().endswith(".pdf") if file.filename else False
    if not (is_pdf_type or has_pdf_extension):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    result = extract_text_from_pdf(file)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    return ExtractTextResponse(
        filename=file.filename or "unknown.pdf",
        extracted_text=result["text"],
        page_count=result["page_count"],
        status="success",
    )
