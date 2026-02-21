"""
Runny — Stormwater Runoff Forecasting API
Built on EPA SWMM methodology (public domain).
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os

from .engine.scoring import score_site
from .engine.rainfall import list_storms, get_design_storm
from .engine.runoff import SubcatchConfig, run_simulation, baseline_config
from .data.sites import get_all_sites, get_site

app = FastAPI(title="Runny", version="0.1.0",
              description="Stormwater Runoff Forecasting for Factory Site Selection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# API Endpoints
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


@app.get("/api/storms")
def api_list_storms():
    """List available design storm scenarios."""
    return {"storms": list_storms()}


class AnalyzeRequest(BaseModel):
    site_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    soil_group: Optional[str] = "B"
    area_sqft: float = 217800.0
    frac_imperv: float = 0.65
    slope: float = 0.02
    flood_zone: bool = False
    near_water: bool = False


@app.post("/api/analyze")
def api_analyze(req: AnalyzeRequest):
    """
    Analyze a factory site for stormwater runoff impact.
    Can pass site_id to use a preset, or provide lat/lng + soil data directly.
    """
    if req.site_id:
        site = get_site(req.site_id)
        if not site:
            raise HTTPException(404, f"Site '{req.site_id}' not found")
        result = score_site(
            lat=site["lat"],
            lng=site["lng"],
            soil_group=site["soil_group"],
            site_area_sqft=req.area_sqft,
            frac_imperv=req.frac_imperv,
            slope=site["slope"],
            flood_zone=site.get("flood_zone", False),
            near_water=site.get("near_water", False),
        )
    else:
        if req.lat is None or req.lng is None:
            raise HTTPException(400, "Provide site_id or lat/lng")
        result = score_site(
            lat=req.lat,
            lng=req.lng,
            soil_group=req.soil_group,
            site_area_sqft=req.area_sqft,
            frac_imperv=req.frac_imperv,
            slope=req.slope,
            flood_zone=req.flood_zone,
            near_water=req.near_water,
        )
    return result


@app.get("/api/analyze/{site_id}")
def api_analyze_get(
    site_id: str,
    frac_imperv: float = Query(0.65, ge=0, le=1),
    area_sqft: float = Query(217800.0, gt=0),
):
    """Quick GET-based analysis for a preset site."""
    site = get_site(site_id)
    if not site:
        raise HTTPException(404, f"Site '{site_id}' not found")
    return score_site(
        lat=site["lat"],
        lng=site["lng"],
        soil_group=site["soil_group"],
        site_area_sqft=area_sqft,
        frac_imperv=frac_imperv,
        slope=site["slope"],
        flood_zone=site.get("flood_zone", False),
        near_water=site.get("near_water", False),
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
