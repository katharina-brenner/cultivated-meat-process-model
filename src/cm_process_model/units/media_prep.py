"""Media preparation unit operation."""

from __future__ import annotations

from cm_process_model.streams import Stream
from cm_process_model.units import UnitOperation


class MediaPrep(UnitOperation):
    @property
    def batch_volume_L(self) -> float:
        return float(self.config["batch_volume_L"])

    def run(self, feed: Stream) -> Stream:
        outlet = feed.copy(name="prepared_media")
        outlet.volume_L = self.batch_volume_L
        outlet.components = {
            "water": 0.98 * self.batch_volume_L,
            "glucose": 0.01 * self.batch_volume_L,
            "amino_acids": 0.01 * self.batch_volume_L,
        }
        outlet.metadata["batches_per_day"] = self.config["batches_per_day"]
        return outlet
