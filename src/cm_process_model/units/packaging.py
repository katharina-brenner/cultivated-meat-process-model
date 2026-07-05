"""Packaging unit operation."""

from __future__ import annotations

from cm_process_model.calculations import mass_balance
from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class Packaging(UnitOperation):
    def run(self, feed: Stream) -> Stream:
        product_per_entity_kg = float(
            self.config.get("product_per_entity_kg", self.config.get("pack_size_kg", 1.0))
        )
        container_kg = float(self.config.get("container_kg", 0.01))
        packaging_loss = float(self.config.get("packaging_loss", 0.0))
        product_mass_kg = feed.mass_kg * (1.0 - packaging_loss)
        units = product_mass_kg / product_per_entity_kg if product_per_entity_kg else 0.0
        container_mass_kg = units * container_kg

        outlet = feed.copy(name="packaged_product")
        outlet.mass_kg = product_mass_kg + container_mass_kg
        outlet.components = {
            **feed.components,
            "container": container_mass_kg,
        }
        outlet.metadata.update(
            {
                "product_per_entity_kg": product_per_entity_kg,
                "container_kg": container_kg,
                "packaging_loss": packaging_loss,
                "pack_units": units,
                "product_mass_kg": product_mass_kg,
                "container_mass_kg": container_mass_kg,
                "entity_mass_kg": product_per_entity_kg + container_kg,
                "mass_balance": mass_balance(
                    {"bulk_product": feed.mass_kg, "containers": container_mass_kg},
                    {"packaged_product": outlet.mass_kg},
                ),
                "calculations": {
                    "entities": "entities = product_mass_kg / product_per_entity_kg",
                    "container_mass": "container_mass_kg = entities * container_kg",
                    "total_packaged_mass": "packaged_mass_kg = product_mass_kg + container_mass_kg",
                },
            }
        )
        return outlet
