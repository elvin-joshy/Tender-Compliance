import re
from io import BytesIO
from typing import Any, Dict

import pdfplumber
from fastapi import UploadFile


def clean_extracted_text(text: str) -> str:
    # Keep printable chars, normalize whitespace, and collapse repeated spaces.
    printable_text = "".join(ch for ch in text if ch.isprintable() or ch in "\n\r\t")
    normalized = printable_text.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def extract_text_from_pdf(pdf_file: UploadFile) -> Dict[str, Any]:
    try:
        raw_bytes = pdf_file.file.read()
        if not raw_bytes:
            return {
                "status": "error",
                "text": "",
                "page_count": 0,
                "error": "Uploaded file is empty.",
            }

        with pdfplumber.open(BytesIO(raw_bytes)) as pdf:
            text_chunks = [(page.extract_text() or "") for page in pdf.pages]
            combined_text = " ".join(text_chunks)
            cleaned_text = clean_extracted_text(combined_text)

            return {
                "status": "success",
                "text": cleaned_text,
                "page_count": len(pdf.pages),
                "error": None,
            }
    except Exception as exc:
        return {
            "status": "error",
            "text": "",
            "page_count": 0,
            "error": f"PDF extraction failed: {str(exc)}",
        }
