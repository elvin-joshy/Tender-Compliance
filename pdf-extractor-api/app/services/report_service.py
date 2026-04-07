from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _is_high_risk(item: Dict[str, Any]) -> bool:
    status = str(item.get("status", "")).strip().lower()
    confidence = float(item.get("confidence", 0.0) or 0.0)

    return status in {"missing", "weak"} or confidence < 0.5


def generate_compliance_report_pdf(validation_payload: Dict[str, Any]) -> bytes:
    """
    Generate a downloadable compliance PDF report.

    The report includes:
    - Summary (total requirements, matched, missing)
    - Detailed table of validation results
    - Highlighted high-risk rows
    """
    results: List[Dict[str, Any]] = list(
        validation_payload.get("validation_results") or validation_payload.get("results") or []
    )

    summary = validation_payload.get("summary") or {}
    total_requirements = int(summary.get("total_requirements", len(results)))
    matched_count = int(
        summary.get(
            "matched_count",
            sum(1 for item in results if str(item.get("status", "")).lower() == "matched"),
        )
    )
    missing_count = int(
        summary.get(
            "missing_count",
            sum(1 for item in results if str(item.get("status", "")).lower() == "missing"),
        )
    )

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.4 * cm,
        leftMargin=1.4 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
    )

    story = []
    story.append(Paragraph("Compliance Report", title_style))
    story.append(
        Paragraph(
            (
                f"Summary: Total Requirements = {total_requirements}, "
                f"Matched = {matched_count}, Missing = {missing_count}"
            ),
            styles["BodyText"],
        )
    )
    story.append(Spacer(1, 10))

    table_rows: List[List[Any]] = [
        ["#", "Requirement", "Status", "Confidence", "Matched Text", "Risk"]
    ]

    for idx, item in enumerate(results, start=1):
        requirement = str(item.get("requirement", ""))
        status = str(item.get("status", ""))
        confidence = float(item.get("confidence", 0.0) or 0.0)
        matched_text = str(item.get("matched_text", ""))

        high_risk = _is_high_risk(item)

        table_rows.append(
            [
                str(idx),
                Paragraph(requirement or "-", body_style),
                status or "-",
                f"{confidence:.2f}",
                Paragraph(matched_text or "-", body_style),
                "HIGH" if high_risk else "Normal",
            ]
        )

    col_widths = [1.0 * cm, 5.0 * cm, 2.3 * cm, 2.2 * cm, 6.2 * cm, 2.0 * cm]
    results_table = Table(table_rows, colWidths=col_widths, repeatRows=1)

    table_style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 1), (3, -1), "CENTER"),
        ("ALIGN", (5, 1), (5, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D1D5DB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
    ]

    for row_index, item in enumerate(results, start=1):
        if _is_high_risk(item):
            table_style_commands.append(
                ("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#FEE2E2"))
            )
            table_style_commands.append(
                ("TEXTCOLOR", (5, row_index), (5, row_index), colors.HexColor("#991B1B"))
            )

    results_table.setStyle(TableStyle(table_style_commands))

    story.append(results_table)
    document.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
