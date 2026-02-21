"""
Fetch real soil, rainfall, flood zone, and elevation data from
free federal APIs for any US lat/lng.

Sources:
  - USDA SSURGO / Soil Data Access   → hydrologic soil group
  - NOAA Atlas 14 (PFDS)             → design-storm rainfall depths
  - FEMA NFHL                        → flood zone classification
  - USGS EPQS                        → ground elevation (for slope est.)
"""

from __future__ import annotations

import json
import math
import urllib.request
import urllib.parse
from typing import Optional

# ── Timeout for all external API calls (seconds) ──────────────────────
_TIMEOUT = 8


# ======================================================================
# USDA Soil Data Access – hydrologic soil group
# ======================================================================

def fetch_soil_group(lat: float, lng: float) -> str:
    """
    Query USDA SDA for the dominant hydrologic soil group at a point.
    Returns one of A, B, C, D.  Falls back to "B" on any error.
    """
    sql = (
        "SELECT TOP 1 hydgrpdcd "
        "FROM mapunit mu "
        "INNER JOIN muaggatt ma ON mu.mukey = ma.mukey "
        "WHERE mu.mukey IN ("
        "  SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84("
        f"    'POINT({lng} {lat})')"
        ")"
    )
    payload = json.dumps({"query": sql, "format": "JSON"}).encode()
    req = urllib.request.Request(
        "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read())
        rows = data.get("Table", [])
        if rows:
            grp = str(rows[0][0] or "").strip().upper()
            # Handle dual groups like "A/D" → take the worse one
            if "/" in grp:
                grp = grp.split("/")[-1]
            if grp in ("A", "B", "C", "D"):
                return grp
    except Exception:
        pass
    return "B"  # safe default


# ======================================================================
# NOAA PFDS (Atlas 14) – precipitation frequency estimates
# ======================================================================

def fetch_rainfall_data(lat: float, lng: float) -> dict:
    """
    Fetch precipitation depths (inches) for common durations/return periods
    from NOAA Atlas 14.  Returns dict keyed by return period label.

    Falls back to Austin TX defaults on any error.
    """
    defaults = {
        "2yr": 3.7,
        "10yr": 5.8,
        "25yr": 7.2,
        "100yr": 10.0,
    }

    url = (
        f"https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/cgi_readH5.py"
        f"?lat={lat}&lon={lng}&type=pf&data=depth&units=english&series=pds"
    )
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            raw = resp.read().decode("utf-8", errors="replace")

        # NOAA returns a JavaScript-like response.  Parse it for 24-hr values.
        # The line with "quantiles" has the data in arrays.
        # Format: var defined variables with arrays of values
        # We need the 24-hour duration row for 2, 10, 25, 100 yr return periods.
        # Return periods: 1,2,5,10,25,50,100,200,500,1000
        # Durations are listed in order; 24-hour is usually index 9 (or near it)

        result = {}
        # Try to extract the quantiles data
        if "quantiles" in raw:
            # Find the quantiles line
            for line in raw.split("\n"):
                if "quantiles" in line and "=" in line:
                    # Extract the nested array
                    arr_str = line.split("=", 1)[1].strip().rstrip(";")
                    data = json.loads(arr_str)
                    # data is 2D: [duration_index][return_period_index]
                    # Return periods: 1,2,5,10,25,50,100,200,500,1000 → indices 1,3,4,6
                    # Duration for 24hr is typically index 9
                    if len(data) > 9:
                        row = data[9]  # 24-hour row
                        rp_map = {1: "2yr", 3: "10yr", 4: "25yr", 6: "100yr"}
                        for idx, key in rp_map.items():
                            if idx < len(row):
                                val = row[idx]
                                if isinstance(val, str):
                                    val = float(val)
                                result[key] = round(val, 2)
                    break

        # Validate and fill gaps
        for k, v in defaults.items():
            if k not in result or result[k] <= 0:
                result[k] = v

        return result

    except Exception:
        return defaults


# ======================================================================
# FEMA NFHL – flood zone lookup
# ======================================================================

def fetch_flood_zone(lat: float, lng: float) -> dict:
    """
    Query FEMA National Flood Hazard Layer for flood zone at a point.
    Returns {"flood_zone": bool, "zone_code": str, "zone_label": str}.
    """
    base = (
        "https://hazards.fema.gov/gis/nfhl/rest/services"
        "/public/NFHL/MapServer/28/query"
    )
    params = urllib.parse.urlencode({
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "FLD_ZONE,ZONE_SUBTY,SFHA_TF",
        "returnGeometry": "false",
        "f": "json",
    })
    url = f"{base}?{params}"
    try:
        with urllib.request.urlopen(url, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read())
        features = data.get("features", [])
        if features:
            attrs = features[0].get("attributes", {})
            zone = str(attrs.get("FLD_ZONE", "X"))
            sfha = str(attrs.get("SFHA_TF", "F")).upper()
            is_flood = sfha == "T" or zone in ("A", "AE", "AO", "AH", "V", "VE")
            labels = {
                "A": "100-yr Flood Zone (approx.)",
                "AE": "100-yr Flood Zone (detailed)",
                "AO": "100-yr Shallow Flooding",
                "AH": "100-yr Shallow Flooding",
                "V": "Coastal 100-yr Flood Zone",
                "VE": "Coastal 100-yr Flood Zone (detailed)",
                "X": "Minimal Flood Hazard",
                "D": "Undetermined",
            }
            return {
                "flood_zone": is_flood,
                "zone_code": zone,
                "zone_label": labels.get(zone, f"Zone {zone}"),
            }
    except Exception:
        pass
    return {"flood_zone": False, "zone_code": "X", "zone_label": "Minimal Flood Hazard (default)"}


# ======================================================================
# USGS EPQS – elevation
# ======================================================================

def fetch_elevation(lat: float, lng: float) -> float:
    """
    Get ground elevation in feet at a point from USGS.
    Returns elevation in feet. Falls back to 500 ft on error.
    """
    url = (
        f"https://epqs.nationalmap.gov/v1/json"
        f"?x={lng}&y={lat}&wkid=4326&units=Feet&includeDate=false"
    )
    try:
        with urllib.request.urlopen(url, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read())
        val = data.get("value")
        if val is not None:
            return float(val)
    except Exception:
        pass
    return 500.0  # reasonable default for central TX


def estimate_slope(lat: float, lng: float, offset_ft: float = 200.0) -> float:
    """
    Estimate local slope by sampling elevation at two nearby points.
    Returns slope as a fraction (e.g. 0.02 = 2%).
    """
    # offset in degrees (roughly offset_ft / 364,000 ft per degree)
    d_deg = offset_ft / 364000.0
    try:
        e1 = fetch_elevation(lat, lng)
        e2 = fetch_elevation(lat + d_deg, lng)
        rise = abs(e2 - e1)
        slope = rise / offset_ft
        return max(0.005, min(0.15, slope))  # clamp to reasonable range
    except Exception:
        return 0.02


# ======================================================================
# Combined lookup – single call to get everything
# ======================================================================

def fetch_site_data(lat: float, lng: float) -> dict:
    """
    Fetch all environmental data for a point.
    Returns a combined dict with soil, rainfall, flood, elevation info.
    """
    soil_group = fetch_soil_group(lat, lng)
    rainfall = fetch_rainfall_data(lat, lng)
    flood = fetch_flood_zone(lat, lng)
    elevation = fetch_elevation(lat, lng)
    slope = estimate_slope(lat, lng)

    # Determine if near water body based on elevation profile
    # (very rough heuristic — low elevation delta ≈ flat near water)
    near_water = flood["flood_zone"]  # conservative: flood zone implies near water

    return {
        "lat": lat,
        "lng": lng,
        "soil_group": soil_group,
        "slope": round(slope, 4),
        "elevation_ft": round(elevation, 1),
        "flood_zone": flood["flood_zone"],
        "flood_zone_code": flood["zone_code"],
        "flood_zone_label": flood["zone_label"],
        "near_water": near_water,
        "rainfall": rainfall,
    }
