"""Adapter for external bioreactor kinetics models."""

from __future__ import annotations

from typing import Any

from cm_process_model.streams import Stream


class BioreactorAdapter:
    """Pluggable interface for bioreactor simulation backends."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}

    def simulate(
        self,
        *,
        inoculum: Stream,
        working_volume_L: float,
        culture_duration_h: float,
        peak_viable_cell_density: float,
    ) -> dict[str, float]:
        """Return culture outcomes using a simple placeholder growth model."""
        cell_mass_per_cell_kg = float(self.config.get("cell_mass_per_cell_kg", 2.0e-12))
        inoculum_density = float(
            inoculum.metadata.get("viable_cell_density", 1.0e6)
        )

        growth_factor = peak_viable_cell_density / max(inoculum_density, 1.0)
        biomass_kg = (
            working_volume_L
            * 1000.0
            * peak_viable_cell_density
            * cell_mass_per_cell_kg
        )

        return {
            "biomass_kg": biomass_kg,
            "growth_factor": growth_factor,
            "culture_duration_h": culture_duration_h,
            "peak_viable_cell_density": peak_viable_cell_density,
        }
