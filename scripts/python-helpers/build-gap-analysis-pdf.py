from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "excel-app-gap-analysis.md"
OUTPUT = ROOT / "docs" / "excel-app-gap-analysis.pdf"


def clean_inline(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_separator_row(line: str) -> bool:
    cells = split_table_row(line)
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def column_widths(headers: list[str], available_width: float) -> list[float]:
    count = len(headers)
    if count == 2:
        return [available_width * 0.24, available_width * 0.76]
    if count == 3:
        return [available_width * 0.22, available_width * 0.34, available_width * 0.44]
    if count == 4:
        return [available_width * 0.18, available_width * 0.28, available_width * 0.26, available_width * 0.28]
    if count == 5:
        return [
            available_width * 0.11,
            available_width * 0.17,
            available_width * 0.22,
            available_width * 0.25,
            available_width * 0.25,
        ]
    return [available_width / max(count, 1)] * count


def build_pdf() -> None:
    markdown = SOURCE.read_text(encoding="utf-8").splitlines()
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleCustom",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=26,
            spaceAfter=12,
            textColor=colors.HexColor("#1f2937"),
            alignment=TA_LEFT,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Heading1Custom",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            spaceBefore=14,
            spaceAfter=7,
            textColor=colors.HexColor("#1f2937"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Heading2Custom",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=15,
            spaceBefore=10,
            spaceAfter=5,
            textColor=colors.HexColor("#374151"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            spaceAfter=7,
            textColor=colors.HexColor("#111827"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=9,
            textColor=colors.HexColor("#111827"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHeader",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.4,
            leading=9,
            textColor=colors.white,
        )
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.5 * inch,
        title="Excel vs App Gap Analysis",
    )
    available_width = LETTER[0] - doc.leftMargin - doc.rightMargin
    story = []
    i = 0

    while i < len(markdown):
        line = markdown[i].strip()
        if not line:
            i += 1
            continue

        if line.startswith("# "):
            story.append(Paragraph(clean_inline(line[2:]), styles["TitleCustom"]))
            story.append(Spacer(1, 0.06 * inch))
            i += 1
            continue

        if line.startswith("## "):
            title = line[3:]
            if title in {"Data In Excel But Missing Or Weak In App", "App Data Not Present In Excel"}:
                story.append(PageBreak())
            story.append(Paragraph(clean_inline(title), styles["Heading1Custom"]))
            i += 1
            continue

        if line.startswith("### "):
            story.append(Paragraph(clean_inline(line[4:]), styles["Heading2Custom"]))
            i += 1
            continue

        if line.startswith("|") and i + 1 < len(markdown) and is_separator_row(markdown[i + 1]):
            headers = split_table_row(line)
            rows = [headers]
            i += 2
            while i < len(markdown) and markdown[i].strip().startswith("|"):
                rows.append(split_table_row(markdown[i]))
                i += 1

            table_data = []
            for row_index, row in enumerate(rows):
                style = styles["TableHeader"] if row_index == 0 else styles["TableCell"]
                table_data.append([Paragraph(clean_inline(cell), style) for cell in row])

            table = Table(
                table_data,
                colWidths=column_widths(headers, available_width),
                repeatRows=1,
                hAlign="LEFT",
            )
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 4),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                    ]
                )
            )
            story.append(table)
            story.append(Spacer(1, 0.12 * inch))
            continue

        if re.match(r"^\d+\. ", line):
            items = []
            while i < len(markdown):
                current = markdown[i]
                if not re.match(r"^\d+\. ", current.strip()):
                    break
                text = re.sub(r"^\d+\. ", "", current.strip())
                children = []
                i += 1
                while i < len(markdown) and markdown[i].startswith("   - "):
                    children.append(markdown[i].strip()[2:].strip())
                    i += 1
                body = Paragraph(clean_inline(text), styles["BodyCustom"])
                if children:
                    child_list = ListFlowable(
                        [ListItem(Paragraph(clean_inline(child), styles["BodyCustom"])) for child in children],
                        bulletType="bullet",
                        leftIndent=14,
                    )
                    items.append(ListItem([body, child_list]))
                else:
                    items.append(ListItem(body))
            story.append(ListFlowable(items, bulletType="1", leftIndent=16))
            story.append(Spacer(1, 0.08 * inch))
            continue

        if line.startswith("- "):
            items = []
            while i < len(markdown) and markdown[i].strip().startswith("- "):
                items.append(
                    ListItem(Paragraph(clean_inline(markdown[i].strip()[2:]), styles["BodyCustom"]))
                )
                i += 1
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=14))
            story.append(Spacer(1, 0.05 * inch))
            continue

        story.append(Paragraph(clean_inline(line), styles["BodyCustom"]))
        i += 1

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
