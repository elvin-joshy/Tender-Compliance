from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pymongo.errors import PyMongoError  # type: ignore[import-not-found]

from backend.config.db import MongoConnection
from app.config import settings


def build_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(results)
    matched = sum(1 for item in results if item.get("status") == "Matched")
    weak = sum(1 for item in results if item.get("status") == "Weak")
    missing = sum(1 for item in results if item.get("status") == "Missing")

    compliance_score = round(((matched + (0.5 * weak)) / total) * 100, 2) if total > 0 else 0.0

    return {
        "total_requirements": total,
        "matched_count": matched,
        "weak_count": weak,
        "missing_count": missing,
        "compliance_score": compliance_score,
    }


def _serialize_analysis(doc: Dict[str, Any], include_text: bool = True) -> Dict[str, Any]:
    payload = {key: value for key, value in doc.items() if key != "_id"}

    if isinstance(payload.get("timestamp"), datetime):
        payload["timestamp"] = payload["timestamp"].isoformat()

    if not include_text:
        payload.pop("rfp_text", None)
        payload.pop("proposal_text", None)

    return payload


def create_analysis_record(
    rfp_text: str,
    proposal_text: str,
    results: List[Dict[str, Any]],
    summary: Dict[str, Any],
    risk_flags: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "analysis_id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc),
        "rfp_text": rfp_text,
        "proposal_text": proposal_text,
        "results": results,
        "summary": summary,
        "risk_flags": risk_flags,
    }


def save_analysis(record: Dict[str, Any]) -> Dict[str, Any]:
    try:
        collection = MongoConnection.get_analyses_collection()
        collection.insert_one(record)
        return _serialize_analysis(record, include_text=True)
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to save analysis: {str(exc)}") from exc


def list_analyses() -> List[Dict[str, Any]]:
    try:
        collection = MongoConnection.get_analyses_collection()
        cursor = collection.find({}, {"_id": 0}).sort("timestamp", -1)
        return [_serialize_analysis(doc, include_text=False) for doc in cursor]
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to list analyses: {str(exc)}") from exc


def get_analysis_by_id(analysis_id: str) -> Optional[Dict[str, Any]]:
    try:
        collection = MongoConnection.get_analyses_collection()
        document = collection.find_one({settings.mongo_analysis_id_field: analysis_id}, {"_id": 0})
        if not document:
            return None
        return _serialize_analysis(document, include_text=True)
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to fetch analysis: {str(exc)}") from exc


def delete_analysis_by_id(analysis_id: str) -> bool:
    try:
        collection = MongoConnection.get_analyses_collection()
        result = collection.delete_one({settings.mongo_analysis_id_field: analysis_id})
        return result.deleted_count > 0
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to delete analysis: {str(exc)}") from exc
