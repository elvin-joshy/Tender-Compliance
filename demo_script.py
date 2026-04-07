import os
from pathlib import Path

import requests

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
TEST_CASES_DIR = Path(__file__).resolve().parent / "test_cases"


def run_case(level: str) -> dict:
    rfp_path = TEST_CASES_DIR / f"{level}_rfp.txt"
    proposal_path = TEST_CASES_DIR / f"{level}_proposal.txt"

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


def print_case_summary(level: str, payload: dict) -> None:
    results = payload.get("validation_results", [])
    matched = sum(1 for item in results if item.get("status") == "Matched")
    weak = sum(1 for item in results if item.get("status") == "Weak")
    missing = sum(1 for item in results if item.get("status") == "Missing")

    print(f"\n--- {level.upper()} ---")
    print(f"Matched={matched} Weak={weak} Missing={missing}")

    if level == "level1":
        print("Expected demo narrative: mostly matched requirements.")
    elif level == "level2":
        print("Expected demo narrative: mixed compliance with some weak matches.")
    elif level == "level3":
        print("Expected demo narrative: high risk and multiple violations.")

    risk = payload.get("risk_flags", {})
    print(f"Risk Flag={risk.get('risk_flag')} Reason={risk.get('reason')}")


def main() -> None:
    print("Tender Compliance Demo Script")
    print(f"API: {BASE_URL}")

    for level in ["level1", "level2", "level3"]:
        payload = run_case(level)
        print_case_summary(level, payload)

    print("\nDemo completed successfully.")


if __name__ == "__main__":
    main()
