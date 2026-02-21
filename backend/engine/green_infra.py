"""
Green Infrastructure (LID) recommendations based on site conditions
and runoff analysis results.  Suggests best-fit BMPs with sizing and costs.
"""

from __future__ import annotations
from typing import List


# ── BMP catalogue ─────────────────────────────────────────────────────
BMPS = [
    {
        "id": "bioretention",
        "name": "Bioretention / Rain Garden",
        "description": "Shallow landscaped depression that captures and filters runoff through engineered soil media.",
        "icon": "flower",
        "cost_per_sqft": 25.0,
        "maintenance_annual_per_sqft": 1.50,
        "capture_depth_in": 1.0,         # inches of rainfall treated per unit area
        "peak_reduction_pct": 0.25,      # typical peak flow reduction
        "volume_reduction_pct": 0.30,    # typical volume reduction
        "min_soil_group": "A",           # works best on A/B soils
        "suitable_soil": ["A", "B", "C"],
        "space_pct": 0.05,              # requires ~5% of impervious area
    },
    {
        "id": "permeable_pavement",
        "name": "Permeable Pavement",
        "description": "Porous asphalt, concrete, or pavers that allow rainwater to infiltrate through the surface into a stone reservoir below.",
        "icon": "grid",
        "cost_per_sqft": 12.0,
        "maintenance_annual_per_sqft": 0.75,
        "capture_depth_in": 0.75,
        "peak_reduction_pct": 0.20,
        "volume_reduction_pct": 0.25,
        "min_soil_group": "A",
        "suitable_soil": ["A", "B"],
        "space_pct": 0.0,               # replaces existing pavement
    },
    {
        "id": "detention_pond",
        "name": "Detention Pond",
        "description": "Engineered stormwater basin that temporarily stores runoff and releases it slowly, reducing peak flows downstream.",
        "icon": "waves",
        "cost_per_sqft": 6.0,
        "maintenance_annual_per_sqft": 0.30,
        "capture_depth_in": 2.0,
        "peak_reduction_pct": 0.50,
        "volume_reduction_pct": 0.10,
        "min_soil_group": "A",
        "suitable_soil": ["A", "B", "C", "D"],
        "space_pct": 0.08,
    },
    {
        "id": "green_roof",
        "name": "Green Roof",
        "description": "Vegetated rooftop system that absorbs rainfall, reduces heat island effect, and provides insulation.",
        "icon": "leaf",
        "cost_per_sqft": 20.0,
        "maintenance_annual_per_sqft": 1.00,
        "capture_depth_in": 0.5,
        "peak_reduction_pct": 0.15,
        "volume_reduction_pct": 0.20,
        "min_soil_group": "A",
        "suitable_soil": ["A", "B", "C", "D"],  # soil-independent (on roof)
        "space_pct": 0.0,
    },
    {
        "id": "swale",
        "name": "Vegetated Swale",
        "description": "Gently sloped, vegetated channel that conveys, slows, and filters stormwater runoff.",
        "icon": "wind",
        "cost_per_sqft": 4.0,
        "maintenance_annual_per_sqft": 0.50,
        "capture_depth_in": 0.5,
        "peak_reduction_pct": 0.15,
        "volume_reduction_pct": 0.15,
        "min_soil_group": "A",
        "suitable_soil": ["A", "B", "C"],
        "space_pct": 0.03,
    },
]


def recommend_green_infra(
    soil_group: str,
    site_area_sqft: float,
    frac_imperv: float,
    runoff_increase_pct: float,
    peak_increase_pct: float,
    flood_zone: bool = False,
) -> List[dict]:
    """
    Recommend green infrastructure measures for a site.

    Returns a list of BMP recommendations with sizing, cost estimates,
    and expected runoff reduction.
    """
    imperv_area = site_area_sqft * frac_imperv
    recommendations = []

    for bmp in BMPS:
        # Check soil suitability
        suitable = soil_group in bmp["suitable_soil"]
        effectiveness = "high" if suitable else "limited"

        # Calculate sizing: area needed to capture 1" from impervious area
        # Using ratio: bmp_area = imperv_area × (1.0 / capture_depth) × treatment_fraction
        treatment_fraction = min(1.0, runoff_increase_pct / 100.0)
        bmp_area = imperv_area * bmp["space_pct"] if bmp["space_pct"] > 0 else imperv_area * 0.15

        # Adjust for green roof — sized to building footprint (est. 40% of imperv)
        if bmp["id"] == "green_roof":
            bmp_area = imperv_area * 0.40

        # Adjust for permeable pavement — parking area (est. 30% of imperv)
        if bmp["id"] == "permeable_pavement":
            bmp_area = imperv_area * 0.30

        # Cost estimates
        install_cost = bmp_area * bmp["cost_per_sqft"]
        annual_maint = bmp_area * bmp["maintenance_annual_per_sqft"]
        lifetime_cost = install_cost + annual_maint * 20  # 20-year lifecycle

        # Expected reductions
        vol_reduction = bmp["volume_reduction_pct"] * (1.0 if suitable else 0.5) * 100
        peak_reduction = bmp["peak_reduction_pct"] * (1.0 if suitable else 0.5) * 100

        # Priority score (higher = more recommended)
        priority = 0
        if suitable:
            priority += 30
        priority += vol_reduction * 0.3
        priority += peak_reduction * 0.3
        if flood_zone and bmp["id"] == "detention_pond":
            priority += 20  # detention critical in flood zones
        # Penalize cost
        priority -= (install_cost / 100000) * 5
        priority = max(0, priority)

        recommendations.append({
            "id": bmp["id"],
            "name": bmp["name"],
            "description": bmp["description"],
            "icon": bmp["icon"],
            "suitable": suitable,
            "effectiveness": effectiveness,
            "area_sqft": round(bmp_area, 0),
            "install_cost": round(install_cost, 0),
            "annual_maintenance": round(annual_maint, 0),
            "lifetime_cost_20yr": round(lifetime_cost, 0),
            "volume_reduction_pct": round(vol_reduction, 1),
            "peak_reduction_pct": round(peak_reduction, 1),
            "priority": round(priority, 1),
        })

    # Sort by priority descending
    recommendations.sort(key=lambda x: x["priority"], reverse=True)
    return recommendations
