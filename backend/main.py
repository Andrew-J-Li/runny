"""
Runny — Stormwater Runoff Forecasting API
Built on EPA SWMM methodology (public domain).
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from typing import Optional, List
import os

from .engine.scoring import score_site
from .engine.rainfall import list_storms, get_design_storm
from .engine.runoff import SubcatchConfig, run_simulation, baseline_config
from .engine.geodata import fetch_site_data
from .engine.green_infra import recommend_green_infra
from .engine.compliance import check_compliance
from .engine.costs import compute_cost_benefit
from .engine.report import generate_report
from .data.sites import get_all_sites, get_site
from .data.factories import get_factory_types, get_factory_type

app = FastAPI(title="Runny", version="0.2.0",
              description="Stormwater Runoff Forecasting for Factory Site Selection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    site_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    soil_group: Optional[str] = None      # None = auto-fetch from USDA
    area_sqft: Optional[float] = None     # None = use factory default
    frac_imperv: Optional[float] = None   # None = use factory default
    slope: Optional[float] = None         # None = auto-fetch from USGS
    flood_zone: Optional[bool] = None     # None = auto-fetch from FEMA
    near_water: Optional[bool] = None
    factory_type: str = "light_manufacturing"


class GeoLookupRequest(BaseModel):
    lat: float
    lng: float


class ReportRequest(BaseModel):
    site_name: str = "Custom Site"
    factory_type: str = "light_manufacturing"
    lat: float
    lng: float
    soil_group: Optional[str] = None
    area_sqft: Optional[float] = None
    frac_imperv: Optional[float] = None
    slope: Optional[float] = None
    flood_zone: Optional[bool] = None
    near_water: Optional[bool] = None


# ---------------------------------------------------------------------------
# API Endpoints — Sites
# ---------------------------------------------------------------------------

@app.get("/api/sites")
def api_list_sites():
    """List all candidate factory sites."""
    return {"sites": get_all_sites()}


@app.get("/api/sites/{site_id}")
def api_get_site(site_id: str):
    """Get details for a specific site."""
    site = get_site(site_id)
    if not site:
        raise HTTPException(404, "Site not found")
    return site


# ---------------------------------------------------------------------------
# API Endpoints — Factory Types
# ---------------------------------------------------------------------------

@app.get("/api/factories")
def api_list_factories():
    """List all factory type presets."""
    return {"factories": get_factory_types()}


@app.get("/api/factories/{factory_id}")
def api_get_factory(factory_id: str):
    """Get details for a specific factory type."""
    ft = get_factory_type(factory_id)
    if not ft:
        raise HTTPException(404, "Factory type not found")
    return ft


# ---------------------------------------------------------------------------
# API Endpoints — Geo Data Lookup
# ---------------------------------------------------------------------------

@app.post("/api/geodata")
def api_geodata(req: GeoLookupRequest):
    """
    Fetch real soil, rainfall, flood, and elevation data for a lat/lng
    from USDA, NOAA, FEMA, and USGS APIs.
    """
    data = fetch_site_data(req.lat, req.lng)
    return data


# ---------------------------------------------------------------------------
# API Endpoints — Storms
# ---------------------------------------------------------------------------

@app.get("/api/storms")
def api_list_storms():
    """List available design storm scenarios."""
    return {"storms": list_storms()}


# ---------------------------------------------------------------------------
# Helper — resolve analysis params
# ---------------------------------------------------------------------------

def _resolve_params(req: AnalyzeRequest) -> dict:
    """
    Resolve analysis parameters — use provided values, fall back to
    factory type defaults, then auto-fetch from APIs if needed.
    """
    ft = get_factory_type(req.factory_type) or get_factory_type("light_manufacturing")

    params = {
        "frac_imperv": req.frac_imperv if req.frac_imperv is not None else ft["default_frac_imperv"],
        "area_sqft": req.area_sqft if req.area_sqft is not None else ft["default_area_sqft"],
    }

    if req.site_id:
        site = get_site(req.site_id)
        if not site:
            raise HTTPException(404, f"Site '{req.site_id}' not found")
        params["lat"] = site["lat"]
        params["lng"] = site["lng"]
        params["soil_group"] = req.soil_group or site["soil_group"]
        params["slope"] = req.slope if req.slope is not None else site["slope"]
        params["flood_zone"] = req.flood_zone if req.flood_zone is not None else site.get("flood_zone", False)
        params["near_water"] = req.near_water if req.near_water is not None else site.get("near_water", False)
        params["site_name"] = site["name"]
    else:
        if req.lat is None or req.lng is None:
            raise HTTPException(400, "Provide site_id or lat/lng")
        params["lat"] = req.lat
        params["lng"] = req.lng

        needs_fetch = (
            req.soil_group is None or
            req.slope is None or
            req.flood_zone is None
        )
        if needs_fetch:
            geo = fetch_site_data(req.lat, req.lng)
            params["soil_group"] = req.soil_group or geo["soil_group"]
            params["slope"] = req.slope if req.slope is not None else geo["slope"]
            params["flood_zone"] = req.flood_zone if req.flood_zone is not None else geo["flood_zone"]
            params["near_water"] = req.near_water if req.near_water is not None else geo["near_water"]
        else:
            params["soil_group"] = req.soil_group
            params["slope"] = req.slope
            params["flood_zone"] = req.flood_zone
            params["near_water"] = req.near_water or False

        params["site_name"] = f"Custom ({params['lat']:.3f}, {params['lng']:.3f})"

    params["factory_type"] = req.factory_type
    params["factory"] = ft
    return params


# ---------------------------------------------------------------------------
# API Endpoints — Analysis (full)
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
def api_analyze(req: AnalyzeRequest):
    """
    Full analysis: runoff scoring + green infra + compliance + costs.
    Auto-fetches missing geo data from federal APIs.
    """
    p = _resolve_params(req)

    analysis = score_site(
        lat=p["lat"],
        lng=p["lng"],
        soil_group=p["soil_group"],
        site_area_sqft=p["area_sqft"],
        frac_imperv=p["frac_imperv"],
        slope=p["slope"],
        flood_zone=p["flood_zone"],
        near_water=p["near_water"],
    )

    green = recommend_green_infra(
        soil_group=p["soil_group"],
        site_area_sqft=p["area_sqft"],
        frac_imperv=p["frac_imperv"],
        runoff_increase_pct=analysis["score"]["runoff_increase_pct"],
        peak_increase_pct=analysis["score"]["peak_flow_increase_pct"],
        flood_zone=p["flood_zone"],
    )

    comp = check_compliance(
        site_area_sqft=p["area_sqft"],
        frac_imperv=p["frac_imperv"],
        soil_group=p["soil_group"],
        flood_zone=p["flood_zone"],
        near_water=p["near_water"],
        runoff_increase_pct=analysis["score"]["runoff_increase_pct"],
        peak_increase_pct=analysis["score"]["peak_flow_increase_pct"],
        factory_type_id=p["factory_type"],
        comparison=analysis.get("comparison"),
    )

    costs = compute_cost_benefit(
        site_area_sqft=p["area_sqft"],
        frac_imperv=p["frac_imperv"],
        soil_group=p["soil_group"],
        slope=p["slope"],
        flood_zone=p["flood_zone"],
        near_water=p["near_water"],
        factory_type=p["factory"],
        green_infra=green,
        runoff_increase_pct=analysis["score"]["runoff_increase_pct"],
        peak_increase_pct=analysis["score"]["peak_flow_increase_pct"],
    )

    return {
        **analysis,
        "green_infra": green,
        "compliance": comp,
        "costs": costs,
        "site_name": p["site_name"],
        "factory_type": p["factory"],
    }


@app.get("/api/analyze/{site_id}")
def api_analyze_get(
    site_id: str,
    frac_imperv: float = Query(None, ge=0, le=1),
    area_sqft: float = Query(None, gt=0),
    factory_type: str = Query("light_manufacturing"),
):
    """Quick GET-based analysis for a preset site."""
    req = AnalyzeRequest(
        site_id=site_id,
        frac_imperv=frac_imperv,
        area_sqft=area_sqft,
        factory_type=factory_type,
    )
    return api_analyze(req)


# ---------------------------------------------------------------------------
# API Endpoints — PDF Report
# ---------------------------------------------------------------------------

@app.post("/api/report")
def api_generate_report(req: ReportRequest):
    """Generate a downloadable PDF site assessment report."""
    ft = get_factory_type(req.factory_type) or get_factory_type("light_manufacturing")

    analyze_req = AnalyzeRequest(
        lat=req.lat,
        lng=req.lng,
        soil_group=req.soil_group,
        area_sqft=req.area_sqft or ft["default_area_sqft"],
        frac_imperv=req.frac_imperv or ft["default_frac_imperv"],
        slope=req.slope,
        flood_zone=req.flood_zone,
        near_water=req.near_water,
        factory_type=req.factory_type,
    )
    result = api_analyze(analyze_req)

    pdf_bytes = generate_report(
        site_name=req.site_name,
        factory_name=ft["name"],
        analysis=result,
        compliance=result.get("compliance"),
        green_infra=result.get("green_infra", []),
        costs=result.get("costs"),
        lat=req.lat,
        lng=req.lng,
    )

    if pdf_bytes is None:
        raise HTTPException(500, "PDF generation not available (reportlab not installed)")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=runny-report.pdf"},
    )


# ---------------------------------------------------------------------------
# Serve React frontend (production build)
# ---------------------------------------------------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
