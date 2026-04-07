from pathlib import Path
import os

import requests

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
TEST_CASES_DIR = Path(__file__).resolve().parent / "test_cases"


def discover_test_levels() -> list[str]:
    levels: list[str] = []
    for rfp_path in sorted(TEST_CASES_DIR.glob("*_rfp.txt")):
        level_name = rfp_path.stem.replace("_rfp", "")
        proposal_path = TEST_CASES_DIR / f"{level_name}_proposal.txt"
        if proposal_path.exists():
            levels.append(level_name)
    return levels


def send_validation_request(level_name: str) -> dict:
    rfp_path = TEST_CASES_DIR / f"{level_name}_rfp.txt"
    proposal_path = TEST_CASES_DIR / f"{level_name}_proposal.txt"

    with rfp_path.open("rb") as rfp_file, proposal_path.open("rb") as proposal_file:
        files = {
            "rfp": (rfp_path.name, rfp_file, "text/plain"),
            "proposal": (proposal_path.name, proposal_file, "text/plain"),
        }
        response = requests.post(f"{BASE_URL}/validate", files=files, timeout=120)

    response.raise_for_status()
    return response.json()


def print_result(level_name: str, payload: dict) -> None:
    validation_results = payload.get("validation_results", [])
    global_risk_flag = payload.get("risk_flags", {}).get("risk_flag", False)

    print("\n" + "=" * 72)
    print(f"TEST CASE: {level_name}")
    print("=" * 72)

    if not validation_results:
        print("No requirements extracted for this test case.")
        return

    for item in validation_results:
        requirement = item.get("requirement", "")
        status = item.get("status", "Unknown")
        confidence = item.get("confidence", 0.0)
        row_risk = bool(global_risk_flag and status in {"Weak", "Missing"})

        print(f"Requirement : {requirement}")
        print(f"Status      : {status}")
        print(f"Confidence  : {confidence:.4f}")
        print(f"Risk Flag   : {row_risk}")
        print("-" * 72)


def main() -> None:
    if not TEST_CASES_DIR.exists():
        raise FileNotFoundError(f"Missing directory: {TEST_CASES_DIR}")

    levels = discover_test_levels()
    if not levels:
        print("No valid test case pairs found in test_cases/.")
        return

    print(f"Using API endpoint: {BASE_URL}/validate")

    for level_name in levels:
        try:
            payload = send_validation_request(level_name)
            print_result(level_name, payload)
        except requests.RequestException as exc:
            print("\n" + "=" * 72)
            print(f"TEST CASE: {level_name}")
            print("=" * 72)
            print(f"Request failed: {exc}")
            print("-" * 72)


if __name__ == "__main__":
    main()
