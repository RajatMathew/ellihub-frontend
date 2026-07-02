#!/usr/bin/env python3
"""Build project seed JSON files from the client workbook exports.

The project seed runner consumes JSON so that database seeding stays deterministic.
This converter keeps every workbook tab represented in JSON, including tabs the
original project seed ignored.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


DEFAULT_INPUT_DIR = Path("/Users/albertfredy/Downloads/CF Project Files v3")
DEFAULT_OUTPUT_DIR = Path("scripts/data/project-seeds")

CLEAN_HEADER_NAMES = {
    "Amount (auto)": "Amount",
    "Contract Document Link (OneDrive URL)": "Contract_Document_Link",
    "Contract Scheduled Document Link (OneDrive or PDF)": "Contract_Scheduled_Document_Link",
    "Linked_RFQ_ID (optional)": "Linked_RFQ_ID",
    "Markup_Pct (e.g. 10 = 10%)": "Markup_Pct",
    "Payment_Terms (e.g. Net 30)": "Payment_Terms",
    "Payment_Terms (e.g. Net 30, Net 60)": "Payment_Terms",
    "Price (Qty × Unit_Price)": "Price",
    "Total_CO_Amount (auto)": "Total_CO_Amount",
}

SHEET_SUFFIXES = {
    "PROJECT": "project",
    "PRIME_CONTRACTS": "primeContracts",
    "RFQS": "rfqs",
    "RFQ_LINE_ITEMS": "rfqLineItems",
    "RFQ_ATTACHMENTS": "rfqAttachments",
    "PURCHASE_ORDERS": "purchaseOrders",
    "PO_LINE_ITEMS": "poLineItems",
    "PO_PAYMENTS": "poPayments",
    "PO_CHANGE_ORDERS": "poChangeOrders",
    "PO_CO_LINE_ITEMS": "poCoLineItems",
}

PROJECT_DIVISIONS = ["SCA", "DDC", "CIVIL", "INSTITUTIONAL"]
TARGET_BUDGET_PERCENTS = ["60", "50", "55", "65", "70", "58", "62", "52", "68", "57", "63"]
PROJECT_DATE_KEYS_TO_CLEAR = [
    "Start_Date",
    "End_Date",
    "Estimated_Start_Date",
    "Estimated_End_Date",
    "Actual_Start_Date",
    "Actual_Completion_Date",
]


def normalize_header(value: Any) -> str:
    header = str(value).replace("\n", " ").strip()
    return CLEAN_HEADER_NAMES.get(header, header)


def json_value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.time().isoformat() == "00:00:00":
            return value.date().isoformat()
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return format(value.normalize(), "f")
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return format(value, "f").rstrip("0").rstrip(".")
    text = str(value).strip()
    return text or None


def row_is_empty(row: dict[str, str | None]) -> bool:
    return all(value is None for value in row.values())


def sheet_key(sheet_name: str) -> str | None:
    normalized = sheet_name.upper().strip()
    for suffix, key in SHEET_SUFFIXES.items():
        if normalized.endswith(f" - {suffix}") or normalized == suffix:
            return key

    compact = "".join(char for char in normalized if char.isalnum())
    compact_aliases = {
        "PRIMECONTRACTS": "primeContracts",
        "RFQLINEITEMS": "rfqLineItems",
        "RFQATTACHMENTS": "rfqAttachments",
        "PURCHASEORDERS": "purchaseOrders",
        "POLINEITEMS": "poLineItems",
        "POPAYMENTS": "poPayments",
        "POCHANGEORDER": "poChangeOrders",
        "POCHANGEORDERS": "poChangeOrders",
        "POCHANGEORDERSS": "poChangeOrders",
        "POCOLINEITEM": "poCoLineItems",
        "POCOLINEITEMS": "poCoLineItems",
    }
    for suffix, key in compact_aliases.items():
        if compact.endswith(suffix):
            return key
    return None


def sheet_rows(ws) -> list[dict[str, str | None]]:
    header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True), None)
    if not header_row:
        return []
    headers = [normalize_header(header) if header is not None else "" for header in header_row]

    rows: list[dict[str, str | None]] = []
    for values in ws.iter_rows(min_row=2, values_only=True):
        row = {
            header: json_value(value)
            for header, value in zip(headers, values)
            if header
        }
        if not row_is_empty(row):
            rows.append(row)
    return rows


def load_existing_output_map(output_dir: Path) -> dict[str, Path]:
    mapping: dict[str, Path] = {}
    for path in output_dir.glob("project-*.seed.json"):
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        workbook = data.get("sourceWorkbook")
        if isinstance(workbook, str):
            mapping[workbook] = path
    return mapping


def slug_from_workbook(workbook_name: str) -> str:
    stem = Path(workbook_name).stem.lower()
    stem = stem.removeprefix("cf-").replace("..v3", "").replace(".v3", "")
    slug_chars = []
    previous_dash = False
    for char in stem:
        if char.isalnum():
            slug_chars.append(char)
            previous_dash = False
        elif not previous_dash:
            slug_chars.append("-")
            previous_dash = True
    return "".join(slug_chars).strip("-")


def stable_index(value: str, length: int) -> int:
    total = 0
    for char in value:
        total = (total * 31 + ord(char)) % 2**32
    return total % length


def ensure_project_division(seed: dict[str, Any], workbook_name: str) -> None:
    division = PROJECT_DIVISIONS[stable_index(workbook_name, len(PROJECT_DIVISIONS))]

    def apply_division(row: Any) -> None:
        if not isinstance(row, dict):
            return
        row["Division"] = row.get("Division") or division
        row["Contract_Category"] = row.get("Contract_Category") or row["Division"]

    apply_division(seed["project"])
    apply_division(seed["primeContract"])
    for row in seed["primeContracts"]:
        apply_division(row)


def ensure_target_budget_percent(seed: dict[str, Any], workbook_name: str) -> None:
    target_budget_percent = TARGET_BUDGET_PERCENTS[
        stable_index(workbook_name, len(TARGET_BUDGET_PERCENTS))
    ]

    def apply_target_budget_percent(row: Any) -> None:
        if not isinstance(row, dict):
            return
        current = row.get("Target_Budget_Percent")
        if current is None or str(current).strip() == "100":
            row["Target_Budget_Percent"] = target_budget_percent

    apply_target_budget_percent(seed["project"])
    apply_target_budget_percent(seed["primeContract"])
    for row in seed["primeContracts"]:
        apply_target_budget_percent(row)


def keep_only_project_tco_date(seed: dict[str, Any]) -> None:
    def apply_project_dates(row: Any) -> None:
        if not isinstance(row, dict):
            return
        row["TCO_Date"] = (
            row.get("TCO_Date")
            or row.get("End_Date")
            or row.get("Estimated_End_Date")
            or row.get("Actual_Completion_Date")
        )
        for key in PROJECT_DATE_KEYS_TO_CLEAR:
            if key in row:
                del row[key]

    apply_project_dates(seed["project"])
    apply_project_dates(seed["primeContract"])
    for row in seed["primeContracts"]:
        apply_project_dates(row)


def build_seed(workbook_path: Path) -> dict[str, Any]:
    workbook = load_workbook(workbook_path, data_only=True, read_only=True)
    seed: dict[str, Any] = {
        "sourceWorkbook": workbook_path.name,
        "project": {},
        "primeContract": {},
        "primeContracts": [],
        "rfqs": [],
        "rfqLineItems": [],
        "rfqAttachments": [],
        "purchaseOrders": [],
        "poLineItems": [],
        "poPayments": [],
        "poChangeOrders": [],
        "poCoLineItems": [],
    }

    for ws in workbook.worksheets:
        key = sheet_key(ws.title)
        if not key:
            continue
        rows = sheet_rows(ws)
        if key == "project":
            seed["project"] = rows[0] if rows else {}
        else:
            seed[key] = rows

    contract_rows = [
        row
        for row in seed["primeContracts"]
        if row.get("Contract_ID") or row.get("Original_Contract_Value")
    ]
    seed["primeContract"] = contract_rows[0] if contract_rows else (
        seed["primeContracts"][0] if seed["primeContracts"] else {}
    )
    ensure_project_division(seed, workbook_path.name)
    ensure_target_budget_percent(seed, workbook_path.name)
    keep_only_project_tco_date(seed)

    return seed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    input_dir = args.input_dir.expanduser().resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    existing_output_map = load_existing_output_map(output_dir)

    workbook_paths = sorted(input_dir.glob("CF-*.xlsx"))
    if not workbook_paths:
        raise SystemExit(f"No CF workbook files found in {input_dir}")

    for workbook_path in workbook_paths:
        seed = build_seed(workbook_path)
        output_path = existing_output_map.get(
            workbook_path.name,
            output_dir / f"project-{slug_from_workbook(workbook_path.name)}.seed.json",
        )
        output_path.write_text(json.dumps(seed, indent=2, ensure_ascii=False) + "\n")
        print(f"Wrote {output_path} from {workbook_path.name}")


if __name__ == "__main__":
    main()
