"""Paper-aligned downstream processing unit operations."""

from __future__ import annotations

from cm_process_model.calculations import (
    component_mass_fractions,
    heat_agent_kg,
    mass_balance,
    sensible_heat_kwh,
)
from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class ClarificationCentrifuge(UnitOperation):
    """Disk-stack centrifugation with depleted-medium side stream."""

    def run(self, feed: Stream) -> Stream:
        biomass = feed.components.get("biomass", 0.0)
        depleted = feed.components.get("depleted_medium", 0.0)
        impurities = feed.components.get("impurities", 0.0)
        biomass_recovery = float(self.config.get("biomass_recovery", 0.95))
        impurity_to_product = float(self.config.get("impurity_to_product", 0.05))
        product_biomass_fraction = float(
            self.config.get("product_biomass_mass_fraction", 0.3839)
        )

        product_biomass = biomass * biomass_recovery
        product_impurities = impurities * impurity_to_product
        product_mass = product_biomass / product_biomass_fraction
        product_depleted = max(product_mass - product_biomass - product_impurities, 0.0)
        transfer_flow_L_h = float(self.config.get("transfer_flow_L_h", 4_000.0))
        duration_h = feed.volume_L / transfer_flow_L_h if transfer_flow_L_h else 0.0
        initial_cooling_kwh = sensible_heat_kwh(feed.mass_kg, 37.0, 25.0)
        centrifuge_cooling_kwh = sensible_heat_kwh(product_mass, 25.0, 15.0)
        power_kw = float(self.config.get("power_kw", 35.64))
        heat_dissipation_fraction = float(
            self.config.get("heat_dissipation_fraction", 0.25)
        )
        dissipated_heat_kwh = power_kw * duration_h * heat_dissipation_fraction

        waste = Stream(
            name="depleted_medium_waste",
            mass_kg=(
                biomass
                - product_biomass
                + depleted
                - product_depleted
                + impurities
                - product_impurities
            ),
            volume_L=feed.volume_L,
            components={
                "biomass": biomass - product_biomass,
                "depleted_medium": depleted - product_depleted,
                "impurities": impurities - product_impurities,
            },
            metadata={
                "post_filtration_components": {
                    "depleted_medium": depleted - product_depleted
                },
                "filter_area_m2": float(self.config.get("waste_filter_area_m2", 20.0)),
                "filter_cartridges": int(self.config.get("waste_filter_cartridges", 2)),
                "storage_tank_volume_L": float(
                    self.config.get("waste_storage_tank_volume_L", 14_402.33)
                ),
                "temperature_C": 15.0,
                "pressure_bar": 1.013,
                "component_mass_fractions": component_mass_fractions(
                    {
                        "biomass": biomass - product_biomass,
                        "depleted_medium": depleted - product_depleted,
                        "impurities": impurities - product_impurities,
                    }
                ),
            },
        )

        outlet = feed.copy(name="centrifuged_biomass")
        outlet.mass_kg = product_mass
        outlet.volume_L = product_mass / float(
            self.config.get("solids_concentration_kg_L", 0.4)
        )
        outlet.components = {
            "biomass": product_biomass,
            "depleted_medium": product_depleted,
            "impurities": product_impurities,
        }
        outlet.metadata.update(
            {
                "biomass_recovery": biomass_recovery,
                "impurity_to_product": impurity_to_product,
                "product_biomass_mass_fraction": product_biomass / product_mass,
                "product_depleted_medium_mass_fraction": product_depleted
                / product_mass,
                "power_kw": power_kw,
                "transfer_flow_L_h": transfer_flow_L_h,
                "duration_h": duration_h,
                "heat_dissipation_fraction": heat_dissipation_fraction,
                "dissipated_heat_kwh": dissipated_heat_kwh,
                "initial_cooling": {
                    "outlet_temperature_C": 25.0,
                    "sensible_heat_kwh": initial_cooling_kwh,
                    "estimated_chilled_water_kg": heat_agent_kg(
                        initial_cooling_kwh, 5.0, 10.0
                    ),
                    "chilled_water_kg_h": float(
                        self.config.get("initial_chilled_water_kg_h", 8_892.12)
                    ),
                },
                "centrifuge_cooling": {
                    "outlet_temperature_C": 15.0,
                    "sensible_heat_kwh": centrifuge_cooling_kwh,
                    "estimated_chilled_water_kg": heat_agent_kg(
                        centrifuge_cooling_kwh + dissipated_heat_kwh, 5.0, 10.0
                    ),
                    "chilled_water_kg_h": float(
                        self.config.get("centrifuge_chilled_water_kg_h", 8_936.11)
                    ),
                },
                "component_mass_fractions": component_mass_fractions(outlet.components),
                "mass_balance": mass_balance(
                    feed.components,
                    {
                        **outlet.components,
                        **{
                            f"waste_{name}": amount
                            for name, amount in waste.components.items()
                        },
                    },
                ),
                "waste_stream": waste,
                "pump": {"pressure_increase_bar": 1.0},
                "calculations": {
                    "centrifuge_partition": "product_biomass = inlet_biomass * biomass_recovery",
                    "product_mass": "product_mass = product_biomass / product_biomass_mass_fraction",
                    "cooling": "Q_kWh = mass_kg * 4.184 * delta_T / 3600",
                    "centrifuge_heat": "dissipated_heat_kWh = power_kW * duration_h * heat_dissipation_fraction",
                },
            }
        )
        return outlet


class BiomassWash(UnitOperation):
    """Buffer washing that removes depleted medium and impurities."""

    def run(self, feed: Stream) -> Stream:
        biomass = feed.components.get("biomass", 0.0)
        product_biomass_fraction = float(
            self.config.get("product_biomass_mass_fraction", 0.90)
        )
        buffer_kg = biomass * (1.0 - product_biomass_fraction) / product_biomass_fraction
        buffer_volume_L = float(self.config.get("buffer_volume_L", 2_000.0))
        buffer_cooling_kwh = sensible_heat_kwh(buffer_volume_L, 4.0, 10.8)
        waste = Stream(
            name="wash_waste",
            mass_kg=feed.components.get("depleted_medium", 0.0)
            + feed.components.get("impurities", 0.0)
            + buffer_volume_L
            - buffer_kg,
            components={
                "buffer_solution": buffer_volume_L - buffer_kg,
                "depleted_medium": feed.components.get("depleted_medium", 0.0),
                "impurities": feed.components.get("impurities", 0.0),
            },
            metadata={"temperature_C": 10.8, "pressure_bar": 1.013},
        )

        outlet = feed.copy(name="washed_biomass")
        outlet.mass_kg = biomass + buffer_kg
        outlet.volume_L = outlet.mass_kg
        outlet.components = {"biomass": biomass, "buffer_solution": buffer_kg}
        outlet.metadata.update(
            {
                "buffer_volume_L": buffer_volume_L,
                "buffer_temperature_C": float(
                    self.config.get("buffer_temperature_C", 4.0)
                ),
                "product_biomass_mass_fraction": product_biomass_fraction,
                "product_buffer_mass_fraction": 1.0 - product_biomass_fraction,
                "outlet_temperature_C": 10.8,
                "thermal_mixing_kwh": buffer_cooling_kwh,
                "component_mass_fractions": component_mass_fractions(outlet.components),
                "mass_balance": mass_balance(
                    {**feed.components, "fresh_buffer_solution": buffer_volume_L},
                    {
                        **outlet.components,
                        **{
                            f"waste_{name}": amount
                            for name, amount in waste.components.items()
                        },
                    },
                ),
                "waste_stream": waste,
                "calculations": {
                    "buffer_retained": "buffer_kg = biomass_kg * (1 - biomass_fraction) / biomass_fraction",
                    "wash_removal": "100% depleted medium and impurities leave in wash_waste",
                    "thermal_mixing": "reported outlet temperature is 10.8 C; Q estimate uses buffer warming from 4 C",
                },
            }
        )
        return outlet


class Extrusion(UnitOperation):
    """Placeholder extrusion step from the paper, with cooling only."""

    def run(self, feed: Stream) -> Stream:
        outlet = feed.copy(name="extruded_biomass")
        cooling_kwh = sensible_heat_kwh(
            feed.mass_kg,
            float(feed.metadata.get("outlet_temperature_C", 10.8)),
            float(self.config.get("outlet_temperature_C", 4.0)),
        )
        outlet.metadata.update(
            {
                "screw_velocity_rpm": float(self.config.get("screw_velocity_rpm", 200.0)),
                "additives_modeled": False,
                "outlet_temperature_C": float(self.config.get("outlet_temperature_C", 4.0)),
                "cooling_kwh": cooling_kwh,
                "estimated_coolant_kg": heat_agent_kg(cooling_kwh, -4.0, -3.0),
                "coolant_flow_kg_h": float(self.config.get("coolant_flow_kg_h", 0.31)),
                "calculations": {
                    "cooling": "Q_kWh = mass_kg * 4.184 * (4 - inlet_temperature_C) / 3600",
                    "additives": "plant proteins or fat can be added later; the paper did not model additives",
                },
            }
        )
        return outlet


class ProductCooling(UnitOperation):
    """Local-scale final cooling step EC-101."""

    def run(self, feed: Stream) -> Stream:
        outlet_temperature_C = float(self.config.get("outlet_temperature_C", 4.0))
        inlet_temperature_C = float(feed.metadata.get("outlet_temperature_C", 10.8))
        cooling_kwh = sensible_heat_kwh(
            feed.mass_kg,
            inlet_temperature_C,
            outlet_temperature_C,
        )

        outlet = feed.copy(name="cooled_biomass")
        outlet.metadata.update(
            {
                "unit": self.config.get("unit", "P-14/EC-101"),
                "stream_id": self.config.get("outlet_stream_id", "S-143"),
                "inlet_temperature_C": inlet_temperature_C,
                "outlet_temperature_C": outlet_temperature_C,
                "cooling_kwh": cooling_kwh,
                "calculations": {
                    "cooling": "Q_kWh = mass_kg * 4.184 * (4 - inlet_temperature_C) / 3600"
                },
            }
        )
        return outlet
