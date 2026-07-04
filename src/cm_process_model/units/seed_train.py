"""Seed train unit operation."""

from __future__ import annotations

from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class SeedTrain(UnitOperation):
    def run(self, feed: Stream) -> Stream:
        stages = int(self.config["stages"])
        inoculum_fraction = float(self.config["inoculum_fraction"])
        volume_L = feed.volume_L * (1.0 - inoculum_fraction) ** stages

        outlet = feed.copy(name="seed_inoculum")
        outlet.volume_L = volume_L
        outlet.metadata.update(
            {
                "stages": stages,
                "doubling_time_h": self.config["doubling_time_h"],
                "viable_cell_density": 1.0e6,
            }
        )
        return outlet
