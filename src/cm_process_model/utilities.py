"""Utility and scenario reference data from the 2026 process-model paper."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


UTILITY_DEMANDS_KG_PER_BATCH = {
    "main_90_10": {
        "aws": 2_001.07,
        "cws": 3_842.06,
        "sws": 1_000.01,
        "water": 58_778.74,
        "cooling_water": 410.23,
        "chilled_water": 163_111.91,
        "steam": 42.72,
        "synthetic_air": 11_506.78,
    },
    "main_50_50": {
        "aws": 2_063.92,
        "cws": 4_063.10,
        "sws": 1_031.42,
        "water": 60_514.80,
        "cooling_water": 2_078.01,
        "chilled_water": 163_111.70,
        "steam": 216.53,
        "synthetic_air": 11_506.78,
    },
    "local_scale": {
        "aws": 826.94,
        "cws": 1_003.20,
        "sws": 413.25,
        "water": 15_236.23,
        "cooling_water": 41.02,
        "chilled_water": 30_750.46,
        "steam": 4.27,
        "synthetic_air": 1_150.68,
    },
    "cell_expansion_standalone": {
        "aws": 692.33,
        "cws": 688.05,
        "sws": 345.98,
        "water": 10_358.13,
        "chilled_water": 244_520.49,
        "synthetic_air": 11_574.41,
    },
    "cell_expansion_variation": {
        "aws": 863.44,
        "cws": 858.09,
        "sws": 431.49,
        "water": 12_918.09,
        "chilled_water": 230_880.63,
        "synthetic_air": 10_387.53,
    },
}


SCENARIO_TIMING_H = {
    "main_90_10": {
        "media_prep_complete": 9.17,
        "cell_expansion_complete": 734.01,
        "filling_complete": 734.01,
        "process_complete": 736.26,
    },
    "main_50_50": {
        "media_prep_complete": 9.84,
        "cell_expansion_complete": 734.67,
        "filling_complete": 734.67,
        "process_complete": 736.92,
    },
    "local_scale": {
        "cooling_complete": 614.0,
        "process_complete": 616.50,
    },
    "cell_expansion_variation": {
        "cell_expansion_duration": 600.0,
    },
}

CIP_TEMPLATES = {
    "full": {
        "name": "CIP Template_Full",
        "step_count": 5,
        "equipment": ["P-1/V-101", "P-2/V-102", "P-5/V-110", "P-12/BR-101", "P-14/BR-102", "P-20/V-103"],
        "purge_after_cip_equipment": ["P-1/V-101", "P-2/V-102", "P-5/V-110", "P-20/V-103"],
        "purge_after_cip": {
            "gas": "Air",
            "duration_min": 30.0,
            "pressure_bar": 1.5,
            "returns_to_pressure_bar": 1.013,
        },
    },
    "reduced": {
        "name": "CIP Template_Reduced",
        "step_count": 3,
        "equipment": [
            "P-7/PM-102",
            "P-6/PM-101",
            "P-3/ST-101",
            "P-15/PM-103",
            "P-18/HX-101",
            "P-17/DS-101",
            "P-21/WSH-101",
            "P-22/XD-101",
            "P-23/FL-101",
        ],
        "flow_rate_basis": "nearest full hundred L/h to production throughput",
    },
    "omitted": {
        "equipment": ["SFR-101", "SFR-102", "RBS-101", "RBS-102", "DE-101", "DE-102", "DE-103", "MX-101"],
        "reason": "The paper omitted autoclaves for shake flasks/wave reactors and omitted CIP for dead-end filters and the mixer.",
    },
}

PAPER_EXCLUSIONS_AND_LIMITATIONS = [
    "fed-batch operation was discussed but not modeled",
    "cell differentiation, tissue maturation, and structured tissue formation were excluded",
    "microcarriers were excluded",
    "lactate and ammonia accumulation were not explicitly modeled",
    "nutrient residuals inside depleted medium were not modeled explicitly",
    "animal-cell growth heat was neglected relative to agitation heat",
    "extrusion additives such as plant proteins were discussed but not explicitly modeled",
    "autoclaves for shake flasks and wave bioreactors were not modeled",
    "cell banking for high-density cryopreservation was not modeled",
    "media recycling, CO2 reuse, and anaerobic digestion were discussed as future circularity options but not implemented in the paper model",
]

STANDALONE_SUBPROCESS_MODELS = {
    "media_preparation": {
        "source_scenario": "main_90_10",
        "changes": [
            "removed split operations transferring medium to bioreactors",
            "added one Transfer Out operation from V-110 to S-108",
        ],
    },
    "cell_expansion": {
        "source_scenario": "main_90_10",
        "changes": [
            "medium supplied as six single inlet streams S-101 through S-106",
            "medium charged at theoretical vessel-volume requirements at 37 C",
            "charge and transfer operations reduced to 1 s",
            "outlet from final reactor changed to S-107",
        ],
    },
    "downstream_processing": {
        "source_scenario": "main_90_10",
        "changes": [
            "inlet stream recreated as S-101 with Table 4 composition",
            "downstream unit settings retained from the main process",
        ],
    },
}


def scenario_utility_demands(name: str) -> dict[str, float]:
    return dict(UTILITY_DEMANDS_KG_PER_BATCH[name])


def scenario_timing(name: str) -> dict[str, float]:
    return dict(SCENARIO_TIMING_H.get(name, {}))


def cip_templates() -> dict[str, Any]:
    return deepcopy(CIP_TEMPLATES)


def paper_exclusions_and_limitations() -> list[str]:
    return list(PAPER_EXCLUSIONS_AND_LIMITATIONS)


def standalone_subprocess_models() -> dict[str, Any]:
    return deepcopy(STANDALONE_SUBPROCESS_MODELS)


def apply_scenario(config: dict[str, Any], scenario: str) -> dict[str, Any]:
    """Return a config copy adjusted to one of the paper scenarios."""
    adjusted = deepcopy(config)
    adjusted.setdefault("plant", {})["scenario"] = scenario

    if scenario == "main_50_50":
        adjusted["media_prep"]["sterile_filtration_fraction"] = 0.5
    elif scenario == "local_scale":
        adjusted["media_prep"]["batch_volume_L"] = 2_000
        adjusted["media_prep"]["sterile_filtration_fraction"] = 0.9
        adjusted["media_prep"]["local_scale_filter_cartridges"] = 1
        adjusted["production_bioreactor"]["working_volume_L"] = 2_000
        adjusted["production_bioreactor"]["culture_duration_h"] = 120
        adjusted["production_bioreactor"]["outlet_stream_id"] = "S-124"
        adjusted["production_bioreactor"]["outlet_composition_kg"] = {
            "biomass": 199.0,
            "depleted_medium": 1_593.0,
            "impurities": 100.0,
        }
        adjusted["production_bioreactor"]["stage"] = {
            "vessel": "BR-101",
            "type": "stirred_tank",
            "vessel_volume_L": 2_500.0,
            "working_volume_L": 2_000.0,
            "start_cells": 2.5e12,
            "end_cells": 2.0e13,
            "specific_power_kw_m3": 0.5,
            "coolant_flow_kg_h": 77.12,
            "power_kw": 0.97,
            "transfer_out_flow_L_h": 400.0,
        }
        adjusted["flowsheet"]["include_extrusion"] = False
        adjusted["flowsheet"]["include_packaging"] = False
        adjusted["flowsheet"]["include_local_cooling"] = True
        adjusted["local_cooling"] = {
            "unit": "P-14/EC-101",
            "outlet_stream_id": "S-143",
            "outlet_temperature_C": 4.0,
        }
        adjusted["clarification"]["waste_filter_area_m2"] = 10
        adjusted["clarification"]["waste_filter_cartridges"] = 1
        adjusted["clarification"]["waste_storage_tank_volume_L"] = 1_440.23
    elif scenario == "cell_expansion_variation":
        adjusted["seed_train"]["inoculum_volume_L"] = 0.2
        adjusted["seed_train"]["expansion_stages"] = [
            {
                "vessel": "BR-101",
                "type": "stirred_tank",
                "vessel_volume_L": 2.5,
                "working_volume_L": 2.0,
                "start_cells": 2.0e9,
                "end_cells": 2.0e10,
                "medium_inlet_L": 1.8,
            },
            {
                "vessel": "BR-102",
                "type": "stirred_tank",
                "vessel_volume_L": 25.0,
                "working_volume_L": 20.0,
                "start_cells": 2.0e10,
                "end_cells": 2.0e11,
                "medium_inlet_L": 18.0,
            },
            {
                "vessel": "BR-103",
                "type": "stirred_tank",
                "vessel_volume_L": 250.0,
                "working_volume_L": 200.0,
                "start_cells": 2.0e11,
                "end_cells": 2.0e12,
                "medium_inlet_L": 180.0,
            },
            {
                "vessel": "BR-104",
                "type": "stirred_tank",
                "vessel_volume_L": 2_500.0,
                "working_volume_L": 2_000.0,
                "start_cells": 2.0e12,
                "end_cells": 2.0e13,
                "medium_inlet_L": 1_800.0,
            },
        ]
        adjusted["production_bioreactor"]["stage"] = {
            "vessel": "BR-105",
            "type": "stirred_tank",
            "vessel_volume_L": 25_000.0,
            "working_volume_L": 20_000.0,
            "start_cells": 2.0e13,
            "end_cells": 1.0e15,
            "medium_inlet_L": 18_000.0,
            "specific_power_kw_m3": 0.5,
            "coolant_flow_kg_h": 748.58,
            "power_kw": 9.69,
            "transfer_out_flow_L_h": 4_000.0,
        }
        adjusted["production_bioreactor"]["outlet_stream_id"] = "S-121"

    return adjusted
