"""Load Brenner et al. (2026) reference parameters."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


def _brenner_config_path() -> Path:
    return Path(__file__).resolve().parents[2] / "config" / "brenner_2026.yaml"


def load_brenner_reference(path: str | Path | None = None) -> dict[str, Any]:
    with Path(path or _brenner_config_path()).open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)
