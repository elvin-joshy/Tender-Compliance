from typing import Any, Dict, List

from app.services.semantic_matcher import match_requirements_semantically


def match_requirements(
    requirements: List[str], proposal_text: str
) -> List[Dict[str, Any]]:
    """Match requirement texts against proposal text using semantic similarity."""
    return match_requirements_semantically(requirements, proposal_text)
