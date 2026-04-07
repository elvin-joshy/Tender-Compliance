import re
from typing import Dict


RISK_PATTERNS = [
    r"\bmay\b",
    r"\bcan\b",
    r"\bsubject\s+to\b",
    r"\bif\s+possible\b",
]


def detect_vague_or_risky_language(proposal_text: str) -> Dict[str, object]:
    """
    Detect non-committal language in proposal text.

    Returns:
    {
      "risk_flag": true,
      "reason": "Contains non-committal language"
    }
    """
    text = (proposal_text or "").strip()
    if not text:
        return {
            "risk_flag": False,
            "reason": "No risky language detected",
        }

    lowered = text.lower()
    found_match = any(re.search(pattern, lowered) for pattern in RISK_PATTERNS)

    if found_match:
        return {
            "risk_flag": True,
            "reason": "Contains non-committal language",
        }

    return {
        "risk_flag": False,
        "reason": "No risky language detected",
    }
