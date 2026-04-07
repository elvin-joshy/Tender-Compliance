import os
from typing import Tuple

import requests

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


def _print_case_result(name: str, success: bool, details: str) -> None:
    status = "PASS" if success else "FAIL"
    print(f"[{status}] {name}: {details}")


def test_empty_files() -> Tuple[bool, str]:
    response = requests.post(
        f"{BASE_URL}/validate",
        files={
            "rfp": ("empty_rfp.txt", b"", "text/plain"),
            "proposal": ("empty_proposal.txt", b"", "text/plain"),
        },
        timeout=120,
    )
    ok = response.status_code == 400
    return ok, f"status={response.status_code}, body={response.text[:120]}"


def test_corrupt_pdf() -> Tuple[bool, str]:
    response = requests.post(
        f"{BASE_URL}/validate",
        files={
            "rfp": ("corrupt.pdf", b"not-a-real-pdf-content", "application/pdf"),
            "proposal": ("proposal.txt", b"We provide all features.", "text/plain"),
        },
        timeout=120,
    )
    ok = response.status_code == 400
    return ok, f"status={response.status_code}, body={response.text[:120]}"


def test_no_requirements_detected() -> Tuple[bool, str]:
    response = requests.post(
        f"{BASE_URL}/validate",
        files={
            "rfp": (
                "rfp.txt",
                b"This document describes optional context and background information.",
                "text/plain",
            ),
            "proposal": ("proposal.txt", b"We provide a modern implementation.", "text/plain"),
        },
        timeout=120,
    )

    if response.status_code != 200:
        return False, f"status={response.status_code}, body={response.text[:120]}"

    payload = response.json()
    no_requirements = payload.get("validation_results") == []
    return no_requirements, f"status={response.status_code}, validation_results={payload.get('validation_results')}"


def test_very_large_documents() -> Tuple[bool, str]:
    large_text = ("mandatory requirement. " * (1024 * 1024)).encode("utf-8")

    response = requests.post(
        f"{BASE_URL}/validate",
        files={
            "rfp": ("large_rfp.txt", large_text, "text/plain"),
            "proposal": ("large_proposal.txt", large_text, "text/plain"),
        },
        timeout=120,
    )

    ok = response.status_code in {400, 413}
    return ok, f"status={response.status_code}, body={response.text[:120]}"


def main() -> None:
    print(f"Target API: {BASE_URL}/validate")

    checks = [
        ("Empty files", test_empty_files),
        ("Corrupt file", test_corrupt_pdf),
        ("No requirements detected", test_no_requirements_detected),
        ("Very large documents", test_very_large_documents),
    ]

    pass_count = 0

    for name, fn in checks:
        try:
            ok, details = fn()
            if ok:
                pass_count += 1
            _print_case_result(name, ok, details)
        except Exception as exc:
            _print_case_result(name, False, f"exception={str(exc)}")

    print("\nEdge case summary:")
    print(f"passed={pass_count} total={len(checks)}")


if __name__ == "__main__":
    main()
