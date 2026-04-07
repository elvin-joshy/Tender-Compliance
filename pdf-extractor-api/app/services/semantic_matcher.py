import re
from functools import lru_cache
from typing import Any, Dict, List

from sentence_transformers import SentenceTransformer, util

_MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


def _split_sentences(text: str) -> List[str]:
    normalized = re.sub(r"\s+", " ", text or "").strip()
    if not normalized:
        return []

    return list(_split_sentences_cached(normalized))


@lru_cache(maxsize=128)
def _split_sentences_cached(normalized_text: str) -> tuple[str, ...]:
    parts = re.split(r"(?<=[.!?])\s+", normalized_text)
    return tuple(part.strip() for part in parts if part and part.strip())


@lru_cache(maxsize=64)
def _encode_proposal_sentences_cached(proposal_text: str) -> tuple[tuple[str, ...], Any]:
    proposal_sentences = tuple(_split_sentences(proposal_text))
    if not proposal_sentences:
        return tuple(), None

    model = _get_model()
    sentence_embeddings = model.encode(list(proposal_sentences), convert_to_tensor=True)
    return proposal_sentences, sentence_embeddings


def _to_status(score: float) -> str:
    if score > 0.75:
        return "Matched"
    if score >= 0.5:
        return "Weak"
    return "Missing"


def _to_confidence_reason(score: float) -> str:
    if score > 0.75:
        return "High confidence: strong semantic match"
    if score >= 0.5:
        return "Medium confidence: partial match"
    return "Low confidence: no match"


def match_requirements_semantically(
    requirements: List[str], proposal_text: str
) -> List[Dict[str, Any]]:
    """
    Compare each requirement against proposal sentences using sentence-transformers.

    Input:
    - requirements: list[str]
    - proposal_text: str

    Output:
    [
      {
        "requirement": "...",
        "matched_text": "...",
        "score": 0.82,
                "status": "Matched",
                "confidence": 0.82,
                "reason": "High confidence: strong semantic match"
      }
    ]
    """
    cleaned_requirements = [req.strip() for req in requirements if req and req.strip()]
    proposal_sentences, sentence_embeddings = _encode_proposal_sentences_cached(proposal_text)

    if not cleaned_requirements:
        return []

    if not proposal_sentences:
        return [
            {
                "requirement": req,
                "matched_text": "",
                "score": 0.0,
                "status": "Missing",
                "confidence": 0.0,
                "reason": "Low confidence: no match",
            }
            for req in cleaned_requirements
        ]

    model = _get_model()
    requirement_embeddings = model.encode(cleaned_requirements, convert_to_tensor=True)

    results: List[Dict[str, Any]] = []

    for index, requirement in enumerate(cleaned_requirements):
        similarity_scores = util.cos_sim(requirement_embeddings[index], sentence_embeddings)[0]
        best_idx = int(similarity_scores.argmax().item())
        best_score = float(similarity_scores[best_idx].item())

        results.append(
            {
                "requirement": requirement,
                "matched_text": proposal_sentences[best_idx],
                "score": round(best_score, 4),
                "status": _to_status(best_score),
                "confidence": round(best_score, 4),
                "reason": _to_confidence_reason(best_score),
            }
        )

    return results
