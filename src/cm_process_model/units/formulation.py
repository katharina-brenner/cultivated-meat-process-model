"""Product formulation unit operation."""

from __future__ import annotations

from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class Formulation(UnitOperation):
    def run(self, feed: Stream) -> Stream:
        biomass_kg = feed.components.get("biomass", feed.mass_kg)
        binder_fraction = float(self.config["binder_fraction"])
        fat_fraction = float(self.config["fat_fraction"])

        binder_kg = biomass_kg * binder_fraction
        fat_kg = biomass_kg * fat_fraction
        product_kg = biomass_kg + binder_kg + fat_kg

        outlet = feed.copy(name="formulated_product")
        outlet.mass_kg = product_kg
        outlet.components = {
            "biomass": biomass_kg,
            "binder": binder_kg,
            "fat": fat_kg,
        }
        return outlet
