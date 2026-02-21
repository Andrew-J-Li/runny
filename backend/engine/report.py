"""
PDF report generation — Stormwater Pollution Prevention Plan (SWPPP) format.
Follows EPA SWPPP Guide structure (EPA 833-R-10-002).
Uses reportlab to produce a professional downloadable SWPPP document.
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
        PageBreak,
    )
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


# ── Color Palette ──────────────────────────────────────────────────────
NAVY = colors.HexColor("#1e3a5f")
BLUE = colors.HexColor("#3b82f6")
LIGHT_BG = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#e2e8f0")
GREEN_BG = colors.HexColor("#166534")
GREEN_LIGHT = colors.HexColor("#f0fdf4")
RED = colors.HexColor("#dc2626")
AMBER = colors.HexColor("#b45309")
GRAY = colors.HexColor("#64748b")


def _fmt_money(val: float) -> str:
    if val >= 1_000_000:
        return f"${val / 1_000_000:.1f}M"
    if val >= 1_000:
        return f"${val / 1_000:.0f}K"
    return f"${val:.0f}"


def _make_styles():
    """Create all paragraph styles used in the SWPPP."""
    styles = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "SWPPPTitle", parent=styles["Title"],
            fontSize=24, spaceAfter=4, textColor=NAVY, fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "SWPPPSubtitle", parent=styles["Normal"],
            fontSize=12, textColor=GRAY, spaceAfter=20,
        ),
        "section": ParagraphStyle(
            "SWPPPSection", parent=styles["Heading2"],
            fontSize=14, spaceBefore=18, spaceAfter=10,
            textColor=NAVY, fontName="Helvetica-Bold",
        ),
        "subsection": ParagraphStyle(
            "SWPPPSubsection", parent=styles["Heading3"],
            fontSize=11, spaceBefore=10, spaceAfter=6,
            textColor=colors.HexColor("#334155"), fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "SWPPPBody", parent=styles["Normal"],
            fontSize=10, leading=14, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "SWPPPSmall", parent=styles["Normal"],
            fontSize=9, leading=12, textColor=GRAY,
        ),
        "footer": ParagraphStyle(
            "SWPPPFooter", parent=styles["Normal"],
            fontSize=8, textColor=GRAY, spaceBefore=4,
        ),
    }


def _table_style_header(header_bg=None):
    """Standard table style with dark header row."""
    if header_bg is None:
        header_bg = NAVY
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ])


def _info_table(data, col1_width=None, col2_width=None):
    """Two-column info table with labels in bold."""
    if col1_width is None:
        col1_width = 2.2 * inch
    if col2_width is None:
        col2_width = 4.3 * inch
    t = Table(data, colWidths=[col1_width, col2_width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    return t


def _add_check(elements, check, s):
    """Add a single compliance check entry to the PDF."""
    status_colors = {
        "pass": "green", "fail": "red",
        "warning": "#b45309", "required": "#b45309",
        "not-required": "gray", "advisory": "gray",
    }
    color = status_colors.get(check["status"], "black")
    elements.append(Paragraph(
        f'<font color="{color}">\u25cf {check["status"].upper()}</font> \u2014 '
        f'<b>{check["name"]}</b>',
        s["body"],
    ))
    elements.append(Paragraph(f'&nbsp;&nbsp;&nbsp;&nbsp;{check["description"]}', s["small"]))
    if check.get("action"):
        elements.append(Paragraph(
            f'&nbsp;&nbsp;&nbsp;&nbsp;<i>Required Action: {check["action"]}</i>', s["small"],
        ))
    if check.get("remediation_bmps"):
        bmps = ", ".join(b.replace("_", " ").title() for b in check["remediation_bmps"])
        elements.append(Paragraph(
            f'&nbsp;&nbsp;&nbsp;&nbsp;Recommended BMPs: {bmps}', s["small"],
        ))
    elements.append(Spacer(1, 4))


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
    Generate a SWPPP-format PDF site assessment report.
    Returns PDF bytes, or None if reportlab is not installed.
    """
    if not HAS_REPORTLAB:
        return None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
    )
    s = _make_styles()
    elements = []
    now = datetime.datetime.now()

    score = analysis.get("score", {})
    config = analysis.get("config", {})

    # ===================================================================
    # COVER / HEADER
    # ===================================================================
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("STORMWATER POLLUTION<br/>PREVENTION PLAN (SWPPP)", s["title"]))
    elements.append(Paragraph(
        f"Prepared for: <b>{site_name}</b> &mdash; {factory_name}", s["subtitle"],
    ))
    elements.append(HRFlowable(width="100%", thickness=3, color=BLUE))
    elements.append(Spacer(1, 12))

    cover_data = [
        ["Document Type", "Stormwater Pollution Prevention Plan (SWPPP)"],
        ["Project Name", site_name],
        ["Facility Type", factory_name],
        ["Location", f"{lat:.4f}\u00b0N, {abs(lng):.4f}\u00b0W"],
        ["Preparation Date", now.strftime("%B %d, %Y")],
        ["EPA Permit Reference", "Construction General Permit (CGP) \u2014 EPA 2022 CGP"],
        ["Analysis Engine", "EPA SWMM 5.2 Methodology (Public Domain)"],
        ["Environmental Grade", f"{score.get('grade', '\u2014')} ({score.get('overall', 0):.0f}/100)"],
    ]
    elements.append(_info_table(cover_data))
    elements.append(Spacer(1, 16))
    elements.append(Paragraph(
        "This SWPPP has been prepared in accordance with the requirements of the "
        "Clean Water Act Section 402(p), EPA Construction General Permit (CGP), "
        "and applicable state regulations. This document identifies potential sources "
        "of stormwater pollution, describes practices to reduce pollutants in stormwater "
        "discharges, and ensures compliance with the terms and conditions of the permit.",
        s["body"],
    ))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        "<i>Data Sources: USDA SSURGO (Soil), NOAA Atlas 14 (Rainfall), "
        "FEMA NFHL (Flood Zones), USGS EPQS (Elevation)</i>",
        s["small"],
    ))

    # ===================================================================
    # SECTION 1: FACILITY / SITE DESCRIPTION
    # ===================================================================
    elements.append(PageBreak())
    elements.append(Paragraph("Section 1: Facility / Site Description", s["section"]))
    elements.append(Paragraph(
        "The following describes the physical characteristics of the project site, "
        "including location, soil conditions, topography, and pre-existing conditions.",
        s["body"],
    ))

    site_data = [
        ["Site Name", site_name],
        ["Facility Type", factory_name],
        ["Coordinates", f"{lat:.4f}\u00b0N, {abs(lng):.4f}\u00b0W"],
        ["Soil Group (USDA)", config.get("soil_group", "\u2014")],
        ["Site Slope", f"{config.get('slope', 0) * 100:.1f}%"],
        ["Impervious Cover", f"{config.get('frac_imperv', 0) * 100:.0f}%"],
        ["Total Site Area", f"{config.get('area_sqft', 0):,.0f} sq ft ({config.get('area_sqft', 0) / 43560:.1f} acres)"],
        ["Flood Zone (FEMA)", "Yes \u2014 Special Flood Hazard Area" if config.get("flood_zone") else "No"],
        ["Proximity to Water", "Adjacent to water body" if config.get("near_water") else "Not adjacent"],
    ]
    elements.append(_info_table(site_data))
    elements.append(Spacer(1, 10))

    soil_desc = {
        "A": "Group A soils have high infiltration rates (sandy). Low runoff potential.",
        "B": "Group B soils have moderate infiltration rates (loamy). Moderate runoff potential.",
        "C": "Group C soils have slow infiltration rates (clayey). Moderately high runoff potential.",
        "D": "Group D soils have very slow infiltration rates (heavy clay). High runoff potential.",
    }
    sg = config.get("soil_group", "B")
    elements.append(Paragraph(
        f"<b>Soil Characterization:</b> {soil_desc.get(sg, 'Unknown soil group.')}",
        s["body"],
    ))

    # ===================================================================
    # SECTION 2: ENVIRONMENTAL IMPACT ASSESSMENT
    # ===================================================================
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Section 2: Environmental Impact Assessment", s["section"]))
    elements.append(Paragraph(
        "Hydrologic analysis was performed using EPA SWMM methodology to evaluate "
        "the impact of proposed development on stormwater runoff quantity and quality.",
        s["body"],
    ))
    elements.append(Paragraph(
        f"<b>Environmental Impact Grade: {score.get('grade', '\u2014')}</b> \u2014 "
        f"Overall Score: {score.get('overall', 0):.0f}/100",
        s["body"],
    ))

    impact_data = [
        ["Metric", "Value", "Assessment"],
        ["Runoff Volume Increase", f"+{score.get('runoff_increase_pct', 0):.0f}%",
         "Acceptable" if score.get("runoff_increase_pct", 0) < 30 else "Mitigation Required"],
        ["Peak Flow Increase", f"+{score.get('peak_flow_increase_pct', 0):.0f}%",
         "Acceptable" if score.get("peak_flow_increase_pct", 0) < 20 else "Mitigation Required"],
        ["Soil Suitability", f"{score.get('soil_suitability', 0):.0f}/100",
         "Good" if score.get("soil_suitability", 0) >= 60 else "Limited"],
        ["Flood Risk Score", f"{score.get('flood_risk', 0):.0f}/100",
         "Low Risk" if score.get("flood_risk", 0) >= 70 else "Elevated Risk"],
    ]
    t = Table(impact_data, colWidths=[2 * inch, 1.5 * inch, 3 * inch])
    t.setStyle(_table_style_header())
    elements.append(t)
    elements.append(Spacer(1, 10))

    comparison = analysis.get("comparison", [])
    if comparison:
        elements.append(Paragraph("2.1 Design Storm Analysis", s["subsection"]))
        elements.append(Paragraph(
            "Comparison of pre-development and post-development runoff for multiple "
            "design storm events (SCS Type II distribution):",
            s["body"],
        ))
        storm_data = [["Storm Event", "Rain (in)", "Pre-Dev Vol (ft\u00b3)", "Post-Dev Vol (ft\u00b3)", "Pre-Dev Peak (cfs)", "Post-Dev Peak (cfs)"]]
        for c in comparison:
            storm_data.append([
                c["label"],
                f"{c['total_rain_in']:.1f}",
                f"{c['baseline_runoff_ft3']:,.0f}",
                f"{c['factory_runoff_ft3']:,.0f}",
                f"{c['baseline_peak_cfs']:.3f}",
                f"{c['factory_peak_cfs']:.3f}",
            ])
        t2 = Table(storm_data, colWidths=[1.1 * inch, 0.7 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch])
        t2.setStyle(_table_style_header())
        elements.append(t2)
    elements.append(Spacer(1, 10))

    # ===================================================================
    # SECTION 3: REGULATORY COMPLIANCE
    # ===================================================================
    elements.append(Paragraph("Section 3: Regulatory Compliance Status", s["section"]))

    if compliance:
        overall_status = compliance.get("overall_status", "conditional")
        status_labels = {
            "compliant": "COMPLIANT \u2014 All Requirements Met",
            "conditional": "CONDITIONAL \u2014 Permits & Mitigation Needed",
            "non-compliant": "NON-COMPLIANT \u2014 Action Required",
        }
        status_text = status_labels.get(overall_status, "Unknown")
        status_color = {"compliant": "green", "conditional": "#b45309", "non-compliant": "red"}.get(overall_status, "black")
        elements.append(Paragraph(
            f'<font color="{status_color}"><b>Overall Status: {status_text}</b></font>',
            s["body"],
        ))
        elements.append(Paragraph(
            f"Pass: {compliance.get('pass_count', 0)} | "
            f"Warnings: {compliance.get('warning_count', 0)} | "
            f"Failures: {compliance.get('fail_count', 0)}",
            s["body"],
        ))
        elements.append(Spacer(1, 6))

        elements.append(Paragraph("3.1 Federal Requirements", s["subsection"]))
        for check in compliance.get("checks", []):
            if check["category"] == "Federal":
                _add_check(elements, check, s)

        elements.append(Paragraph("3.2 Post-Construction Stormwater Management", s["subsection"]))
        for check in compliance.get("checks", []):
            if check["category"] == "Post-Construction":
                _add_check(elements, check, s)

        state_checks = [c for c in compliance.get("checks", []) if c["category"].startswith("State")]
        if state_checks:
            elements.append(Paragraph("3.3 State Requirements (Texas)", s["subsection"]))
            for check in state_checks:
                _add_check(elements, check, s)

        env_checks = [c for c in compliance.get("checks", [])
                       if c["category"] in ("Environmental", "Flood Control")]
        if env_checks:
            elements.append(Paragraph("3.4 Environmental & Flood Control", s["subsection"]))
            for check in env_checks:
                _add_check(elements, check, s)

    # ===================================================================
    # SECTION 4: STORMWATER CONTROLS (BMPs)
    # ===================================================================
    elements.append(PageBreak())
    elements.append(Paragraph("Section 4: Stormwater Controls \u2014 Best Management Practices", s["section"]))
    elements.append(Paragraph(
        "The following Best Management Practices (BMPs) are recommended to minimize "
        "the impact of stormwater discharges from the project site.",
        s["body"],
    ))

    if green_infra:
        elements.append(Paragraph("4.1 Recommended BMPs", s["subsection"]))
        gi_data = [["BMP", "Suitable", "Vol. Reduction", "Peak Reduction", "Install Cost", "Annual Maint."]]
        for gi in green_infra[:6]:
            gi_data.append([
                gi["name"],
                "Yes" if gi["suitable"] else "Limited",
                f"{gi['volume_reduction_pct']:.0f}%",
                f"{gi['peak_reduction_pct']:.0f}%",
                _fmt_money(gi["install_cost"]),
                _fmt_money(gi["annual_maintenance"]),
            ])
        t3 = Table(gi_data, colWidths=[1.5 * inch, 0.6 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch])
        t3.setStyle(_table_style_header(GREEN_BG))
        elements.append(t3)
        elements.append(Spacer(1, 8))

        elements.append(Paragraph("4.2 BMP Descriptions", s["subsection"]))
        for gi in green_infra[:5]:
            elements.append(Paragraph(
                f'<b>{gi["name"]}</b> \u2014 {"Recommended" if gi["suitable"] else "Limited suitability"}',
                s["body"],
            ))
            elements.append(Paragraph(f'{gi["description"]}', s["small"]))
            elements.append(Spacer(1, 4))

    elements.append(Paragraph("4.3 Construction-Phase Erosion & Sediment Controls", s["subsection"]))
    elements.append(Paragraph(
        "During construction, the following minimum controls shall be implemented:",
        s["body"],
    ))
    for ctrl in [
        "Install silt fence along all down-gradient perimeter areas before grading begins.",
        "Place stabilized construction entrance at all site access points.",
        "Install temporary sediment basins for drainage areas \u2265 1 acre.",
        "Protect all storm drain inlets with inlet protection devices.",
        "Stabilize disturbed areas within 14 days of final grading.",
        "Maintain existing vegetation where feasible; seed and mulch exposed areas promptly.",
        "Implement dust control measures during dry periods.",
    ]:
        elements.append(Paragraph(f"\u2022 {ctrl}", s["body"]))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph("4.4 Post-Construction Permanent Controls", s["subsection"]))
    elements.append(Paragraph(
        "Permanent stormwater management facilities shall be designed to meet "
        "post-construction requirements including water quality treatment, channel "
        "protection, and flood control for the design storms listed in Section 2.",
        s["body"],
    ))

    # ===================================================================
    # SECTION 5: INSPECTION & MAINTENANCE SCHEDULE
    # ===================================================================
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Section 5: Inspection & Maintenance Schedule", s["section"]))

    insp_data = [
        ["Activity", "Frequency", "Responsible Party"],
        ["SWPPP site inspection", "Every 14 days and within 24 hrs of \u2265 0.5\" rain", "Site Superintendent"],
        ["Sediment control inspection", "Weekly during active grading", "Environmental Coordinator"],
        ["BMP functionality check", "Monthly (post-construction)", "Facility Manager"],
        ["Detention/retention inspection", "Quarterly", "Facility Manager"],
        ["Annual comprehensive review", "Annually", "Third-party Environmental Consultant"],
        ["SWPPP amendment review", "As conditions change", "SWPPP Administrator"],
    ]
    t4 = Table(insp_data, colWidths=[2.5 * inch, 2.2 * inch, 2 * inch])
    t4.setStyle(_table_style_header())
    elements.append(t4)
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(
        "<b>Corrective Actions:</b> If any deficiency is identified during inspection, "
        "corrective action must be initiated within 24 hours and completed within 7 days.",
        s["body"],
    ))

    # ===================================================================
    # SECTION 6: COST-BENEFIT ANALYSIS
    # ===================================================================
    if costs:
        elements.append(Paragraph("Section 6: Cost-Benefit Analysis", s["section"]))
        summary = costs.get("summary", {})
        elements.append(Paragraph(
            f"<b>Cost Rating: {summary.get('cost_rating', '\u2014')}</b> \u2014 "
            f"Total Upfront: {_fmt_money(summary.get('total_upfront', 0))} | "
            f"Annual: {_fmt_money(summary.get('total_annual', 0))} | "
            f"20-Year Lifecycle: {_fmt_money(summary.get('total_20yr_lifecycle', 0))}",
            s["body"],
        ))
        elements.append(Spacer(1, 6))

        elements.append(Paragraph("6.1 Capital Cost Breakdown", s["subsection"]))
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

        t5 = Table(cost_data, colWidths=[3.2 * inch, 2 * inch])
        t5.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BG),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ]))
        elements.append(t5)

        risk_factors = costs.get("risk_factors", [])
        if risk_factors:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("6.2 Risk Factors", s["subsection"]))
            for rf in risk_factors:
                sev = rf["severity"]
                clr = "red" if sev == "high" else "#b45309"
                elements.append(Paragraph(
                    f'<font color="{clr}">\u25b2 {rf["factor"]}</font> \u2014 '
                    f'Estimated Lifetime Impact: {_fmt_money(rf["lifetime_impact"])}',
                    s["body"],
                ))

    # ===================================================================
    # SECTION 7: SWPPP CERTIFICATION & SIGNATURES
    # ===================================================================
    elements.append(PageBreak())
    elements.append(Paragraph("Section 7: SWPPP Certification", s["section"]))
    elements.append(Paragraph(
        '"I certify under penalty of law that this document and all attachments were '
        "prepared under my direction or supervision in accordance with a system designed "
        "to assure that qualified personnel properly gathered and evaluated the information "
        "submitted. Based on my inquiry of the person or persons who manage the system, or "
        "those persons directly responsible for gathering the information, the information "
        "submitted is, to the best of my knowledge and belief, true, accurate, and complete. "
        "I am aware that there are significant penalties for submitting false information, "
        'including the possibility of fine and imprisonment for knowing violations."',
        s["body"],
    ))
    elements.append(Spacer(1, 20))

    sig_data = [
        ["Owner / Operator", "___________________________________"],
        ["Title", "___________________________________"],
        ["Signature", "___________________________________"],
        ["Date", "___________________________________"],
        ["", ""],
        ["SWPPP Preparer", "___________________________________"],
        ["Company", "___________________________________"],
        ["Phone / Email", "___________________________________"],
        ["Date", "___________________________________"],
    ]
    t6 = Table(sig_data, colWidths=[2 * inch, 4.5 * inch])
    t6.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
    ]))
    elements.append(t6)

    # ===================================================================
    # FOOTER
    # ===================================================================
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        f"SWPPP generated by <b>Runny \u2014 Stormwater Runoff Forecasting Tool</b> on "
        f"{now.strftime('%B %d, %Y at %I:%M %p')}. "
        "Hydrologic analysis powered by EPA SWMM 5.2 methodology (public domain). "
        "Data sources: USDA SSURGO, NOAA Atlas 14, FEMA NFHL, USGS EPQS. "
        "This document should be reviewed and certified by a qualified professional "
        "before submission to regulatory agencies.",
        s["footer"],
    ))

    doc.build(elements)
    return buf.getvalue()
