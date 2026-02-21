"""
Environmental Impact Scoring for factory site locations.
Combines runoff analysis with site-specific factors.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List

from .runoff import (
    SubcatchConfig, SimulationResult, run_simulation,
    baseline_config, SOIL_PARAMS,
)
from .rainfall import get_design_storm


@dataclass
class SiteScore:
    """Environmental impact score for a candidate site."""
    overall: float = 0.0           # 0-100 (100 = best / lowest impact)
    runoff_increase_pct: float = 0.0
    peak_flow_increase_pct: float = 0.0
    soil_suitability: float = 0.0   # 0-100
    flood_risk: float = 0.0         # 0-100 (100 = low risk)
    grade: str = "F"
    details: str = ""


def _compute_grade(overall: float) -> str:
    """Convert an overall score (0-100) to a letter grade."""
    if overall >= 80:
        return "A"
    elif overall >= 65:
        return "B"
    elif overall >= 50:
        return "C"
    elif overall >= 35:
        return "D"
    else:
        return "F"


def score_site(
    lat: float,
    lng: float,
    soil_group: str,
    site_area_sqft: float = 217800.0,
    frac_imperv: float = 0.65,
    slope: float = 0.02,
    flood_zone: bool = False,
    near_water: bool = False,
) -> dict:
    """
    Compute the environmental impact score for building a factory at a location.
    
    Returns dict with scores, comparison data, and simulation results
    for the 10-year design storm.
    """
    # -- build factory config
    factory = SubcatchConfig(
        area_sqft=site_area_sqft,
        frac_imperv=frac_imperv,
        slope=slope,
        width_ft=400.0,
        soil_group=soil_group,
    )
    # -- build baseline (pre-development) config
    base = baseline_config(soil_group, site_area_sqft)

    # -- run simulations for multiple storms
    storms = ["2yr-24hr", "10yr-24hr", "25yr-24hr", "100yr-24hr"]
    factory_results = {}
    baseline_results = {}

    for sid in storms:
        storm = get_design_storm(sid)
        hyet = storm["hyetograph"]
        factory_results[sid] = run_simulation(hyet, factory, tstep=300.0)
        baseline_results[sid] = run_simulation(hyet, base, tstep=300.0)

    # -- compute scoring metrics using 10-year storm
    ref_storm = "10yr-24hr"
    fr = factory_results[ref_storm]
    br = baseline_results[ref_storm]

    # Runoff volume increase
    if br.total_runoff_ft3 > 0:
        runoff_increase = (fr.total_runoff_ft3 - br.total_runoff_ft3) / br.total_runoff_ft3 * 100
    else:
        runoff_increase = fr.total_runoff_ft3 * 100 if fr.total_runoff_ft3 > 0 else 0

    # Peak flow increase
    if br.peak_runoff_cfs > 0:
        peak_increase = (fr.peak_runoff_cfs - br.peak_runoff_cfs) / br.peak_runoff_cfs * 100
    else:
        peak_increase = 100.0

    # Soil suitability score (A=best, D=worst for development)
    soil_scores = {"A": 90, "B": 75, "C": 50, "D": 25}
    soil_score = soil_scores.get(soil_group, 50)

    # Flood risk score
    flood_score = 100.0
    if flood_zone:
        flood_score -= 50.0
    if near_water:
        flood_score -= 20.0
    # Higher CN soils = more flood risk
    cn = SOIL_PARAMS[soil_group]["cn"]
    flood_score -= max(0, (cn - 60)) * 0.5
    flood_score = max(0, flood_score)

    # Overall score (weighted)
    runoff_score = max(0, 100 - runoff_increase * 0.5)
    peak_score = max(0, 100 - peak_increase * 0.3)
    overall = (
        runoff_score * 0.30 +
        peak_score * 0.25 +
        soil_score * 0.25 +
        flood_score * 0.20
    )
    overall = max(0, min(100, overall))

    # Grade
    grade = _compute_grade(overall)

    # Compile per-storm comparison data for charts
    comparison = []
    for sid in storms:
        fr_s = factory_results[sid]
        br_s = baseline_results[sid]
        storm_meta = get_design_storm(sid)
        comparison.append({
            "storm_id": sid,
            "label": storm_meta["label"],
            "total_rain_in": storm_meta["total_rain_in"],
            "factory_runoff_ft3": round(fr_s.total_runoff_ft3, 1),
            "baseline_runoff_ft3": round(br_s.total_runoff_ft3, 1),
            "factory_peak_cfs": round(fr_s.peak_runoff_cfs, 4),
            "baseline_peak_cfs": round(br_s.peak_runoff_cfs, 4),
        })

    # Build time-series for the 10-year storm (for charts)
    fr10 = factory_results[ref_storm]
    br10 = baseline_results[ref_storm]

    timeseries = {
        "time_hours": fr10.time_hours,
        "rainfall_in_hr": fr10.rainfall_in_hr,
        "factory_runoff_cfs": fr10.runoff_cfs,
        "baseline_runoff_cfs": br10.runoff_cfs,
        "factory_cumulative_ft3": fr10.cumulative_runoff_ft3,
        "baseline_cumulative_ft3": br10.cumulative_runoff_ft3,
    }

    return {
        "score": {
            "overall": round(overall, 1),
            "grade": grade,
            "runoff_increase_pct": round(runoff_increase, 1),
            "peak_flow_increase_pct": round(peak_increase, 1),
            "soil_suitability": soil_score,
            "flood_risk": round(flood_score, 1),
        },
        "comparison": comparison,
        "timeseries": timeseries,
        "config": {
            "lat": lat,
            "lng": lng,
            "soil_group": soil_group,
            "area_sqft": site_area_sqft,
            "frac_imperv": frac_imperv,
            "slope": slope,
            "flood_zone": flood_zone,
            "near_water": near_water,
        },
    }
