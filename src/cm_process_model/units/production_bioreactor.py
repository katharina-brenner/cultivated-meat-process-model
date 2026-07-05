"""Production bioreactor unit operation."""

from __future__ import annotations

from math import log2
from typing import Any

from cm_process_model.calculations import (
    component_mass_fractions,
    fermentation_stoichiometry_per_100kg_medium,
    mass_balance,
    sensible_heat_kwh,
)
from cm_process_model.integrations.bioreactor_adapter import BioreactorAdapter
from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class ProductionBioreactor(UnitOperation):
    def __init__(
        self,
        config: dict[str, Any],
        *,
        adapter_config: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(config)
        self.adapter = BioreactorAdapter(adapter_config or {})

    @property
    def working_volume_L(self) -> float:
        return float(self.config["working_volume_L"])

    @property
    def runs_per_day(self) -> float:
        return float(self.config["runs_per_day"])

    def run(self, feed: Stream) -> Stream:
        stage = self.config.get(
            "stage",
            {
                "vessel": "BR-102",
                "type": "stirred_tank",
                "vessel_volume_L": 25_000.0,
                "working_volume_L": self.working_volume_L,
                "start_cells": 2.0e13,
                "end_cells": 1.0e15,
                "specific_power_kw_m3": 0.5,
                "coolant_flow_kg_h": 748.58,
                "power_kw": 9.69,
            },
        )
        kinetics = self.adapter.simulate(
            inoculum=feed,
            working_volume_L=self.working_volume_L,
            culture_duration_h=float(self.config["culture_duration_h"]),
            peak_viable_cell_density=float(self.config["peak_viable_cell_density"]),
        )
        composition = self.config.get(
            "outlet_composition_kg",
            {
                "biomass": 1_990.0,
                "depleted_medium": 15_930.0,
                "impurities": 1_000.0,
            },
        )
        scaled_composition = {
            name: float(amount_kg) * self.working_volume_L / 20_000.0
            for name, amount_kg in composition.items()
        }
        start_cells = float(stage.get("start_cells", feed.metadata["final_cell_count"]))
        end_cells = float(stage.get("end_cells", 1.0e15))
        doublings = log2(end_cells / start_cells)
        duration_h = float(self.config["culture_duration_h"])
        power_kw = float(stage.get("power_kw", 9.69))
        medium_addition_L = max(self.working_volume_L - feed.volume_L, 0.0)
        transfer_out_flow_L_h = float(stage.get("transfer_out_flow_L_h", 4_000.0))
        oxygen_kg = float(self.config.get("oxygen_consumed_kg", 995.0))
        carbon_dioxide_kg = float(self.config.get("carbon_dioxide_generated_kg", 1_990.0))
        gas_loss_kg = carbon_dioxide_kg - oxygen_kg

        outlet = feed.copy(name="culture_broth")
        outlet.volume_L = self.working_volume_L
        outlet.mass_kg = sum(scaled_composition.values())
        outlet.components = scaled_composition
        outlet.metadata.update(
            {
                **kinetics,
                "biomass_kg": scaled_composition["biomass"],
                "stage": {
                    **stage,
                    "doublings": doublings,
                    "culture_duration_h": duration_h,
                    "medium_addition_L": medium_addition_L,
                    "agitation_energy_kwh": power_kw * duration_h,
                    "cooling_removed_kwh": -power_kw * duration_h,
                    "medium_warming_kwh": sensible_heat_kwh(
                        medium_addition_L, 4.0, 37.0
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
                            "material": "seed inoculum",
                            "volume_L": feed.volume_L,
                        },
                        {
                            "name": "Ferment-1",
                            "temperature_C": 37.0,
                            "duration_h": duration_h,
                            "aeration": "Synthetic Air",
                            "venting": True,
                        },
                        {
                            "name": "Transfer Out-1",
                            "flow_L_h": transfer_out_flow_L_h,
                            "duration_h": self.working_volume_L
                            / transfer_out_flow_L_h
                            if transfer_out_flow_L_h
                            else 0.0,
                        },
                    ],
                },
                "reaction": fermentation_stoichiometry_per_100kg_medium(),
                "oxygen_consumed_kg": oxygen_kg,
                "carbon_dioxide_generated_kg": carbon_dioxide_kg,
                "gas_mass_loss_kg": gas_loss_kg,
                "component_mass_fractions": component_mass_fractions(
                    scaled_composition
                ),
                "mass_balance": mass_balance(
                    {
                        "seed_inoculum": feed.mass_kg,
                        "fresh_medium": medium_addition_L,
                        "oxygen": oxygen_kg,
                    },
                    {**scaled_composition, "carbon_dioxide": carbon_dioxide_kg},
                ),
                "synthetic_air_kg_per_batch": float(
                    self.config.get("synthetic_air_kg_per_batch", 11_506.78)
                ),
                "temperature_C": float(self.config.get("temperature_C", 37.0)),
                "pressure_bar": float(self.config.get("pressure_bar", 1.013)),
                "stream_id": self.config.get("outlet_stream_id", "S-145"),
                "calculations": {
                    "cell_density": "cells_per_mL = end_cell_count / (working_volume_L * 1000)",
                    "reaction": "100 Medium + 5 O2 -> 5 Impurities + 10 Biomass + 10 CO2 + 80 Depleted Medium",
                    "agitation_energy": "E_kWh = power_kW * culture_duration_h",
                    "cooling": "agitation power is assumed dissipated as heat and removed by chilled water",
                },
            }
        )
        return outlet
