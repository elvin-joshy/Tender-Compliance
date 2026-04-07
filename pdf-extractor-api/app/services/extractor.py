from typing import Any, Dict, List

from app.services.requirement_extractor import extract_mandatory_requirements


def extract_requirements_from_rfp(rfp_text: str) -> List[Dict[str, Any]]:
    """Extract mandatory requirements from RFP text."""
    return extract_mandatory_requirements(rfp_text)
