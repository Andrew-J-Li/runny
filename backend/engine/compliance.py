"""
Regulatory compliance checker for stormwater permits.
Evaluates whether a proposed factory site meets key EPA and state requirements.
"""

from __future__ import annotations
from typing import List


# ── Regulatory thresholds ─────────────────────────────────────────────

# EPA Construction General Permit (CGP) applies to sites ≥ 1 acre
CGP_THRESHOLD_ACRES = 1.0

# Common post-construction requirements
WATER_QUALITY_VOLUME_IN = 1.0   # Treat first 1" of rainfall
CHANNEL_PROTECTION_STORM = "2yr-24hr"   # No increase for 2-year storm
FLOOD_PROTECTION_STORM = "100yr-24hr"   # Manage 100-year storm

# Texas-specific (TPDES) thresholds
TPDES_IMPERVIOUS_THRESHOLD = 0.20   # Sites >20% imperv need SW plan
TSS_REMOVAL_REQUIRED = 0.80         # 80% TSS removal requirement


def check_compliance(
    site_area_sqft: float,
    frac_imperv: float,
    soil_group: str,
    flood_zone: bool,
    near_water: bool,
    runoff_increase_pct: float,
    peak_increase_pct: float,
    factory_type_id: str = "light_manufacturing",
    state: str = "TX",
    comparison: list = None,
) -> dict:
    """
    Check a proposed site against federal and state stormwater regulations.

    Returns a compliance report with pass/fail for each requirement,
    overall status, and remediation notes.
    """
    site_acres = site_area_sqft / 43560.0
    checks: List[dict] = []
    warnings: List[str] = []

    # ── 1. EPA Construction General Permit ─────────────────────────
    cgp_required = site_acres >= CGP_THRESHOLD_ACRES
    checks.append({
        "id": "cgp",
        "name": "EPA Construction General Permit (CGP)",
        "category": "Federal",
        "status": "required" if cgp_required else "not-required",
        "description": (
            f"Site is {site_acres:.1f} acres. CGP required for sites ≥ {CGP_THRESHOLD_ACRES} acre."
            if cgp_required else
            f"Site is {site_acres:.1f} acres. CGP may not be required (< {CGP_THRESHOLD_ACRES} acre)."
        ),
        "action": "File NOI (Notice of Intent) with EPA before construction begins." if cgp_required else None,
    })

    # ── 2. Post-construction stormwater management ─────────────────
    # Channel protection: 2-year storm runoff should not increase
    two_yr_increase = 0
    if comparison:
        for c in comparison:
            if c["storm_id"] == "2yr-24hr":
                base = c["baseline_runoff_ft3"]
                fact = c["factory_runoff_ft3"]
                if base > 0:
                    two_yr_increase = (fact - base) / base * 100
                break

    channel_ok = two_yr_increase <= 10  # ≤10% increase is typical threshold
    checks.append({
        "id": "channel_protection",
        "name": "Channel Protection (2-yr Storm)",
        "category": "Post-Construction",
        "status": "pass" if channel_ok else "fail",
        "description": (
            f"2-year storm runoff increase is {two_yr_increase:.0f}%. "
            f"{'Within' if channel_ok else 'Exceeds'} typical 10% threshold."
        ),
        "action": (
            None if channel_ok else
            "Install detention/retention to attenuate 2-year post-development peak to pre-development levels."
        ),
    })

    # ── 3. Water quality treatment ─────────────────────────────────
    wqv_ok = frac_imperv < 0.50  # Rough heuristic: low imperv = easier to treat
    checks.append({
        "id": "water_quality",
        "name": f"Water Quality Volume ({WATER_QUALITY_VOLUME_IN}\" Treatment)",
        "category": "Post-Construction",
        "status": "pass" if wqv_ok else "warning",
        "description": (
            f"Site has {frac_imperv*100:.0f}% impervious cover. "
            f"Must treat first {WATER_QUALITY_VOLUME_IN}\" of rainfall from impervious surfaces."
        ),
        "action": (
            None if wqv_ok else
            "Provide bioretention, permeable pavement, or other BMP to treat water quality volume."
        ),
    })

    # ── 4. 100-year flood management ───────────────────────────────
    flood_ok = not flood_zone
    checks.append({
        "id": "flood_100yr",
        "name": "100-Year Flood Management",
        "category": "Flood Control",
        "status": "pass" if flood_ok else "fail",
        "description": (
            "Site is outside FEMA flood zones."
            if flood_ok else
            "Site is in a FEMA-designated flood zone. Special requirements apply."
        ),
        "action": (
            None if flood_ok else
            "Obtain floodplain development permit. Elevate structures above BFE. "
            "Provide compensatory floodplain storage."
        ),
    })

    # ── 5. TPDES (Texas) stormwater permit ─────────────────────────
    if state == "TX":
        tpdes_required = frac_imperv > TPDES_IMPERVIOUS_THRESHOLD or site_acres >= 5
        checks.append({
            "id": "tpdes",
            "name": "TPDES Industrial Stormwater Permit",
            "category": "State (Texas)",
            "status": "required" if tpdes_required else "advisory",
            "description": (
                f"Texas requires TPDES permit for industrial sites with "
                f">{TPDES_IMPERVIOUS_THRESHOLD*100:.0f}% impervious cover or ≥5 acres."
            ),
            "action": "File with TCEQ for Multi-Sector General Permit (MSGP) coverage." if tpdes_required else None,
        })

        # TSS removal
        checks.append({
            "id": "tss_removal",
            "name": f"TSS Removal ({TSS_REMOVAL_REQUIRED*100:.0f}% Required)",
            "category": "State (Texas)",
            "status": "warning",
            "description": (
                "Texas requires 80% Total Suspended Solids removal for "
                "post-construction stormwater treatment."
            ),
            "action": "Design BMPs to meet 80% TSS removal (bioretention, sand filter, or wet pond).",
        })

    # ── 6. Endangered species / waterway buffers ───────────────────
    if near_water:
        checks.append({
            "id": "waterway_buffer",
            "name": "Waterway Buffer Zone",
            "category": "Environmental",
            "status": "warning",
            "description": (
                "Site is near a water body. Many jurisdictions require 50-100 ft "
                "riparian buffer zones."
            ),
            "action": "Verify setback requirements with local jurisdiction. Maintain vegetated buffer.",
        })
        warnings.append("Proximity to waterways may trigger additional environmental review.")

    # ── 7. Pollutant risk assessment ───────────────────────────────
    from ..data.factories import get_factory_type
    ft = get_factory_type(factory_type_id)
    if ft and ft.get("pollutant_risk") == "high":
        checks.append({
            "id": "hazmat",
            "name": "Hazardous Materials Management",
            "category": "Environmental",
            "status": "required",
            "description": (
                "This factory type handles hazardous materials. "
                "Spill Prevention, Control, and Countermeasure (SPCC) plan required."
            ),
            "action": "Develop SPCC plan. Install secondary containment for all chemical storage.",
        })

    # ── Overall compliance status ──────────────────────────────────
    statuses = [c["status"] for c in checks]
    if "fail" in statuses:
        overall = "non-compliant"
        overall_label = "Action Required"
    elif "required" in statuses or "warning" in statuses:
        overall = "conditional"
        overall_label = "Conditional — Permits & Mitigation Needed"
    else:
        overall = "compliant"
        overall_label = "Compliant"

    fail_count = statuses.count("fail")
    warn_count = statuses.count("warning") + statuses.count("required")
    pass_count = statuses.count("pass") + statuses.count("not-required")

    return {
        "overall_status": overall,
        "overall_label": overall_label,
        "pass_count": pass_count,
        "warning_count": warn_count,
        "fail_count": fail_count,
        "checks": checks,
        "warnings": warnings,
    }
