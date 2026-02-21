"""
Rainfall scenario generators for Austin, TX area.
Provides design-storm hyetographs using SCS Type-II distribution.
"""

from __future__ import annotations
from typing import List, Tuple

# ---------------------------------------------------------------------------
# SCS Type-II cumulative rainfall fractions (24-hr storm)
# Time (hr) : cumulative fraction of total rainfall
# ---------------------------------------------------------------------------
SCS_TYPE_II = [
    (0.0, 0.000), (0.5, 0.005), (1.0, 0.011), (1.5, 0.017),
    (2.0, 0.026), (2.5, 0.035), (3.0, 0.045), (3.5, 0.057),
    (4.0, 0.070), (4.5, 0.084), (5.0, 0.100), (5.5, 0.120),
    (6.0, 0.140), (6.5, 0.163), (7.0, 0.189), (7.5, 0.220),
    (8.0, 0.256), (8.5, 0.298), (9.0, 0.339), (9.5, 0.380),
    (10.0, 0.422), (10.5, 0.465), (11.0, 0.509), (11.5, 0.560),
    (11.75, 0.630), (12.0, 0.735), (12.25, 0.800), (12.5, 0.836),
    (13.0, 0.870), (13.5, 0.895), (14.0, 0.915), (14.5, 0.930),
    (15.0, 0.943), (15.5, 0.953), (16.0, 0.962), (16.5, 0.969),
    (17.0, 0.975), (17.5, 0.980), (18.0, 0.984), (18.5, 0.988),
    (19.0, 0.991), (19.5, 0.993), (20.0, 0.995), (20.5, 0.996),
    (21.0, 0.997), (21.5, 0.998), (22.0, 0.998), (22.5, 0.999),
    (23.0, 0.999), (23.5, 1.000), (24.0, 1.000),
]


def scs_type2_hyetograph(total_rain_in: float,
                         duration_hr: float = 24.0,
                         dt_hr: float = 0.25) -> List[Tuple[float, float]]:
    """
    Generate an SCS Type-II rainfall hyetograph.
    
    Returns list of (time_hr, intensity_in_hr) pairs.
    """
    # Build cumulative fractions at desired dt
    steps = int(duration_hr / dt_hr) + 1
    result: List[Tuple[float, float]] = []
    prev_frac = 0.0

    for i in range(steps):
        t = i * dt_hr
        # Interpolate cumulative fraction from SCS table
        frac = _interp_scs(t)
        # Intensity = dP/dt
        if i == 0:
            intensity = 0.0
        else:
            intensity = (frac - prev_frac) * total_rain_in / dt_hr
        result.append((round(t, 4), round(max(intensity, 0.0), 4)))
        prev_frac = frac

    return result


def _interp_scs(t: float) -> float:
    """Linearly interpolate the SCS Type-II table."""
    if t <= 0:
        return 0.0
    if t >= 24.0:
        return 1.0
    for i in range(len(SCS_TYPE_II) - 1):
        t0, f0 = SCS_TYPE_II[i]
        t1, f1 = SCS_TYPE_II[i + 1]
        if t0 <= t <= t1:
            return f0 + (f1 - f0) * (t - t0) / (t1 - t0)
    return 1.0


# ---------------------------------------------------------------------------
# Design-storm presets for Austin, TX (from NOAA Atlas 14)
# ---------------------------------------------------------------------------
AUSTIN_DESIGN_STORMS = {
    "2yr-24hr":  {"total_rain_in": 3.7,  "return_period": 2,  "label": "2-Year, 24-Hour Storm (3.7 in)"},
    "10yr-24hr": {"total_rain_in": 5.8,  "return_period": 10, "label": "10-Year, 24-Hour Storm (5.8 in)"},
    "25yr-24hr": {"total_rain_in": 7.2,  "return_period": 25, "label": "25-Year, 24-Hour Storm (7.2 in)"},
    "100yr-24hr":{"total_rain_in": 10.0, "return_period": 100,"label": "100-Year, 24-Hour Storm (10.0 in)"},
}


def get_design_storm(storm_id: str, dt_hr: float = 0.25) -> dict:
    """Get a complete design storm hyetograph + metadata."""
    storm = AUSTIN_DESIGN_STORMS.get(storm_id)
    if not storm:
        raise ValueError(f"Unknown storm: {storm_id}. Options: {list(AUSTIN_DESIGN_STORMS)}")
    hyetograph = scs_type2_hyetograph(storm["total_rain_in"], dt_hr=dt_hr)
    return {
        "id": storm_id,
        "label": storm["label"],
        "total_rain_in": storm["total_rain_in"],
        "return_period": storm["return_period"],
        "hyetograph": hyetograph,
    }


def list_storms() -> List[dict]:
    """List all available design storms."""
    return [
        {"id": k, **v}
        for k, v in AUSTIN_DESIGN_STORMS.items()
    ]
