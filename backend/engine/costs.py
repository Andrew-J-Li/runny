"""
Cost-benefit analysis for factory site selection.
Estimates construction, mitigation, land, and ongoing costs.
"""

from __future__ import annotations
from typing import List


# ── Regional land cost estimates ($/acre) ─────────────────────────────
# Rough averages — real app would use a land value API
LAND_COSTS = {
    "urban": 350000,
    "suburban": 180000,
    "rural": 80000,
    "flood_zone": 45000,
}


def estimate_land_type(slope: float, flood_zone: bool, near_water: bool) -> str:
    """Heuristic to classify land type for cost estimation."""
    if flood_zone:
        return "flood_zone"
    if near_water:
        return "rural"
    if slope > 0.025:
        return "suburban"
    return "suburban"


def compute_cost_benefit(
    site_area_sqft: float,
    frac_imperv: float,
    soil_group: str,
    slope: float,
    flood_zone: bool,
    near_water: bool,
    factory_type: dict,
    green_infra: list,
    runoff_increase_pct: float,
    peak_increase_pct: float,
) -> dict:
    """
    Compute comprehensive cost-benefit analysis for a site.

    Returns cost breakdown, risk-adjusted totals, and comparison metrics.
    """
    site_acres = site_area_sqft / 43560.0
    imperv_area = site_area_sqft * frac_imperv

    # ── Land costs ────────────────────────────────────────────────────
    land_type = estimate_land_type(slope, flood_zone, near_water)
    land_cost_per_acre = LAND_COSTS[land_type]
    land_cost = site_acres * land_cost_per_acre

    # ── Construction costs ────────────────────────────────────────────
    building_sqft = imperv_area * 0.50  # ~50% of impervious is building
    construction_cost = building_sqft * factory_type.get("construction_cost_per_sqft", 120)

    # Site prep costs (grading, utilities, paving)
    site_prep_cost = site_area_sqft * 8  # ~$8/sqft average

    # ── Stormwater mitigation costs ───────────────────────────────────
    # Sum up the top 3 recommended green infrastructure measures
    mitigation_cost = 0
    mitigation_annual = 0
    recommended_bmps = []
    for bmp in green_infra[:3]:  # Top 3 by priority
        if bmp.get("suitable", False):
            mitigation_cost += bmp["install_cost"]
            mitigation_annual += bmp["annual_maintenance"]
            recommended_bmps.append({
                "name": bmp["name"],
                "install_cost": bmp["install_cost"],
                "annual_cost": bmp["annual_maintenance"],
            })

    # If no suitable BMPs, estimate generic mitigation cost
    if mitigation_cost == 0:
        mitigation_cost = imperv_area * 5  # $5/sqft of impervious area
        mitigation_annual = mitigation_cost * 0.02

    # ── Permitting costs ──────────────────────────────────────────────
    permit_cost = 15000  # Base permit costs
    if flood_zone:
        permit_cost += 25000  # Floodplain permits
    if factory_type.get("pollutant_risk") == "high":
        permit_cost += 20000  # Environmental permits
    if site_acres >= 5:
        permit_cost += 10000  # Larger site = more review

    # ── Ongoing costs (annual) ────────────────────────────────────────
    operating_cost = factory_type.get("annual_operating_cost", 1000000)
    water_cost_annual = factory_type.get("water_usage_gpd", 50000) * 365 * 0.005  # $0.005/gal
    stormwater_fee_annual = site_acres * frac_imperv * 2500  # Impervious-based fee

    # ── Risk adjustments ──────────────────────────────────────────────
    risk_premium = 0
    risk_factors = []

    if flood_zone:
        flood_risk_annual = land_cost * 0.02  # 2% annual flood damage risk
        risk_premium += flood_risk_annual * 20  # 20-year NPV
        risk_factors.append({
            "factor": "Flood Zone Location",
            "annual_risk_cost": round(flood_risk_annual, 0),
            "lifetime_impact": round(flood_risk_annual * 20, 0),
            "severity": "high",
        })

    if near_water:
        env_risk_annual = 15000  # Environmental compliance risk
        risk_premium += env_risk_annual * 20
        risk_factors.append({
            "factor": "Waterway Proximity",
            "annual_risk_cost": round(env_risk_annual, 0),
            "lifetime_impact": round(env_risk_annual * 20, 0),
            "severity": "moderate",
        })

    if soil_group in ("C", "D"):
        foundation_extra = site_area_sqft * 2  # Extra foundation cost
        risk_premium += foundation_extra
        risk_factors.append({
            "factor": "Poor Soil Drainage",
            "annual_risk_cost": 0,
            "lifetime_impact": round(foundation_extra, 0),
            "severity": "moderate" if soil_group == "C" else "high",
        })

    if runoff_increase_pct > 100:
        extra_mitigation = mitigation_cost * 0.5
        risk_premium += extra_mitigation
        risk_factors.append({
            "factor": "High Runoff Increase",
            "annual_risk_cost": round(extra_mitigation / 20, 0),
            "lifetime_impact": round(extra_mitigation, 0),
            "severity": "high",
        })

    # ── Totals ────────────────────────────────────────────────────────
    total_upfront = land_cost + construction_cost + site_prep_cost + mitigation_cost + permit_cost
    total_annual = operating_cost + water_cost_annual + stormwater_fee_annual + mitigation_annual
    total_20yr = total_upfront + total_annual * 20 + risk_premium

    # ── Cost rating ───────────────────────────────────────────────────
    cost_per_sqft_total = total_upfront / site_area_sqft if site_area_sqft > 0 else 0
    if cost_per_sqft_total < 50:
        cost_rating = "Excellent"
    elif cost_per_sqft_total < 100:
        cost_rating = "Good"
    elif cost_per_sqft_total < 175:
        cost_rating = "Fair"
    else:
        cost_rating = "Expensive"

    return {
        "summary": {
            "total_upfront": round(total_upfront, 0),
            "total_annual": round(total_annual, 0),
            "total_20yr_lifecycle": round(total_20yr, 0),
            "risk_premium": round(risk_premium, 0),
            "cost_rating": cost_rating,
            "cost_per_sqft": round(cost_per_sqft_total, 2),
        },
        "breakdown": {
            "land": round(land_cost, 0),
            "construction": round(construction_cost, 0),
            "site_prep": round(site_prep_cost, 0),
            "stormwater_mitigation": round(mitigation_cost, 0),
            "permits": round(permit_cost, 0),
        },
        "annual_costs": {
            "operations": round(operating_cost, 0),
            "water": round(water_cost_annual, 0),
            "stormwater_fees": round(stormwater_fee_annual, 0),
            "bmp_maintenance": round(mitigation_annual, 0),
        },
        "risk_factors": risk_factors,
        "recommended_bmps": recommended_bmps,
        "site_acres": round(site_acres, 2),
        "land_type": land_type,
    }
