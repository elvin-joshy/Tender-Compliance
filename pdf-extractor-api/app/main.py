from io import BytesIO
import logging

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.logging_config import setup_logging
from app.schemas.responses import ExtractTextResponse
from app.services.analysis_history_service import (
    build_summary,
    create_analysis_record,
    delete_analysis_by_id,
    get_analysis_by_id,
    list_analyses,
    save_analysis,
)
from app.services.extractor import extract_requirements_from_rfp
from app.services.matcher import match_requirements
from app.services.pdf_service import extract_text_from_pdf_bytes
from app.services.report_service import generate_compliance_report_pdf
from app.services.risk import detect_risk_in_proposal

setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = settings.max_upload_mb * 1024 * 1024

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Extract clean text from uploaded PDF files using pdfplumber.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=settings.allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    rfp_text: str


class ValidateRequest(BaseModel):
    rfp_text: str
    proposal_text: str


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(status_code=exc.status_code, content={"error": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server exception: %s", str(exc))
    return JSONResponse(status_code=500, content={"error": "Internal server error."})


def _read_upload_bytes(file: UploadFile) -> bytes:
    try:
        raw_bytes = file.file.read()
    except Exception as exc:
        logger.exception("Failed to read uploaded file: %s", file.filename)
        raise HTTPException(status_code=400, detail=f"Unable to read uploaded file: {str(exc)}") from exc

    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file exceeds maximum size of {settings.max_upload_mb}MB.",
        )

    return raw_bytes


def _extract_text_from_upload(file: UploadFile) -> str:
    raw_bytes = _read_upload_bytes(file)
    is_pdf_type = file.content_type == "application/pdf"
    has_pdf_extension = file.filename.lower().endswith(".pdf") if file.filename else False

    if is_pdf_type or has_pdf_extension:
        result = extract_text_from_pdf_bytes(raw_bytes)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["error"])
        return result["text"]

    decoded_text = raw_bytes.decode("utf-8", errors="ignore").strip()
    if not decoded_text:
        raise HTTPException(status_code=400, detail="Unable to read text content from file.")

    return decoded_text


def _build_validation_response(rfp_text: str, proposal_text: str) -> dict:
    extracted_requirements = extract_requirements_from_rfp(rfp_text)
    requirement_texts = [item["text"] for item in extracted_requirements]
    category_map = {item["text"]: item.get("category", "Technical") for item in extracted_requirements}

    match_results = match_requirements(requirement_texts, proposal_text)
    enriched_results = [
        {
            **item,
            "category": category_map.get(item["requirement"], "Technical"),
        }
        for item in match_results
    ]

    summary = build_summary(enriched_results)
    risk_flags = detect_risk_in_proposal(proposal_text)

    matched_requirements = [item for item in enriched_results if item["status"] == "Matched"]
    missing_requirements = [item for item in enriched_results if item["status"] == "Missing"]

    confidence_scores = [
        {
            "requirement": item["requirement"],
            "confidence": item["confidence"],
            "reason": item["reason"],
        }
        for item in enriched_results
    ]

    return {
        "analysis_id": None,
        "timestamp": None,
        "results": enriched_results,
        "summary": summary,
        "validation_results": enriched_results,
        "matched_requirements": matched_requirements,
        "missing_requirements": missing_requirements,
        "confidence_scores": confidence_scores,
        "risk_flags": risk_flags,
    }


def _safe_build_validation_response(rfp_text: str, proposal_text: str) -> dict:
    try:
        return _build_validation_response(rfp_text, proposal_text)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Validation pipeline failed.")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(exc)}") from exc


def _attach_persistent_history(rfp_text: str, proposal_text: str, payload: dict) -> dict:
    record = create_analysis_record(
        rfp_text=rfp_text,
        proposal_text=proposal_text,
        results=payload["results"],
        summary=payload["summary"],
        risk_flags=payload["risk_flags"],
    )

    try:
        saved = save_analysis(record)
    except RuntimeError as exc:
        logger.exception("Persisting analysis failed.")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    payload["analysis_id"] = saved["analysis_id"]
    payload["timestamp"] = saved["timestamp"]
    return payload


@app.get("/")
def root() -> dict:
    return {"message": "Welcome to the PDF Text Extraction API."}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.post("/extract")
def extract_requirements(payload: ExtractRequest) -> dict:
    if not payload.rfp_text.strip():
        raise HTTPException(status_code=400, detail="rfp_text is required.")

    requirements = extract_requirements_from_rfp(payload.rfp_text)
    return {
        "requirements": requirements,
        "count": len(requirements),
    }


@app.post("/validate")
def validate_proposal(rfp: UploadFile = File(...), proposal: UploadFile = File(...)) -> dict:
    logger.info("Processing /validate request with files: rfp=%s proposal=%s", rfp.filename, proposal.filename)

    rfp_text = _extract_text_from_upload(rfp)
    proposal_text = _extract_text_from_upload(proposal)
    payload = _safe_build_validation_response(rfp_text, proposal_text)

    return _attach_persistent_history(rfp_text, proposal_text, payload)


@app.post("/validate-text")
def validate_proposal_text(payload: ValidateRequest) -> dict:
    logger.info("Processing /validate-text request.")

    if not payload.rfp_text.strip():
        raise HTTPException(status_code=400, detail="rfp_text is required.")
    if not payload.proposal_text.strip():
        raise HTTPException(status_code=400, detail="proposal_text is required.")

    result_payload = _safe_build_validation_response(payload.rfp_text, payload.proposal_text)

    return _attach_persistent_history(payload.rfp_text, payload.proposal_text, result_payload)


@app.get("/analyses")
def get_analyses() -> dict:
    try:
        analyses = list_analyses()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "analyses": analyses,
        "count": len(analyses),
    }


@app.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str) -> dict:
    try:
        analysis = get_analysis_by_id(analysis_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    return analysis


@app.delete("/analyses/{analysis_id}")
def delete_analysis(analysis_id: str) -> dict:
    try:
        deleted = delete_analysis_by_id(analysis_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    return {"message": "Analysis deleted successfully."}


@app.get("/analyses/{analysis_id}/report")
def download_stored_analysis_report(analysis_id: str) -> StreamingResponse:
    try:
        analysis = get_analysis_by_id(analysis_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    payload = {
        "validation_results": analysis.get("results", []),
        "summary": analysis.get("summary", {}),
        "risk_flags": analysis.get("risk_flags", {}),
    }

    try:
        pdf_bytes = generate_compliance_report_pdf(payload)
    except Exception as exc:
        logger.exception("Report generation failed for stored analysis report endpoint.")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(exc)}") from exc

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=compliance_report_{analysis_id}.pdf"},
    )


@app.post("/report")
def download_compliance_report(rfp: UploadFile = File(...), proposal: UploadFile = File(...)) -> StreamingResponse:
    logger.info("Processing /report request with files: rfp=%s proposal=%s", rfp.filename, proposal.filename)

    rfp_text = _extract_text_from_upload(rfp)
    proposal_text = _extract_text_from_upload(proposal)
    validation_payload = _safe_build_validation_response(rfp_text, proposal_text)

    try:
        pdf_bytes = generate_compliance_report_pdf(validation_payload)
    except Exception as exc:
        logger.exception("Report generation failed for /report.")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(exc)}") from exc

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=compliance_report.pdf"},
    )


@app.post("/report-text")
def download_compliance_report_text(payload: ValidateRequest) -> StreamingResponse:
    logger.info("Processing /report-text request.")

    if not payload.rfp_text.strip():
        raise HTTPException(status_code=400, detail="rfp_text is required.")
    if not payload.proposal_text.strip():
        raise HTTPException(status_code=400, detail="proposal_text is required.")

    validation_payload = _safe_build_validation_response(payload.rfp_text, payload.proposal_text)

    try:
        pdf_bytes = generate_compliance_report_pdf(validation_payload)
    except Exception as exc:
        logger.exception("Report generation failed for /report-text.")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(exc)}") from exc

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=compliance_report.pdf"},
    )


@app.post("/extract-text", response_model=ExtractTextResponse)
def extract_text(file: UploadFile = File(...)) -> ExtractTextResponse:
    logger.info("Processing /extract-text request for file=%s", file.filename)

    if file is None:
        raise HTTPException(status_code=400, detail="No file provided.")

    is_pdf_type = file.content_type == "application/pdf"
    has_pdf_extension = file.filename.lower().endswith(".pdf") if file.filename else False
    if not (is_pdf_type or has_pdf_extension):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    raw_bytes = _read_upload_bytes(file)
    result = extract_text_from_pdf_bytes(raw_bytes)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    return ExtractTextResponse(
        filename=file.filename or "unknown.pdf",
        extracted_text=result["text"],
        page_count=result["page_count"],
        status="success",
    )
