"""Harvest and downstream primary separation."""

from __future__ import annotations

from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class Harvest(UnitOperation):
    def run(self, feed: Stream) -> Stream:
        efficiency = float(self.config["harvest_efficiency"])
        wet_mass_fraction = float(self.config["wet_mass_fraction"])
        biomass_kg = feed.components.get("biomass", 0.0) * efficiency

        outlet = feed.copy(name="harvested_biomass")
        outlet.mass_kg = biomass_kg
        outlet.volume_L = biomass_kg / wet_mass_fraction if wet_mass_fraction else 0.0
        outlet.components = {"biomass": biomass_kg}
        outlet.metadata["harvest_efficiency"] = efficiency
        return outlet
