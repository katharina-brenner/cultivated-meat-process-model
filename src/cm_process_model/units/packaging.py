"""Packaging unit operation."""

from __future__ import annotations

from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class Packaging(UnitOperation):
    def run(self, feed: Stream) -> Stream:
        pack_size_kg = float(self.config["pack_size_kg"])
        packaging_loss = float(self.config["packaging_loss"])
        net_mass_kg = feed.mass_kg * (1.0 - packaging_loss)
        units = net_mass_kg / pack_size_kg if pack_size_kg else 0.0

        outlet = feed.copy(name="packaged_product")
        outlet.mass_kg = net_mass_kg
        outlet.metadata.update(
            {
                "pack_size_kg": pack_size_kg,
                "packaging_loss": packaging_loss,
                "pack_units": units,
            }
        )
        return outlet
