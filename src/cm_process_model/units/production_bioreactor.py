"""Production bioreactor unit operation."""

from __future__ import annotations

from typing import Any

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
        kinetics = self.adapter.simulate(
            inoculum=feed,
            working_volume_L=self.working_volume_L,
            culture_duration_h=float(self.config["culture_duration_h"]),
            peak_viable_cell_density=float(self.config["peak_viable_cell_density"]),
        )

        outlet = feed.copy(name="culture_broth")
        outlet.volume_L = self.working_volume_L
        outlet.components = {
            "broth": self.working_volume_L,
            "biomass": kinetics["biomass_kg"],
        }
        outlet.metadata.update(kinetics)
        return outlet
