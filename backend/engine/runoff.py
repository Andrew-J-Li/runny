"""
Stormwater Runoff Engine — translated from EPA SWMM 5.2 C source code.

Key sources:
  - USEPA/Stormwater-Management-Model  src/solver/infil.c
  - USEPA/Stormwater-Management-Model  src/solver/subcatch.c
  - USEPA/Stormwater-Management-Model  src/solver/runoff.c

Public-domain EPA code re-implemented in Python for educational / hackathon use.
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import List

# ---------------------------------------------------------------------------
# Constants (from SWMM consts.h & subcatch.c)
# ---------------------------------------------------------------------------
MCOEFF = 1.49          # Manning coefficient (US customary)
MEXP = 5.0 / 3.0       # Exponent in Manning equation
ODETOL = 0.0001        # ODE solver tolerance
ZERO = 1.0e-10
SECperDAY = 86400.0
TINY = 1.0e-6
MIN_RUNOFF = 1.0e-9     # ft/sec

# ---------------------------------------------------------------------------
# Soil / hydrologic parameter look-ups  (USDA Hydrologic Soil Groups)
# ---------------------------------------------------------------------------
# For Green-Ampt: suction_head (in), Ksat (in/hr), IMDmax (fraction)
SOIL_PARAMS = {
    "A": {"suction": 1.93, "ksat": 4.74,  "imd": 0.34, "cn": 61},
    "B": {"suction": 4.33, "ksat": 0.60,  "imd": 0.32, "cn": 74},
    "C": {"suction": 8.60, "ksat": 0.13,  "imd": 0.27, "cn": 83},
    "D": {"suction": 11.50, "ksat": 0.04, "imd": 0.22, "cn": 90},
}


# ---------------------------------------------------------------------------
# Horton infiltration  (translated from infil.c  horton_getInfil)
# ---------------------------------------------------------------------------
@dataclass
class HortonState:
    """State for Horton infiltration model."""
    f0: float = 0.0       # max infil rate (ft/sec)
    fmin: float = 0.0     # min infil rate (ft/sec)
    decay: float = 0.0    # decay constant (1/sec)
    regen: float = 0.0    # regeneration constant (1/sec)
    Fmax: float = 0.0     # max cumulative infiltration (ft)
    tp: float = 0.0       # cumulative time on curve (sec)
    Fe: float = 0.0       # cumulative infiltration (ft)


def horton_set_params(f0_inhr: float, fmin_inhr: float,
                      decay_1hr: float, dry_days: float,
                      fmax_in: float = 0.0) -> HortonState:
    """Set Horton parameters (units: in/hr, 1/hr, days, in)."""
    h = HortonState()
    h.f0 = f0_inhr / 12.0 / 3600.0     # -> ft/sec
    h.fmin = fmin_inhr / 12.0 / 3600.0
    h.decay = decay_1hr / 3600.0
    if dry_days == 0.0:
        dry_days = TINY
    h.regen = -math.log(1.0 - 0.98) / dry_days / SECperDAY
    h.Fmax = fmax_in / 12.0  # -> ft
    return h


def horton_get_infil(h: HortonState, tstep: float,
                     irate: float, depth: float,
                     evap_recovery: float = 1.0) -> float:
    """Compute Horton infiltration rate (ft/sec)."""
    df = h.f0 - h.fmin
    kd = h.decay
    kr = h.regen * evap_recovery

    if df < 0 or kd < 0 or kr < 0:
        return 0.0
    if df == 0 or kd == 0:
        fp = h.f0
        fa = irate + depth / tstep
        return max(0.0, min(fp, fa))

    fa = irate + depth / tstep

    if fa > ZERO:
        t1 = h.tp + tstep
        tlim = 16.0 / kd
        if h.tp >= tlim:
            Fp = h.fmin * h.tp + df / kd
            F1 = Fp + h.fmin * tstep
        else:
            Fp = h.fmin * h.tp + df / kd * (1.0 - math.exp(-kd * h.tp))
            F1 = h.fmin * t1 + df / kd * (1.0 - math.exp(-kd * t1))
        fp = (F1 - Fp) / tstep
        fp = max(fp, h.fmin)
        if fp > fa:
            fp = fa

        if t1 > tlim:
            h.tp = t1
        elif fp < fa:
            h.tp = t1
        else:
            F1 = Fp + fp * tstep
            tp = h.tp + tstep / 2.0
            for _ in range(20):
                kt = min(60.0, kd * tp)
                ex = math.exp(-kt)
                FF = h.fmin * tp + df / kd * (1.0 - ex) - F1
                FF1 = h.fmin + df * ex
                r = FF / FF1
                tp -= r
                if abs(r) <= 0.001 * tstep:
                    break
            h.tp = tp

        if h.Fmax > 0.0:
            if h.Fe + fp * tstep > h.Fmax:
                fp = (h.Fmax - h.Fe) / tstep
            fp = max(fp, 0.0)
            h.Fe += fp * tstep
    else:
        fp = 0.0
        if kr > 0:
            r = math.exp(-kr * tstep)
            tp_val = 1.0 - math.exp(-kd * h.tp)
            h.tp = -math.log(max(1.0 - r * tp_val, TINY)) / kd
            if h.Fmax > 0:
                h.Fe = h.fmin * h.tp + (df / kd) * (1.0 - math.exp(-kd * h.tp))

    return fp


# ---------------------------------------------------------------------------
# Green-Ampt infiltration (translated from infil.c grnampt_*)
# ---------------------------------------------------------------------------
@dataclass
class GreenAmptState:
    S: float = 0.0       # capillary suction head (ft)
    Ks: float = 0.0      # sat. hydraulic conductivity (ft/sec)
    IMDmax: float = 0.0  # max initial moisture deficit
    IMD: float = 0.0     # current moisture deficit
    Lu: float = 0.0      # depth of upper soil zone (ft)
    F: float = 0.0       # cumulative infiltration volume (ft)
    Fu: float = 0.0      # upper zone infiltration volume (ft)
    Sat: bool = False     # saturation flag
    T: float = 0.0       # time to next event


def grnampt_set_params(suction_in: float, ksat_inhr: float,
                       imd_max: float) -> GreenAmptState:
    g = GreenAmptState()
    g.S = suction_in / 12.0
    g.Ks = ksat_inhr / 12.0 / 3600.0
    g.IMDmax = imd_max
    g.IMD = imd_max
    ksat = g.Ks * 12.0 * 3600.0
    g.Lu = 4.0 * math.sqrt(max(ksat, 0)) / 12.0
    return g


def grnampt_get_f2(f1: float, c1: float, ks: float, ts: float) -> float:
    """Newton-Raphson solution of integrated Green-Ampt equation."""
    f2 = f1
    f2min = f1 + ks * ts
    if c1 == 0.0:
        return f2min
    if ts < 10.0 and f1 > 0.01 * c1:
        f2 = f1 + ks * (1.0 + c1 / f1) * ts
        return max(f2, f2min)
    c2 = c1 * math.log(f1 + c1) - ks * ts
    for _ in range(20):
        denom = 1.0 - c1 / (f2 + c1)
        if abs(denom) < TINY:
            break
        df2 = (f2 - f1 - c1 * math.log(f2 + c1) + c2) / denom
        if abs(df2) < 0.00001:
            return max(f2, f2min)
        f2 -= df2
    return f2min


def grnampt_get_infil(g: GreenAmptState, tstep: float,
                      irate: float, depth: float,
                      infil_factor: float = 1.0) -> float:
    """Compute Green-Ampt infiltration rate (ft/sec)."""
    ks = g.Ks * infil_factor
    Fumax = g.IMDmax * g.Lu * math.sqrt(infil_factor)
    g.T -= tstep
    ia = irate + depth / tstep
    if ia < ZERO:
        ia = 0.0

    if g.Sat:
        # Saturated path
        g.T = 5400.0 / max(g.Lu, TINY)
        c1 = (g.S + depth) * g.IMD
        F2 = grnampt_get_f2(g.F, c1, ks, tstep)
        dF = F2 - g.F
        if dF > ia * tstep:
            dF = ia * tstep
            g.Sat = False
        g.F += dF
        g.Fu += dF
        g.Fu = min(g.Fu, Fumax)
        return dF / tstep

    # Unsaturated path
    if ia == 0.0:
        if g.Fu <= 0:
            return 0.0
        kr = g.Lu / 90000.0
        dF = kr * Fumax * tstep
        g.F -= dF
        g.Fu -= dF
        if g.Fu <= 0:
            g.Fu = 0.0
            g.F = 0.0
            g.IMD = g.IMDmax
        elif g.T <= 0:
            g.IMD = (Fumax - g.Fu) / max(g.Lu, TINY)
            g.F = 0.0
        return 0.0

    if ia <= ks:
        dF = ia * tstep
        g.F += dF
        g.Fu += dF
        g.Fu = min(g.Fu, Fumax)
        if g.T <= 0:
            g.IMD = (Fumax - g.Fu) / max(g.Lu, TINY)
            g.F = 0.0
        return ia

    g.T = 5400.0 / max(g.Lu, TINY)
    Fs = ks * (g.S + depth) * g.IMD / max(ia - ks, TINY)

    if g.F > Fs:
        g.Sat = True
        c1 = (g.S + depth) * g.IMD
        F2 = grnampt_get_f2(g.F, c1, ks, tstep)
        dF = F2 - g.F
        if dF > ia * tstep:
            dF = ia * tstep
        g.F += dF
        g.Fu += dF
        g.Fu = min(g.Fu, Fumax)
        return dF / tstep

    if g.F + ia * tstep < Fs:
        dF = ia * tstep
        g.F += dF
        g.Fu += dF
        g.Fu = min(g.Fu, Fumax)
        return ia

    ts = tstep - (Fs - g.F) / ia
    if ts <= 0:
        ts = 0.0
    c1 = (g.S + depth) * g.IMD
    F2 = grnampt_get_f2(Fs, c1, ks, ts)
    if F2 > Fs + ia * ts:
        F2 = Fs + ia * ts
    dF = F2 - g.F
    g.F = F2
    g.Fu += dF
    g.Fu = min(g.Fu, Fumax)
    g.Sat = True
    return dF / tstep


# ---------------------------------------------------------------------------
# SCS Curve Number infiltration (translated from infil.c curvenum_*)
# ---------------------------------------------------------------------------
@dataclass
class CurveNumState:
    Smax: float = 0.0    # max infiltration capacity (ft)
    S: float = 0.0       # current capacity (ft)
    P: float = 0.0       # cumulative precip (ft)
    F_cn: float = 0.0    # cumulative infiltration (ft)
    T: float = 0.0       # inter-event time (sec)
    Se: float = 0.0      # current event capacity (ft)
    f: float = 0.0       # last infiltration rate (ft/sec)
    regen: float = 0.0   # regeneration constant (1/sec)
    Tmax: float = 0.0    # inter-event threshold (sec)


def curvenum_set_params(cn: float, dry_days: float = 5.0) -> CurveNumState:
    """Set SCS Curve Number parameters."""
    c = CurveNumState()
    cn = max(10.0, min(99.0, cn))
    c.Smax = (1000.0 / cn - 10.0) / 12.0   # ft
    if dry_days > 0:
        c.regen = 1.0 / (dry_days * SECperDAY)
    else:
        c.regen = 1.0 / (5.0 * SECperDAY)
    c.Tmax = 0.06 / c.regen
    c.S = c.Smax
    c.Se = c.Smax
    return c


def curvenum_get_infil(c: CurveNumState, tstep: float,
                       irate: float, depth: float) -> float:
    """Compute SCS Curve Number infiltration rate (ft/sec)."""
    fa = irate + depth / tstep
    f1 = 0.0

    if irate > ZERO:
        if c.T >= c.Tmax:
            c.P = 0.0
            c.F_cn = 0.0
            c.f = 0.0
            c.Se = c.S
        c.T = 0.0
        c.P += irate * tstep
        if c.P + c.Se > ZERO:
            F1 = c.P * (1.0 - c.P / (c.P + c.Se))
        else:
            F1 = 0.0
        f1 = (F1 - c.F_cn) / tstep
        if f1 < 0 or c.S <= 0:
            f1 = 0.0
    else:
        if depth > 0.001 and c.S > 0:
            f1 = c.f
            if f1 * tstep > c.S:
                f1 = c.S / tstep
        else:
            c.T += tstep

    if f1 > 0:
        f1 = min(f1, fa)
        f1 = max(f1, 0.0)
        c.F_cn += f1 * tstep
        if c.regen > 0:
            c.S -= f1 * tstep
            c.S = max(c.S, 0.0)
    else:
        c.S += c.regen * c.Smax * tstep
        c.S = min(c.S, c.Smax)

    c.f = f1
    return f1


# ---------------------------------------------------------------------------
# Sub-area runoff (translated from subcatch.c)
# ---------------------------------------------------------------------------
@dataclass
class SubcatchConfig:
    """Configuration for a sub-catchment / development site."""
    area_sqft: float = 217800.0      # total site area (5 acres default)
    frac_imperv: float = 0.65        # fraction impervious
    slope: float = 0.02              # average slope (ft/ft)
    width_ft: float = 400.0          # overland flow width (ft)
    n_imperv: float = 0.015          # Manning's N for impervious
    n_perv: float = 0.25             # Manning's N for pervious
    dstore_imperv: float = 0.05 / 12.0   # depression storage imperv (ft)
    dstore_perv: float = 0.20 / 12.0     # depression storage perv (ft)
    soil_group: str = "B"            # USDA hydrologic soil group


@dataclass
class SubcatchState:
    depth_imperv: float = 0.0
    depth_perv: float = 0.0
    infil_state: CurveNumState = field(default_factory=CurveNumState)


def compute_alpha(area_ft2: float, width_ft: float,
                  slope: float, n: float) -> float:
    """Manning's alpha = MCOEFF * W/A * sqrt(S) / n"""
    if area_ft2 <= 0 or n <= 0:
        return 0.0
    return MCOEFF * width_ft / area_ft2 * math.sqrt(slope) / n


def find_subarea_runoff(depth: float, dstore: float,
                        alpha: float, tRunoff: float) -> float:
    """Compute runoff from a sub-area (ft/sec), from subcatch.c findSubareaRunoff."""
    x = depth - dstore
    if x <= ZERO:
        return 0.0
    if alpha > 0:
        return alpha * (x ** MEXP)
    else:
        return x / tRunoff


# ---------------------------------------------------------------------------
# Full simulation driver
# ---------------------------------------------------------------------------
@dataclass
class SimulationResult:
    time_hours: List[float] = field(default_factory=list)
    rainfall_in_hr: List[float] = field(default_factory=list)
    runoff_cfs: List[float] = field(default_factory=list)
    infiltration_in_hr: List[float] = field(default_factory=list)
    cumulative_runoff_ft3: List[float] = field(default_factory=list)
    peak_runoff_cfs: float = 0.0
    total_runoff_ft3: float = 0.0
    total_rainfall_ft3: float = 0.0
    total_infiltration_ft3: float = 0.0


def run_simulation(
    rainfall_timeseries: List[tuple[float, float]],
    config: SubcatchConfig,
    tstep: float = 300.0,
) -> SimulationResult:
    """
    Run a single-event rainfall-runoff simulation.

    Parameters
    ----------
    rainfall_timeseries : list of (time_hrs, intensity_in_hr)
        Rainfall hyetograph as piecewise-constant intensity.
    config : SubcatchConfig
        Site / development configuration.
    tstep : float
        Computational time step in seconds (default 300 = 5 min).

    Returns
    -------
    SimulationResult  with time-series + summary statistics.
    """
    result = SimulationResult()

    # -- set up infiltration (Curve Number method - simplest & most practical)
    soil = SOIL_PARAMS.get(config.soil_group, SOIL_PARAMS["B"])
    cn = soil["cn"]
    # Adjust CN for impervious fraction: weighted CN
    cn_weighted = cn * (1.0 - config.frac_imperv) + 98.0 * config.frac_imperv
    cn_state = curvenum_set_params(cn_weighted)

    # -- compute Manning alpha for impervious and pervious areas
    area_imperv = config.area_sqft * config.frac_imperv
    area_perv = config.area_sqft * (1.0 - config.frac_imperv)
    alpha_imperv = compute_alpha(area_imperv, config.width_ft * config.frac_imperv,
                                 config.slope, config.n_imperv) if area_imperv > 0 else 0
    alpha_perv = compute_alpha(area_perv, config.width_ft * (1.0 - config.frac_imperv),
                               config.slope, config.n_perv) if area_perv > 0 else 0

    # -- initialize depths
    d_imperv = 0.0
    d_perv = 0.0
    cum_runoff = 0.0

    # -- determine simulation duration from rainfall
    if not rainfall_timeseries:
        return result
    end_time_hr = rainfall_timeseries[-1][0] + 2.0  # add 2 hrs after rain ends
    n_steps = int(end_time_hr * 3600.0 / tstep) + 1

    for step in range(n_steps):
        t_sec = step * tstep
        t_hr = t_sec / 3600.0

        # -- interpolate rainfall intensity at current time
        rain_inhr = 0.0
        for k in range(len(rainfall_timeseries) - 1):
            t0, r0 = rainfall_timeseries[k]
            t1, r1 = rainfall_timeseries[k + 1]
            if t0 <= t_hr < t1:
                rain_inhr = r0
                break
        else:
            if t_hr >= rainfall_timeseries[-1][0]:
                rain_inhr = 0.0

        rain_ftps = rain_inhr / 12.0 / 3600.0  # in/hr -> ft/sec

        # -- compute infiltration (pervious area only)
        infil_ftps = curvenum_get_infil(cn_state, tstep, rain_ftps, d_perv)

        # -- update impervious area
        evap = 0.0
        d_imperv += (rain_ftps - evap) * tstep
        runoff_imperv = find_subarea_runoff(d_imperv, config.dstore_imperv,
                                            alpha_imperv, tstep)
        d_imperv -= runoff_imperv * tstep
        d_imperv = max(d_imperv, 0.0)

        # -- update pervious area
        net_perv = rain_ftps - infil_ftps - evap
        d_perv += net_perv * tstep
        runoff_perv = find_subarea_runoff(d_perv, config.dstore_perv,
                                          alpha_perv, tstep)
        d_perv -= runoff_perv * tstep
        d_perv = max(d_perv, 0.0)

        # -- total runoff in CFS
        q_imperv = runoff_imperv * area_imperv   # ft3/sec
        q_perv = runoff_perv * area_perv
        q_total = q_imperv + q_perv

        cum_runoff += q_total * tstep

        result.time_hours.append(round(t_hr, 4))
        result.rainfall_in_hr.append(round(rain_inhr, 4))
        result.runoff_cfs.append(round(q_total, 6))
        result.infiltration_in_hr.append(round(infil_ftps * 12.0 * 3600.0, 4))
        result.cumulative_runoff_ft3.append(round(cum_runoff, 2))

    result.peak_runoff_cfs = max(result.runoff_cfs) if result.runoff_cfs else 0.0
    result.total_runoff_ft3 = cum_runoff
    result.total_rainfall_ft3 = sum(r / 12.0 / 3600.0 * tstep * config.area_sqft
                                     for r in result.rainfall_in_hr)
    result.total_infiltration_ft3 = result.total_rainfall_ft3 - result.total_runoff_ft3
    return result


# ---------------------------------------------------------------------------
# Pre-development baseline (greenfield / natural)
# ---------------------------------------------------------------------------
def baseline_config(soil_group: str, area_sqft: float = 217800.0) -> SubcatchConfig:
    """Natural / pre-development condition (no factory)."""
    return SubcatchConfig(
        area_sqft=area_sqft,
        frac_imperv=0.02,      # nearly all pervious
        slope=0.02,
        width_ft=400.0,
        n_imperv=0.015,
        n_perv=0.40,           # rougher natural surface
        dstore_imperv=0.05 / 12.0,
        dstore_perv=0.30 / 12.0,  # more depression storage
        soil_group=soil_group,
    )
