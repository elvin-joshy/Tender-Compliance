from fastapi.testclient import TestClient

from app import main as main_module


FAKE_ANALYSIS_ID = "analysis-test-123"


def _fake_extract_requirements(_: str) -> list[dict]:
    return [
        {
            "id": 1,
            "text": "Vendor must provide ISO certification.",
            "category": "Technical",
        },
        {
            "id": 2,
            "text": "Payment terms are mandatory.",
            "category": "Financial",
        },
    ]


def _fake_match_requirements(requirements: list[str], proposal_text: str) -> list[dict]:
    _ = proposal_text
    return [
        {
            "requirement": requirements[0],
            "matched_text": "We provide ISO certification.",
            "score": 0.88,
            "status": "Matched",
            "confidence": 0.88,
            "reason": "High confidence: strong semantic match",
        },
        {
            "requirement": requirements[1],
            "matched_text": "Payment may change subject to approval.",
            "score": 0.49,
            "status": "Missing",
            "confidence": 0.49,
            "reason": "Low confidence: no match",
        },
    ]


def _build_client(monkeypatch) -> TestClient:
    monkeypatch.setattr(main_module, "extract_requirements_from_rfp", _fake_extract_requirements)
    monkeypatch.setattr(main_module, "match_requirements", _fake_match_requirements)
    monkeypatch.setattr(main_module, "create_analysis_record", _fake_create_analysis_record)
    monkeypatch.setattr(main_module, "save_analysis", _fake_save_analysis)
    monkeypatch.setattr(main_module, "list_analyses", _fake_list_analyses)
    monkeypatch.setattr(main_module, "get_analysis_by_id", _fake_get_analysis_by_id)
    monkeypatch.setattr(main_module, "delete_analysis_by_id", _fake_delete_analysis_by_id)
    return TestClient(main_module.app)


def _fake_create_analysis_record(
    rfp_text: str,
    proposal_text: str,
    results: list[dict],
    summary: dict,
    risk_flags: dict,
) -> dict:
    return {
        "analysis_id": FAKE_ANALYSIS_ID,
        "timestamp": "2026-01-01T00:00:00Z",
        "rfp_text": rfp_text,
        "proposal_text": proposal_text,
        "results": results,
        "summary": summary,
        "risk_flags": risk_flags,
    }


def _fake_save_analysis(record: dict) -> dict:
    return record


def _fake_list_analyses() -> list[dict]:
    return [
        _fake_create_analysis_record(
            "rfp",
            "proposal",
            _fake_match_requirements(
                [
                    "Vendor must provide ISO certification.",
                    "Payment terms are mandatory.",
                ],
                "proposal",
            ),
            {
                "total_requirements": 2,
                "matched_count": 1,
                "weak_count": 0,
                "missing_count": 1,
                "compliance_score": 60,
            },
            {
                "risk_flag": True,
                "reason": "Potential risky language detected.",
            },
        )
    ]


def _fake_get_analysis_by_id(analysis_id: str) -> dict | None:
    if analysis_id != FAKE_ANALYSIS_ID:
        return None

    return _fake_list_analyses()[0]


def _fake_delete_analysis_by_id(analysis_id: str) -> bool:
    return analysis_id == FAKE_ANALYSIS_ID


def test_extract_endpoint(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.post("/extract", json={"rfp_text": "test rfp"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 2
    assert payload["requirements"][0]["text"] == "Vendor must provide ISO certification."


def test_validate_text_endpoint(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.post(
        "/validate-text",
        json={
            "rfp_text": "rfp",
            "proposal_text": "proposal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis_id"] == FAKE_ANALYSIS_ID
    assert len(payload["validation_results"]) == 2
    assert len(payload["results"]) == 2
    assert payload["summary"]["total_requirements"] == 2
    assert payload["validation_results"][0]["status"] == "Matched"
    assert payload["missing_requirements"][0]["requirement"] == "Payment terms are mandatory."


def test_validate_file_upload_endpoint(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    files = {
        "rfp": ("rfp.txt", "rfp text", "text/plain"),
        "proposal": ("proposal.txt", "proposal text", "text/plain"),
    }

    response = client.post("/validate", files=files)

    assert response.status_code == 200
    payload = response.json()
    assert "validation_results" in payload
    assert payload["analysis_id"] == FAKE_ANALYSIS_ID
    assert payload["validation_results"][1]["status"] == "Missing"


def test_list_analyses_endpoint(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.get("/analyses")

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 1
    assert payload["analyses"][0]["analysis_id"] == FAKE_ANALYSIS_ID


def test_get_analysis_by_id_endpoint(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.get(f"/analyses/{FAKE_ANALYSIS_ID}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis_id"] == FAKE_ANALYSIS_ID
    assert len(payload["results"]) == 2


def test_delete_analysis_endpoint(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.delete(f"/analyses/{FAKE_ANALYSIS_ID}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"] == "Analysis deleted successfully."


def test_report_for_stored_analysis_returns_pdf(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.get(f"/analyses/{FAKE_ANALYSIS_ID}/report")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_report_text_endpoint_returns_pdf(monkeypatch) -> None:
    client = _build_client(monkeypatch)
    response = client.post(
        "/report-text",
        json={
            "rfp_text": "rfp",
            "proposal_text": "proposal",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "compliance_report.pdf" in response.headers.get("content-disposition", "")
    assert response.content.startswith(b"%PDF")
