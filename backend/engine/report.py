"""
PDF report generation for stormwater site assessments.
Uses reportlab to produce a professional downloadable report.
"""

from __future__ import annotations

import io
import datetime
from typing import Optional

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        HRFlowable,
    )
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


def _fmt_money(val: float) -> str:
    if val >= 1_000_000:
        return f"${val / 1_000_000:.1f}M"
    if val >= 1_000:
        return f"${val / 1_000:.0f}K"
    return f"${val:.0f}"


def generate_report(
    site_name: str,
    factory_name: str,
    analysis: dict,
    compliance: dict,
    green_infra: list,
    costs: dict,
    lat: float,
    lng: float,
) -> Optional[bytes]:
    """
    Generate a PDF site assessment report.
    Returns PDF bytes, or None if reportlab is not installed.
    """
    if not HAS_REPORTLAB:
        return None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("CustomTitle", parent=styles["Title"], fontSize=22, spaceAfter=6,
                                  textColor=colors.HexColor("#1e3a5f"))
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=11,
                                     textColor=colors.gray, spaceAfter=20)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=14, spaceBefore=16,
                                    spaceAfter=8, textColor=colors.HexColor("#1e3a5f"))
    body_style = styles["Normal"]
    body_style.fontSize = 10
    body_style.leading = 14

    elements = []

    # ── Header ─────────────────────────────────────────────────────────
    elements.append(Paragraph("Runny — Stormwater Site Assessment", title_style))
    elements.append(Paragraph(
        f"Generated {datetime.datetime.now().strftime('%B %d, %Y')} | EPA SWMM Engine",
        subtitle_style,
    ))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3b82f6")))
    elements.append(Spacer(1, 12))

    # ── Site Overview ──────────────────────────────────────────────────
    elements.append(Paragraph("Site Overview", section_style))
    score = analysis.get("score", {})
    config = analysis.get("config", {})
    overview_data = [
        ["Site", site_name],
        ["Factory Type", factory_name],
        ["Location", f"{lat:.4f}°N, {abs(lng):.4f}°W"],
        ["Soil Group", config.get("soil_group", "—")],
        ["Slope", f"{config.get('slope', 0) * 100:.1f}%"],
        ["Impervious Cover", f"{config.get('frac_imperv', 0) * 100:.0f}%"],
        ["Area", f"{config.get('area_sqft', 0) / 43560:.1f} acres"],
    ]
    t = Table(overview_data, colWidths=[2 * inch, 4 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))

    # ── Environmental Score ────────────────────────────────────────────
    elements.append(Paragraph("Environmental Impact Score", section_style))
    elements.append(Paragraph(
        f"<b>Grade: {score.get('grade', '—')}</b> — Overall Score: "
        f"{score.get('overall', 0):.0f}/100",
        body_style,
    ))
    elements.append(Paragraph(
        f"Runoff Increase: +{score.get('runoff_increase_pct', 0):.0f}% | "
        f"Peak Flow Increase: +{score.get('peak_flow_increase_pct', 0):.0f}%",
        body_style,
    ))
    elements.append(Spacer(1, 8))

    # Storm comparison table
    comparison = analysis.get("comparison", [])
    if comparison:
        storm_data = [["Storm", "Rain (in)", "Pre-Dev Runoff (ft³)", "Post-Dev Runoff (ft³)", "Pre-Dev Peak (cfs)", "Post-Dev Peak (cfs)"]]
        for c in comparison:
            storm_data.append([
                c["label"],
                f"{c['total_rain_in']:.1f}",
                f"{c['baseline_runoff_ft3']:,.0f}",
                f"{c['factory_runoff_ft3']:,.0f}",
                f"{c['baseline_peak_cfs']:.3f}",
                f"{c['factory_peak_cfs']:.3f}",
            ])
        t2 = Table(storm_data, colWidths=[1.1 * inch, 0.7 * inch, 1.2 * inch, 1.2 * inch, 1.0 * inch, 1.0 * inch])
        t2.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.append(t2)
    elements.append(Spacer(1, 12))

    # ── Regulatory Compliance ──────────────────────────────────────────
    if compliance:
        elements.append(Paragraph("Regulatory Compliance", section_style))
        elements.append(Paragraph(
            f"<b>Status: {compliance.get('overall_label', '—')}</b> — "
            f"{compliance.get('pass_count', 0)} pass, "
            f"{compliance.get('warning_count', 0)} warnings, "
            f"{compliance.get('fail_count', 0)} failures",
            body_style,
        ))
        elements.append(Spacer(1, 6))

        for check in compliance.get("checks", []):
            status_colors = {
                "pass": "green", "fail": "red",
                "warning": "#b45309", "required": "#b45309",
                "not-required": "gray", "advisory": "gray",
            }
            color = status_colors.get(check["status"], "black")
            elements.append(Paragraph(
                f'<font color="{color}">● {check["status"].upper()}</font> — '
                f'<b>{check["name"]}</b> ({check["category"]})',
                body_style,
            ))
            elements.append(Paragraph(f'    {check["description"]}', body_style))
            if check.get("action"):
                elements.append(Paragraph(
                    f'    <i>Action: {check["action"]}</i>', body_style,
                ))
            elements.append(Spacer(1, 4))

    # ── Green Infrastructure ───────────────────────────────────────────
    if green_infra:
        elements.append(Paragraph("Recommended Green Infrastructure", section_style))
        gi_data = [["BMP", "Suitable", "Volume Red.", "Peak Red.", "Install Cost", "Annual Maint."]]
        for gi in green_infra[:5]:
            gi_data.append([
                gi["name"],
                "Yes" if gi["suitable"] else "Limited",
                f"{gi['volume_reduction_pct']:.0f}%",
                f"{gi['peak_reduction_pct']:.0f}%",
                _fmt_money(gi["install_cost"]),
                _fmt_money(gi["annual_maintenance"]),
            ])
        t3 = Table(gi_data, colWidths=[1.4 * inch, 0.7 * inch, 0.8 * inch, 0.8 * inch, 0.9 * inch, 0.9 * inch])
        t3.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#166534")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
        ]))
        elements.append(t3)
    elements.append(Spacer(1, 12))

    # ── Cost-Benefit Analysis ──────────────────────────────────────────
    if costs:
        elements.append(Paragraph("Cost-Benefit Analysis", section_style))
        summary = costs.get("summary", {})
        elements.append(Paragraph(
            f"<b>Rating: {summary.get('cost_rating', '—')}</b> — "
            f"Total Upfront: {_fmt_money(summary.get('total_upfront', 0))} | "
            f"Annual: {_fmt_money(summary.get('total_annual', 0))} | "
            f"20-Year Lifecycle: {_fmt_money(summary.get('total_20yr_lifecycle', 0))}",
            body_style,
        ))
        elements.append(Spacer(1, 8))

        bd = costs.get("breakdown", {})
        cost_data = [["Category", "Amount"]]
        for label, key in [
            ("Land Acquisition", "land"),
            ("Construction", "construction"),
            ("Site Preparation", "site_prep"),
            ("Stormwater Mitigation", "stormwater_mitigation"),
            ("Permits & Fees", "permits"),
        ]:
            cost_data.append([label, _fmt_money(bd.get(key, 0))])
        cost_data.append(["TOTAL UPFRONT", _fmt_money(summary.get("total_upfront", 0))])

        t4 = Table(cost_data, colWidths=[3 * inch, 2 * inch])
        t4.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        elements.append(t4)

        # Risk factors
        risk_factors = costs.get("risk_factors", [])
        if risk_factors:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("<b>Risk Factors:</b>", body_style))
            for rf in risk_factors:
                sev = rf["severity"]
                color = "red" if sev == "high" else "#b45309"
                elements.append(Paragraph(
                    f'<font color="{color}">▲ {rf["factor"]}</font> — '
                    f'Lifetime impact: {_fmt_money(rf["lifetime_impact"])}',
                    body_style,
                ))

    # ── Footer ─────────────────────────────────────────────────────────
    elements.append(Spacer(1, 24))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1")))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        "Report generated by Runny — Stormwater Runoff Forecasting Tool. "
        "Powered by EPA SWMM 5.2 methodology (public domain). "
        "Data sources: USDA SSURGO, NOAA Atlas 14, FEMA NFHL, USGS EPQS.",
        ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=colors.gray),
    ))

    doc.build(elements)
    return buf.getvalue()
