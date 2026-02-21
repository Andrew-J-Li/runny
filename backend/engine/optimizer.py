"""
Pareto-frontier optimizer for factory site configurations.
Sweeps the design space (imperviousness, BMP combinations)
and finds configurations that achieve the best trade-off
between environmental score and total cost.
"""

from __future__ import annotations
from typing import List, Optional
import math

from .scoring import score_site
from .green_infra import recommend_green_infra, BMPS
from .compliance import check_compliance
from .costs import compute_cost_benefit
from ..data.factories import get_factory_type


# ── BMP toggle combinations ────────────────────────────────────────────
# Each BMP can be "on" or "off".  5 BMPs → 32 combos, but we prune.
BMP_IDS = [b["id"] for b in BMPS]

def _bmp_combos(max_bmps: int = 3) -> List[tuple]:
    """Generate all BMP subsets up to max_bmps size."""
    combos = [()]  # empty = no BMPs
    for i, b in enumerate(BMP_IDS):
        combos.append((b,))
        for j in range(i + 1, len(BMP_IDS)):
            combos.append((b, BMP_IDS[j]))
            if max_bmps >= 3:
                for k in range(j + 1, len(BMP_IDS)):
                    combos.append((b, BMP_IDS[j], BMP_IDS[k]))
    return combos


def _apply_bmp_reductions(
    base_runoff_increase: float,
    base_peak_increase: float,
    frac_imperv: float,
    soil_group: str,
    active_bmps: tuple,
) -> dict:
    """Estimate combined reduction from a set of active BMPs."""
    vol_reduction = 0.0
    peak_reduction = 0.0
    for bmp in BMPS:
        if bmp["id"] in active_bmps:
            suitable = soil_group in bmp["suitable_soil"]
            mult = 1.0 if suitable else 0.5
            vol_reduction += bmp["volume_reduction_pct"] * mult
            peak_reduction += bmp["peak_reduction_pct"] * mult
    # Cap at 90% reduction
    vol_reduction = min(0.90, vol_reduction)
    peak_reduction = min(0.90, peak_reduction)

    adjusted_runoff = base_runoff_increase * (1 - vol_reduction)
    adjusted_peak = base_peak_increase * (1 - peak_reduction)
    return {
        "runoff_increase_pct": adjusted_runoff,
        "peak_increase_pct": adjusted_peak,
        "vol_reduction": vol_reduction,
        "peak_reduction": peak_reduction,
    }


def _estimate_bmp_cost(
    active_bmps: tuple,
    site_area_sqft: float,
    frac_imperv: float,
    soil_group: str,
) -> dict:
    """Quick cost estimate for a set of BMPs."""
    imperv_area = site_area_sqft * frac_imperv
    total_install = 0.0
    total_annual = 0.0
    names = []
    for bmp in BMPS:
        if bmp["id"] not in active_bmps:
            continue
        # Sizing (same logic as green_infra.py)
        if bmp["space_pct"] > 0:
            area = imperv_area * bmp["space_pct"]
        else:
            area = imperv_area * 0.15
        if bmp["id"] == "green_roof":
            area = imperv_area * 0.40
        elif bmp["id"] == "permeable_pavement":
            area = imperv_area * 0.30

        total_install += area * bmp["cost_per_sqft"]
        total_annual += area * bmp["maintenance_annual_per_sqft"]
        names.append(bmp["name"])
    return {
        "install_cost": total_install,
        "annual_cost": total_annual,
        "lifetime_cost": total_install + total_annual * 20,
        "bmp_names": names,
    }


def run_optimization(
    lat: float,
    lng: float,
    soil_group: str,
    site_area_sqft: float,
    slope: float,
    flood_zone: bool,
    near_water: bool,
    factory_type_id: str = "light_manufacturing",
    imperv_steps: int = 8,
) -> dict:
    """
    Sweep the design space and compute the Pareto frontier
    of environmental score vs. total 20-year cost.

    Parameters
    ----------
    imperv_steps : int
        Number of imperviousness levels to test (default 8).

    Returns
    -------
    dict with:
        - pareto : list of Pareto-optimal configurations
        - all_points : list of all evaluated configurations
        - best_compliant : the lowest-cost compliant configuration
        - best_score : the highest-scoring configuration
    """
    ft = get_factory_type(factory_type_id) or get_factory_type("light_manufacturing")

    # Generate imperviousness levels to test
    default_imperv = ft["default_frac_imperv"]
    imperv_min = max(0.20, default_imperv - 0.30)
    imperv_max = min(0.95, default_imperv + 0.15)
    imperv_levels = [
        round(imperv_min + i * (imperv_max - imperv_min) / (imperv_steps - 1), 2)
        for i in range(imperv_steps)
    ]
    # Ensure the default is included
    if default_imperv not in imperv_levels:
        imperv_levels.append(default_imperv)
        imperv_levels.sort()

    bmp_combos = _bmp_combos(max_bmps=3)

    all_points = []
    seen_keys = set()

    for fi in imperv_levels:
        # Run base simulation once per imperv level
        base_analysis = score_site(
            lat=lat, lng=lng, soil_group=soil_group,
            site_area_sqft=site_area_sqft, frac_imperv=fi,
            slope=slope, flood_zone=flood_zone, near_water=near_water,
        )
        base_score = base_analysis["score"]

        for combo in bmp_combos:
            # Apply BMP reductions
            reductions = _apply_bmp_reductions(
                base_score["runoff_increase_pct"],
                base_score["peak_flow_increase_pct"],
                fi, soil_group, combo,
            )

            # Recompute score with reduced runoff/peak
            runoff_score = max(0, 100 - reductions["runoff_increase_pct"] * 0.5)
            peak_score = max(0, 100 - reductions["peak_increase_pct"] * 0.3)
            soil_scores = {"A": 90, "B": 75, "C": 50, "D": 25}
            soil_s = soil_scores.get(soil_group, 50)
            flood_s = base_score["flood_risk"]
            overall = runoff_score * 0.30 + peak_score * 0.25 + soil_s * 0.25 + flood_s * 0.20
            overall = max(0, min(100, overall))

            if overall >= 80:
                grade = "A"
            elif overall >= 65:
                grade = "B"
            elif overall >= 50:
                grade = "C"
            elif overall >= 35:
                grade = "D"
            else:
                grade = "F"

            # Quick compliance check
            comp = check_compliance(
                site_area_sqft=site_area_sqft,
                frac_imperv=fi,
                soil_group=soil_group,
                flood_zone=flood_zone,
                near_water=near_water,
                runoff_increase_pct=reductions["runoff_increase_pct"],
                peak_increase_pct=reductions["peak_increase_pct"],
                factory_type_id=factory_type_id,
                comparison=base_analysis.get("comparison"),
            )

            # BMP costs
            bmp_costs = _estimate_bmp_cost(combo, site_area_sqft, fi, soil_group)

            # Full cost estimate (simplified)
            site_acres = site_area_sqft / 43560.0
            imperv_area = site_area_sqft * fi
            building_sqft = imperv_area * 0.50
            construction = building_sqft * ft.get("construction_cost_per_sqft", 120)
            site_prep = site_area_sqft * 8
            land = site_acres * 180000  # suburban default
            permits = 15000
            if flood_zone:
                permits += 25000
                land = site_acres * 45000

            total_upfront = land + construction + site_prep + bmp_costs["install_cost"] + permits
            operating = ft.get("annual_operating_cost", 1000000)
            water = ft.get("water_usage_gpd", 50000) * 365 * 0.005
            sw_fee = site_acres * fi * 2500
            total_annual = operating + water + sw_fee + bmp_costs["annual_cost"]
            total_20yr = total_upfront + total_annual * 20

            is_compliant = comp["overall_status"] == "compliant"
            is_conditional = comp["overall_status"] == "conditional"
            fail_count = comp["fail_count"]

            # Dedup key
            key = (fi, combo)
            if key in seen_keys:
                continue
            seen_keys.add(key)

            all_points.append({
                "frac_imperv": fi,
                "bmps": list(combo),
                "bmp_names": bmp_costs["bmp_names"],
                "score": round(overall, 1),
                "grade": grade,
                "runoff_increase_pct": round(reductions["runoff_increase_pct"], 1),
                "peak_increase_pct": round(reductions["peak_increase_pct"], 1),
                "vol_reduction_pct": round(reductions["vol_reduction"] * 100, 1),
                "peak_reduction_pct": round(reductions["peak_reduction"] * 100, 1),
                "compliance_status": comp["overall_status"],
                "fail_count": fail_count,
                "total_upfront": round(total_upfront, 0),
                "total_annual": round(total_annual, 0),
                "total_20yr": round(total_20yr, 0),
                "bmp_install_cost": round(bmp_costs["install_cost"], 0),
            })

    # ── Compute Pareto frontier ──────────────────────────────────────
    # A point is Pareto-optimal if no other point has both
    # higher score AND lower 20-year cost.
    all_points.sort(key=lambda p: (-p["score"], p["total_20yr"]))

    pareto = []
    min_cost_so_far = float("inf")
    for pt in all_points:
        if pt["total_20yr"] < min_cost_so_far:
            pareto.append(pt)
            min_cost_so_far = pt["total_20yr"]

    # ── Find notable configurations ──────────────────────────────────
    best_score = max(all_points, key=lambda p: p["score"]) if all_points else None

    compliant_points = [p for p in all_points if p["compliance_status"] in ("compliant", "conditional")]
    best_compliant = min(compliant_points, key=lambda p: p["total_20yr"]) if compliant_points else None

    best_balanced = None
    if pareto:
        # Find the "knee" — best score-to-cost ratio
        scores = [p["score"] for p in pareto]
        costs = [p["total_20yr"] for p in pareto]
        if len(pareto) > 1:
            max_s, min_s = max(scores), min(scores)
            max_c, min_c = max(costs), min(costs)
            range_s = max_s - min_s if max_s > min_s else 1
            range_c = max_c - min_c if max_c > min_c else 1
            best_dist = float("inf")
            for pt in pareto:
                ns = (pt["score"] - min_s) / range_s
                nc = (pt["total_20yr"] - min_c) / range_c
                # Distance from the ideal (score=1, cost=0)
                dist = math.sqrt((1 - ns) ** 2 + nc ** 2)
                if dist < best_dist:
                    best_dist = dist
                    best_balanced = pt
        else:
            best_balanced = pareto[0]

    return {
        "pareto": pareto,
        "all_points": all_points,
        "total_evaluated": len(all_points),
        "best_score": best_score,
        "best_compliant": best_compliant,
        "best_balanced": best_balanced,
        "factory_type": ft["name"],
        "factory_default_imperv": default_imperv,
    }
