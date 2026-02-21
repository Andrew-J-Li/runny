"""
Factory type presets — each factory type has different impervious cover,
lot size, pollutant characteristics, water usage, and cost profiles.
"""

from __future__ import annotations

FACTORY_TYPES = {
    "chemical_plant": {
        "id": "chemical_plant",
        "name": "Chemical Plant",
        "icon": "flask",
        "description": "Heavy industrial chemical processing facility with large tank farms, loading areas, and containment zones.",
        "default_frac_imperv": 0.85,
        "default_area_sqft": 435600,   # ~10 acres
        "lot_size_acres": 10,
        "pollutant_risk": "high",
        "water_usage_gpd": 250000,
        "construction_cost_per_sqft": 180,
        "annual_operating_cost": 2500000,
        "characteristics": {
            "Impervious Cover": "Very High (85%)",
            "Hazardous Materials": "Yes — containment required",
            "Water Consumption": "250,000 gal/day",
            "Typical Lot Size": "10+ acres",
        },
    },
    "food_processing": {
        "id": "food_processing",
        "name": "Food Processing Plant",
        "icon": "utensils",
        "description": "Food manufacturing and processing facility with refrigeration, wash bays, and loading docks.",
        "default_frac_imperv": 0.70,
        "default_area_sqft": 217800,   # ~5 acres
        "lot_size_acres": 5,
        "pollutant_risk": "moderate",
        "water_usage_gpd": 150000,
        "construction_cost_per_sqft": 145,
        "annual_operating_cost": 1800000,
        "characteristics": {
            "Impervious Cover": "High (70%)",
            "Organic Waste": "Significant — treatment needed",
            "Water Consumption": "150,000 gal/day",
            "Typical Lot Size": "5 acres",
        },
    },
    "warehouse": {
        "id": "warehouse",
        "name": "Warehouse / Distribution",
        "icon": "warehouse",
        "description": "Large footprint distribution center with extensive parking and truck staging areas.",
        "default_frac_imperv": 0.90,
        "default_area_sqft": 653400,   # ~15 acres
        "lot_size_acres": 15,
        "pollutant_risk": "low",
        "water_usage_gpd": 15000,
        "construction_cost_per_sqft": 85,
        "annual_operating_cost": 800000,
        "characteristics": {
            "Impervious Cover": "Very High (90%)",
            "Hazardous Materials": "Minimal",
            "Water Consumption": "15,000 gal/day",
            "Typical Lot Size": "15+ acres",
        },
    },
    "data_center": {
        "id": "data_center",
        "name": "Data Center",
        "icon": "server",
        "description": "High-security data center with cooling infrastructure, backup generators, and landscaped buffer zones.",
        "default_frac_imperv": 0.60,
        "default_area_sqft": 174240,   # ~4 acres
        "lot_size_acres": 4,
        "pollutant_risk": "low",
        "water_usage_gpd": 300000,     # cooling water
        "construction_cost_per_sqft": 250,
        "annual_operating_cost": 5000000,
        "characteristics": {
            "Impervious Cover": "Moderate (60%)",
            "Cooling Water": "300,000 gal/day",
            "Power Demand": "Very High",
            "Typical Lot Size": "4 acres",
        },
    },
    "light_manufacturing": {
        "id": "light_manufacturing",
        "name": "Light Manufacturing",
        "icon": "wrench",
        "description": "General-purpose light industrial facility for assembly, fabrication, or small-scale production.",
        "default_frac_imperv": 0.75,
        "default_area_sqft": 130680,   # ~3 acres
        "lot_size_acres": 3,
        "pollutant_risk": "moderate",
        "water_usage_gpd": 50000,
        "construction_cost_per_sqft": 120,
        "annual_operating_cost": 1200000,
        "characteristics": {
            "Impervious Cover": "High (75%)",
            "Hazardous Materials": "Possible",
            "Water Consumption": "50,000 gal/day",
            "Typical Lot Size": "3 acres",
        },
    },
}


def get_factory_types():
    """Return all factory types as a list."""
    return list(FACTORY_TYPES.values())


def get_factory_type(factory_id: str):
    """Return a specific factory type by id."""
    return FACTORY_TYPES.get(factory_id)
