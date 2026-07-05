"""Media preparation unit operation."""

from __future__ import annotations

from cm_process_model.calculations import (
    cip_solution_composition,
    heat_agent_kg,
    sensible_heat_kwh,
    steam_kg,
)
from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


DEFAULT_MEDIUM_COMPOSITION_G_L = {
    "amino_acids": 1.27,
    "vitamins": 2.94e-2,
    "salts": 9.59,
    "proteins": 3.00,
    "trace_elements": 5.01e-3,
    "glucose": 4.50,
    "growth_factors_igf1": 5.00e-6,
}

STERILIZATION_REFERENCE = {
    0.9: {
        "sterile_filter_area_m2": 20.0,
        "sterile_filter_cartridges": 2,
        "heat_sterilization_heating_duty_kw": 5.0,
        "heat_sterilization_cooling_duty_kw": 0.48,
        "cooling_water_kg_h": 82.0,
        "steam_kg_h": 8.54,
        "storage_cooling_duty_kw": 80.79,
        "storage_cooling_energy_kwh": 113.36,
        "storage_cooling_duration_min": 220.26,
        "mixed_temperature_C": 26.0,
        "media_prep_duration_h": 9.17,
    },
    0.5: {
        "sterile_filter_area_m2": 10.0,
        "sterile_filter_cartridges": 1,
        "heat_sterilization_heating_duty_kw": 25.4,
        "heat_sterilization_cooling_duty_kw": 2.41,
        "cooling_water_kg_h": 415.6,
        "steam_kg_h": 43.31,
        "storage_cooling_duty_kw": 30.86,
        "storage_cooling_energy_kwh": 133.79,
        "storage_cooling_duration_min": 260.12,
        "mixed_temperature_C": 30.0,
        "media_prep_duration_h": 9.84,
    },
}


class MediaPrep(UnitOperation):
    @property
    def batch_volume_L(self) -> float:
        return float(self.config["batch_volume_L"])

    def run(self, feed: Stream) -> Stream:
        composition = self.config.get(
            "composition_g_L", DEFAULT_MEDIUM_COMPOSITION_G_L
        )
        solids_kg = {
            name: float(concentration_g_L) * self.batch_volume_L / 1000.0
            for name, concentration_g_L in composition.items()
        }
        total_solids_kg = sum(solids_kg.values())
        medium_density_kg_L = float(
            self.config.get("medium_density_kg_L", 19_907.5903 / 20_000.0)
        )
        medium_mass_kg = self.batch_volume_L * medium_density_kg_L
        water_kg = max(medium_mass_kg - total_solids_kg, 0.0)
        sterile_fraction = float(self.config.get("sterile_filtration_fraction", 0.9))
        heat_fraction = 1.0 - sterile_fraction
        reference = STERILIZATION_REFERENCE.get(round(sterile_fraction, 1), {})
        scale = self.batch_volume_L / 20_000.0
        heat_sterilized_kg = self.batch_volume_L * heat_fraction
        sterile_filtered_kg = self.batch_volume_L * sterile_fraction
        heat_to_121_kwh = sensible_heat_kwh(heat_sterilized_kg, 25.0, 121.0)
        cool_to_35_kwh = sensible_heat_kwh(heat_sterilized_kg, 121.0, 35.0)
        mixed_temperature_C = reference.get("mixed_temperature_C", 26.0)
        storage_cooling_kwh = sensible_heat_kwh(
            medium_mass_kg,
            float(mixed_temperature_C),
            float(self.config.get("storage_temperature_C", 4.0)),
        )
        cip_kg = self.config.get(
            "cip_kg",
            {"aws": 2_001.07, "cws": 3_842.06, "sws": 1_000.01, "water": 58_778.74},
        )
        heat_sensitive_impurities_kg = 0.001 * sum(
            solids_kg[name]
            for name in ("growth_factors_igf1", "proteins", "vitamins")
        )
        first_filter_removed_kg = heat_sensitive_impurities_kg * 0.80
        second_filter_removed_kg = heat_sensitive_impurities_kg - first_filter_removed_kg

        outlet = feed.copy(name="prepared_media")
        outlet.volume_L = self.batch_volume_L
        outlet.mass_kg = medium_mass_kg
        outlet.components = {"water": water_kg, **solids_kg}
        outlet.metadata.update(
            {
                "batches_per_day": self.config.get("batches_per_day", 1),
                "total_solids_kg": total_solids_kg,
                "medium_density_kg_L": medium_density_kg_L,
                "reaction_1_medium_kg": medium_mass_kg,
                "reaction_1": {
                    "inputs_kg": {"water": water_kg, **solids_kg},
                    "output_kg": {"medium": medium_mass_kg},
                    "description": "Artificial medium components react to one water-like Medium component for storage.",
                },
                "sterile_filtration_fraction": sterile_fraction,
                "heat_sterilization_fraction": heat_fraction,
                "sterile_filtered_volume_L": self.batch_volume_L * sterile_fraction,
                "heat_sterilized_volume_L": self.batch_volume_L * heat_fraction,
                "sterile_filtered_components": [
                    "growth_factors_igf1",
                    "proteins",
                    "vitamins",
                ],
                "heat_sterilized_components": [
                    "amino_acids",
                    "glucose",
                    "salts",
                    "trace_elements",
                ],
                "storage_temperature_C": float(
                    self.config.get("storage_temperature_C", 4.0)
                ),
                "mixing": {
                    "duration_min": float(self.config.get("mixing_duration_min", 60.0)),
                    "specific_power_kw_m3": float(
                        self.config.get("mixing_specific_power_kw_m3", 0.1)
                    ),
                    "sterile_tank_volume_L": sterile_filtered_kg / 0.9,
                    "heat_tank_volume_L": heat_sterilized_kg / 0.9,
                },
                "transfer_out": {
                    "duration_h": float(self.config.get("transfer_duration_h", 5.0)),
                    "sterile_fraction_flow_L_h": sterile_filtered_kg
                    / float(self.config.get("transfer_duration_h", 5.0)),
                    "heat_fraction_flow_L_h": heat_sterilized_kg
                    / float(self.config.get("transfer_duration_h", 5.0)),
                    "temperature_C": 25.0,
                },
                "pump_steps": [
                    "P-7/PM-102 transfers sterile-filtration fraction",
                    "P-6/PM-101 transfers heat-sterilization fraction",
                ],
                "pump_pressure": {
                    "pressure_increase_bar": 1.0,
                    "outlet_pressure_bar": 2.013,
                },
                "sterile_filtration": {
                    "volume_L": sterile_filtered_kg,
                    "filter_area_m2": reference.get("sterile_filter_area_m2", 0.0)
                    * scale,
                    "filter_cartridges": reference.get(
                        "sterile_filter_cartridges", 0
                    ),
                    "flux_L_m2_h": float(self.config.get("filtration_flux_L_m2_h", 250.0)),
                    "impurities_added_kg": heat_sensitive_impurities_kg,
                    "p4_de102_removal_fraction": 0.80,
                    "p4_de102_removed_kg": first_filter_removed_kg,
                    "p16_de101_removal_fraction": 1.0,
                    "p16_de101_removed_kg": second_filter_removed_kg,
                    "impurities_remaining_kg": 0.0,
                },
                "heat_sterilization": {
                    "volume_L": heat_sterilized_kg,
                    "sterilization_temperature_C": float(
                        self.config.get("sterilization_temperature_C", 121.0)
                    ),
                    "steam_temperature_C": 152.0,
                    "cooling_water_inlet_C": 25.0,
                    "cooling_water_outlet_C": 30.0,
                    "sterilized_medium_exit_temperature_C": 35.0,
                    "sensible_heat_to_121_kwh": heat_to_121_kwh,
                    "cooling_to_35_kwh": cool_to_35_kwh,
                    "estimated_steam_kg": steam_kg(heat_to_121_kwh),
                    "estimated_cooling_water_kg": heat_agent_kg(
                        cool_to_35_kwh, 25.0, 30.0
                    ),
                },
                "storage_cooling": {
                    "from_temperature_C": mixed_temperature_C,
                    "to_temperature_C": float(
                        self.config.get("storage_temperature_C", 4.0)
                    ),
                    "cooling_rate_C_min": 0.1,
                    "paper_duration_min": reference.get("storage_cooling_duration_min"),
                    "sensible_heat_kwh": storage_cooling_kwh,
                    "paper_reported_energy_kwh": reference.get(
                        "storage_cooling_energy_kwh"
                    ),
                    "estimated_chilled_water_kg": heat_agent_kg(
                        storage_cooling_kwh, 5.0, 10.0
                    ),
                    "pressure_bar": 1.013,
                },
                "cip_chemistry": {
                    "aws": cip_solution_composition(cip_kg["aws"], 0.005, "hno3"),
                    "cws": cip_solution_composition(cip_kg["cws"], 0.010, "naoh"),
                    "sws": cip_solution_composition(cip_kg["sws"], 0.010, "naclo"),
                    "rinse_water_kg": cip_kg["water"],
                },
                "calculations": {
                    "medium_component_mass": "component_kg = concentration_g_L * batch_volume_L / 1000",
                    "sensible_heat": "Q_kWh = mass_kg * 4.184 kJ/kg/K * delta_T_K / 3600",
                    "steam": "steam_kg = abs(Q_kWh) * 3600 / 2110 kJ/kg",
                    "coolant": "coolant_kg = abs(Q_kWh) * 3600 / (4.184 * coolant_delta_T)",
                },
            }
        )
        outlet.metadata.update(
            {
                name: value * scale if isinstance(value, float) else value
                for name, value in reference.items()
            }
        )
        return outlet
