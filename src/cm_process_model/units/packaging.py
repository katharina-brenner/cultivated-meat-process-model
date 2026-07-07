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
        reported_units = self.config.get("reported_product_entities_per_batch")
        reported_packaged_mass = self.config.get("reported_packaged_mass_kg_per_batch")
        if reported_units is not None:
            units = float(reported_units)
            product_mass_kg = units * product_per_entity_kg
        elif reported_packaged_mass is not None:
            units = float(reported_packaged_mass) / (product_per_entity_kg + container_kg)
            product_mass_kg = units * product_per_entity_kg
        else:
            product_mass_kg = feed.mass_kg * (1.0 - packaging_loss)
            units = product_mass_kg / product_per_entity_kg if product_per_entity_kg else 0.0
        container_mass_kg = units * container_kg
        packaged_mass_kg = product_mass_kg + container_mass_kg
        component_scale = product_mass_kg / feed.mass_kg if feed.mass_kg else 0.0

        outlet = feed.copy(name="packaged_product")
        outlet.mass_kg = packaged_mass_kg
        outlet.components = {
            **{name: amount * component_scale for name, amount in feed.components.items()},
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
                "reported_packaged_mass_kg": reported_packaged_mass,
                "filling_calibration_kg": product_mass_kg - feed.mass_kg,
                "entity_mass_kg": product_per_entity_kg + container_kg,
                "mass_balance": mass_balance(
                    {"filled_bulk_product": product_mass_kg, "containers": container_mass_kg},
                    {"packaged_product": outlet.mass_kg},
                ),
                "calculations": {
                    "entities": "entities = product_mass_kg / product_per_entity_kg",
                    "container_mass": "container_mass_kg = entities * container_kg",
                    "paper_fill_calibration": "reported_product_entities_per_batch is used when present to match DS-102 in Brenner et al. (2026)",
                    "total_packaged_mass": "packaged_mass_kg = product_mass_kg + container_mass_kg",
                },
            }
        )
        return outlet
