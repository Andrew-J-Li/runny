"""
Candidate factory sites for Austin, TX metro area.
"""

CANDIDATE_SITES = [
    {
        "id": "east-austin",
        "name": "East Austin Industrial District",
        "lat": 30.265,
        "lng": -97.707,
        "soil_group": "C",
        "slope": 0.025,
        "flood_zone": False,
        "near_water": False,
        "description": "Established industrial zone east of I-35. Mix of warehouses and light industry. Urban heat island area with moderate drainage infrastructure.",
    },
    {
        "id": "south-congress",
        "name": "South Congress Tech Corridor",
        "lat": 30.230,
        "lng": -97.770,
        "soil_group": "B",
        "slope": 0.018,
        "flood_zone": False,
        "near_water": False,
        "description": "Growing tech and mixed-use corridor south of Lady Bird Lake. Good soil drainage with existing stormwater management.",
    },
    {
        "id": "del-valle",
        "name": "Del Valle (SE Austin)",
        "lat": 30.178,
        "lng": -97.665,
        "soil_group": "D",
        "slope": 0.010,
        "flood_zone": True,
        "near_water": True,
        "description": "Low-lying area southeast of Austin near Colorado River floodplain. Clay-heavy soils with poor drainage. Proximity to ABIA airport.",
    },
    {
        "id": "round-rock",
        "name": "Round Rock Business Park",
        "lat": 30.508,
        "lng": -97.678,
        "soil_group": "B",
        "slope": 0.022,
        "flood_zone": False,
        "near_water": False,
        "description": "Suburban business district in Round Rock, north of Austin. Good soil conditions and existing infrastructure. Near major highways.",
    },
    {
        "id": "pflugerville",
        "name": "Pflugerville Greenfield",
        "lat": 30.445,
        "lng": -97.620,
        "soil_group": "A",
        "slope": 0.030,
        "flood_zone": False,
        "near_water": False,
        "description": "Undeveloped agricultural land in Pflugerville. Sandy loam soils with excellent drainage. Minimal existing impervious cover.",
    },
    {
        "id": "manor",
        "name": "Manor Rural Site",
        "lat": 30.345,
        "lng": -97.558,
        "soil_group": "C",
        "slope": 0.015,
        "flood_zone": False,
        "near_water": True,
        "description": "Rural area east of Austin in Manor. Moderate clay soils. Near Gilleland Creek with some environmental sensitivity.",
    },
]


def get_all_sites():
    return CANDIDATE_SITES


def get_site(site_id: str):
    for s in CANDIDATE_SITES:
        if s["id"] == site_id:
            return s
    return None
