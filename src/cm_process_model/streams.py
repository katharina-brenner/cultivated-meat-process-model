"""Material and information streams between unit operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Stream:
    """A process stream carrying mass, volume, and optional metadata."""

    name: str
    mass_kg: float = 0.0
    volume_L: float = 0.0
    components: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def copy(self, *, name: str | None = None) -> Stream:
        return Stream(
            name=name or self.name,
            mass_kg=self.mass_kg,
            volume_L=self.volume_L,
            components=dict(self.components),
            metadata=dict(self.metadata),
        )

    def scale(self, factor: float, *, name: str | None = None) -> Stream:
        scaled = self.copy(name=name)
        scaled.mass_kg *= factor
        scaled.volume_L *= factor
        scaled.components = {k: v * factor for k, v in scaled.components.items()}
        return scaled
