import re
import importlib
from functools import lru_cache
from typing import Any, Dict, List

try:
    spacy = importlib.import_module("spacy")
except Exception:  # pragma: no cover
    spacy = None


_NLP = None


MANDATORY_KEYWORDS = ("must", "shall", "required", "mandatory")


def _normalize_text(text: str) -> str:
    # Normalize whitespace while preserving sentence punctuation.
    normalized = text.replace("\r", "\n")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{2,}", "\n", normalized)
    return normalized.strip()


def _split_sentences_spacy(text: str) -> List[str]:
    if spacy is None:
        return []

    global _NLP
    if _NLP is None:
        # Lightweight pipeline: no model download required.
        _NLP = spacy.blank("en")
        if "sentencizer" not in _NLP.pipe_names:
            _NLP.add_pipe("sentencizer")

    doc = _NLP(text)
    return [sent.text.strip() for sent in doc.sents if sent.text and sent.text.strip()]


def _split_sentences_regex(text: str) -> List[str]:
    # Split on punctuation + whitespace/newline and bullet-like lines.
    return list(_split_sentences_regex_cached(text))


@lru_cache(maxsize=128)
def _split_sentences_regex_cached(text: str) -> tuple[str, ...]:
    candidate_parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    sentences: List[str] = []

    for part in candidate_parts:
        cleaned = re.sub(r"^[\-\u2022\d.)\s]+", "", part).strip()
        if cleaned:
            sentences.append(cleaned)

    return tuple(sentences)


def _contains_mandatory_keyword(sentence: str) -> bool:
    lowered = sentence.lower()
    return any(re.search(rf"\b{keyword}\b", lowered) for keyword in MANDATORY_KEYWORDS)


def _categorize_requirement(sentence: str) -> str:
    lowered = sentence.lower()

    if "payment" in lowered or "cost" in lowered:
        return "Financial"
    if "law" in lowered or "compliance" in lowered:
        return "Legal"
    return "Technical"


def extract_mandatory_requirements(rfp_text: str) -> List[Dict[str, Any]]:
    """
    Extract mandatory requirements from RFP text.

    Returns a JSON-serializable list shaped like:
    [
      {
        "id": 1,
        "text": "Vendor must provide ISO certification",
        "category": "Legal"
      }
    ]
    """
    if not rfp_text or not rfp_text.strip():
        return []

    normalized = _normalize_text(rfp_text)

    sentences = _split_sentences_spacy(normalized)
    if not sentences:
        sentences = _split_sentences_regex(normalized)

    results: List[Dict[str, Any]] = []
    next_id = 1

    for sentence in sentences:
        if _contains_mandatory_keyword(sentence):
            results.append(
                {
                    "id": next_id,
                    "text": sentence,
                    "category": _categorize_requirement(sentence),
                }
            )
            next_id += 1

    return results
