"""Flowsheet assembly and simulation driver."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from cm_process_model.streams import Stream
from cm_process_model.units.formulation import Formulation
from cm_process_model.units.harvest import Harvest
from cm_process_model.units.media_prep import MediaPrep
from cm_process_model.units.packaging import Packaging
from cm_process_model.units.production_bioreactor import ProductionBioreactor
from cm_process_model.units.seed_train import SeedTrain


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


class Flowsheet:
    """End-to-end cultivated meat process from media prep to packaged product."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.media_prep = MediaPrep(config["media_prep"])
        self.seed_train = SeedTrain(config["seed_train"])
        self.production_bioreactor = ProductionBioreactor(
            config["production_bioreactor"],
            adapter_config=config.get("bioreactor_adapter"),
        )
        self.harvest = Harvest(config["harvest"])
        self.formulation = Formulation(config["formulation"])
        self.packaging = Packaging(config["packaging"])

    def simulate(self) -> dict[str, Stream]:
        media = self.media_prep.run(
            Stream(name="raw_media_inputs", volume_L=self.media_prep.batch_volume_L)
        )
        seed = self.seed_train.run(media)
        culture = self.production_bioreactor.run(seed)
        harvested = self.harvest.run(culture)
        formulated = self.formulation.run(harvested)
        packaged = self.packaging.run(formulated)

        return {
            "media": media,
            "seed": seed,
            "culture": culture,
            "harvested": harvested,
            "formulated": formulated,
            "packaged": packaged,
        }

    @property
    def daily_product_kg(self) -> float:
        result = self.simulate()
        return result["packaged"].mass_kg * self.production_bioreactor.runs_per_day
