"""Seed train unit operation."""

from __future__ import annotations

from math import log2

from cm_process_model.calculations import sensible_heat_kwh
from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


DEFAULT_EXPANSION_STAGES = [
    {
        "vessel": "SFR-101",
        "type": "shake_flask",
        "vessel_volume_L": 0.125,
        "working_volume_L": 0.1,
        "start_cells": 2.0e7,
        "end_cells": 1.0e9,
        "specific_power_kw_m3": 3.0,
        "coolant_flow_kg_h": 0.04,
        "power_kw": 0.0003,
    },
    {
        "vessel": "SFR-102",
        "type": "shake_flask",
        "vessel_volume_L": 2.0,
        "working_volume_L": 1.6,
        "start_cells": 1.0e9,
        "end_cells": 1.6e10,
        "specific_power_kw_m3": 3.0,
        "coolant_flow_kg_h": 0.69,
        "power_kw": 0.0047,
    },
    {
        "vessel": "RBS-101",
        "type": "wave_bioreactor",
        "vessel_volume_L": 50.0,
        "working_volume_L": 25.0,
        "start_cells": 1.6e10,
        "end_cells": 2.5e11,
        "specific_power_kw_m3": 3.0,
        "coolant_flow_kg_h": 10.78,
        "power_kw": 0.073,
    },
    {
        "vessel": "RBS-102",
        "type": "wave_bioreactor",
        "vessel_volume_L": 500.0,
        "working_volume_L": 250.0,
        "start_cells": 2.5e11,
        "end_cells": 2.5e12,
        "specific_power_kw_m3": 3.0,
        "coolant_flow_kg_h": 108.13,
        "power_kw": 0.73,
    },
    {
        "vessel": "BR-101",
        "type": "stirred_tank",
        "vessel_volume_L": 2500.0,
        "working_volume_L": 2000.0,
        "start_cells": 2.5e12,
        "end_cells": 2.0e13,
        "specific_power_kw_m3": 0.5,
        "coolant_flow_kg_h": 77.12,
        "power_kw": 0.97,
    },
]


class SeedTrain(UnitOperation):
    def run(self, feed: Stream) -> Stream:
        stage_duration_h = float(self.config.get("stage_duration_h", 120.0))
        stages = self.config.get("expansion_stages", DEFAULT_EXPANSION_STAGES)
        stage_results = []
        previous_volume_L = float(self.config.get("inoculum_volume_L", 0.002))

        for stage in stages:
            working_volume_L = float(stage["working_volume_L"])
            start_cells = float(stage["start_cells"])
            end_cells = float(stage["end_cells"])
            doublings = log2(end_cells / start_cells)
            power_kw = float(stage.get("power_kw", 0.0))
            medium_addition_L = max(working_volume_L - previous_volume_L, 0.0)
            transfer_out_flow_L_min = float(
                stage.get("transfer_out_flow_L_min", working_volume_L)
            )
            stage_results.append(
                {
                    **stage,
                    "doublings": doublings,
                    "culture_duration_h": stage_duration_h,
                    "medium_addition_L": medium_addition_L,
                    "agitation_energy_kwh": power_kw * stage_duration_h,
                    "cooling_removed_kwh": -power_kw * stage_duration_h,
                    "medium_warming_kwh": sensible_heat_kwh(
                        medium_addition_L,
                        4.0,
                        37.0,
                    ),
                    "operations": [
                        {
                            "name": "Purge-1",
                            "pressure_bar": 1.5,
                            "temperature_C": 25.0,
                            "gas": "Synthetic Air",
                            "returns_to_pressure_bar": 1.013,
                        },
                        {
                            "name": "Transfer In-1",
                            "material": "prepared medium",
                            "volume_L": medium_addition_L,
                        },
                        {
                            "name": "Transfer In-2",
                            "material": "previous reactor broth",
                            "volume_L": previous_volume_L,
                        },
                        {
                            "name": "Ferment-1",
                            "temperature_C": 37.0,
                            "duration_h": stage_duration_h,
                            "aeration": "Synthetic Air",
                            "venting": True,
                        },
                        {
                            "name": "Transfer Out-1",
                            "flow_L_min": transfer_out_flow_L_min,
                            "duration_min": working_volume_L
                            / transfer_out_flow_L_min
                            if transfer_out_flow_L_min
                            else 0.0,
                        },
                    ],
                }
            )
            previous_volume_L = working_volume_L

        outlet = feed.copy(name="seed_inoculum")
        outlet.volume_L = previous_volume_L
        outlet.mass_kg = previous_volume_L
        outlet.metadata.update(
            {
                "stages": len(stage_results),
                "stage_results": stage_results,
                "doubling_time_h": self.config.get("doubling_time_h", 20.0),
                "stage_duration_h": stage_duration_h,
                "culture_duration_h": stage_duration_h * len(stage_results),
                "total_agitation_energy_kwh": sum(
                    stage["agitation_energy_kwh"] for stage in stage_results
                ),
                "total_medium_warming_kwh": sum(
                    stage["medium_warming_kwh"] for stage in stage_results
                ),
                "viable_cell_density": stage_results[-1]["end_cells"]
                / (previous_volume_L * 1000.0),
                "final_cell_count": stage_results[-1]["end_cells"],
                "inoculum_volume_L": float(self.config.get("inoculum_volume_L", 0.002)),
                "synthetic_air_composition_mol_fraction": {
                    "co2": 0.05,
                    "air": 0.95,
                    "air_n2": 0.95 * 0.79,
                    "air_o2": 0.95 * 0.21,
                },
                "air_used_for_purging_and_vessel_filling_kg": float(
                    self.config.get("air_used_for_purging_and_vessel_filling_kg", 33.3)
                ),
                "calculations": {
                    "doublings": "N = log2(end_cell_count / starting_cell_count)",
                    "medium_addition": "medium_L = working_volume_L - previous_stage_volume_L",
                    "agitation_energy": "E_kWh = power_kW * culture_duration_h",
                    "medium_warming": "Q_kWh = medium_kg * 4.184 * (37 - 4) / 3600",
                },
            }
        )
        return outlet
