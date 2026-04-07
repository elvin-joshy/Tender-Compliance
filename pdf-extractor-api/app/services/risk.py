from typing import Dict

from app.services.risk_detector import detect_vague_or_risky_language


def detect_risk_in_proposal(proposal_text: str) -> Dict[str, object]:
    """Detect vague or non-committal language in proposal text."""
    return detect_vague_or_risky_language(proposal_text)
