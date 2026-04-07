from pathlib import Path
import os

import requests

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
TEST_CASES_DIR = Path(__file__).resolve().parent / "test_cases"
LEVELS = ["level1", "level2", "level3"]


def _post_validate(level: str) -> dict:
    rfp_path = TEST_CASES_DIR / f"{level}_rfp.txt"
    proposal_path = TEST_CASES_DIR / f"{level}_proposal.txt"

    if not rfp_path.exists() or not proposal_path.exists():
        raise FileNotFoundError(f"Missing test files for {level}")

    with rfp_path.open("rb") as rfp_file, proposal_path.open("rb") as proposal_file:
        response = requests.post(
            f"{BASE_URL}/validate",
            files={
                "rfp": (rfp_path.name, rfp_file, "text/plain"),
                "proposal": (proposal_path.name, proposal_file, "text/plain"),
            },
            timeout=120,
        )

    response.raise_for_status()
    return response.json()


def _print_level_output(level: str, payload: dict) -> tuple[int, int, int]:
    results = payload.get("validation_results", [])

    matched = sum(1 for item in results if item.get("status") == "Matched")
    missing = sum(1 for item in results if item.get("status") == "Missing")
    total = len(results)

    print(f"\n=== {level.upper()} ===")

    if not results:
        print("No requirements detected.")
        return 0, 0, 0

    for item in results:
        print(f"Requirement: {item.get('requirement', '')}")
        print(f"Status: {item.get('status', 'Unknown')}")
        print(f"Confidence: {float(item.get('confidence', 0.0)):.2f}")
        print("-")

    return total, matched, missing


def main() -> None:
    total_requirements = 0
    total_matched = 0
    total_missing = 0

    print(f"Target API: {BASE_URL}/validate")

    for level in LEVELS:
        try:
            payload = _post_validate(level)
            total, matched, missing = _print_level_output(level, payload)
            total_requirements += total
            total_matched += matched
            total_missing += missing
        except Exception as exc:
            print(f"\n=== {level.upper()} ===")
            print(f"Error: {str(exc)}")

    compliance_percent = (
        (total_matched / total_requirements) * 100 if total_requirements > 0 else 0.0
    )

    print("\n=== SUMMARY ===")
    print(f"total requirements: {total_requirements}")
    print(f"total matched: {total_matched}")
    print(f"total missing: {total_missing}")
    print(f"compliance %: {compliance_percent:.2f}")


if __name__ == "__main__":
    main()
