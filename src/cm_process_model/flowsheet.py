"""Flowsheet assembly and simulation driver."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from cm_process_model.calculations import cip_solution_composition, mass_balance
from cm_process_model.process_steps import PAPER_PROCESS_STEPS
from cm_process_model.streams import Stream
from cm_process_model.units.downstream import (
    BiomassWash,
    ClarificationCentrifuge,
    Extrusion,
    ProductCooling,
)
from cm_process_model.units.media_prep import MediaPrep
from cm_process_model.units.packaging import Packaging
from cm_process_model.units.production_bioreactor import ProductionBioreactor
from cm_process_model.units.seed_train import SeedTrain
from cm_process_model.utilities import (
    cip_templates,
    paper_exclusions_and_limitations,
    scenario_timing,
    scenario_utility_demands,
    standalone_subprocess_models,
)


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


class Flowsheet:
    """End-to-end cultivated meat process from media prep to packaged product."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.flowsheet_config = config.get("flowsheet", {})
        self.scenario = config.get("plant", {}).get("scenario", "main_90_10")
        self.media_prep = MediaPrep(config["media_prep"])
        self.seed_train = SeedTrain(config["seed_train"])
        self.production_bioreactor = ProductionBioreactor(
            config["production_bioreactor"],
            adapter_config=config.get("bioreactor_adapter"),
        )
        self.clarification = ClarificationCentrifuge(config["clarification"])
        self.washing = BiomassWash(config["washing"])
        self.extrusion = Extrusion(config["extrusion"])
        self.local_cooling = ProductCooling(config.get("local_cooling", {}))
        self.packaging = Packaging(config["packaging"])

    def simulate(self) -> dict[str, Stream]:
        media = self.media_prep.run(
            Stream(name="raw_media_inputs", volume_L=self.media_prep.batch_volume_L)
        )
        seed = self.seed_train.run(media)
        culture = self.production_bioreactor.run(seed)
        clarified = self.clarification.run(culture)
        washed = self.washing.run(clarified)
        product = washed
        results = {
            "media": media,
            "seed": seed,
            "culture": culture,
            "clarified": clarified,
            "depleted_medium": clarified.metadata["waste_stream"],
            "washed": washed,
            "wash_waste": washed.metadata["waste_stream"],
        }

        if self.flowsheet_config.get("include_extrusion", True):
            product = self.extrusion.run(product)
            results["extruded"] = product

        if self.flowsheet_config.get("include_local_cooling", False):
            product = self.local_cooling.run(product)
            results["cooled_product"] = product

        if self.flowsheet_config.get("include_packaging", True):
            product = self.packaging.run(product)
            results["packaged"] = product
        elif "cooled_product" not in results:
            results["cooled_product"] = product

        return results

    @property
    def utility_demands_kg_per_batch(self) -> dict[str, float]:
        return scenario_utility_demands(self.scenario)

    @property
    def timing_h(self) -> dict[str, float]:
        return scenario_timing(self.scenario)

    @property
    def process_steps(self) -> list[dict[str, str]]:
        return [dict(step) for step in PAPER_PROCESS_STEPS]

    def cip_report(self) -> dict[str, Any]:
        utilities = self.utility_demands_kg_per_batch
        return {
            "templates": cip_templates(),
            "aws": {
                "solution_kg": utilities.get("aws", 0.0),
                "composition": cip_solution_composition(
                    utilities.get("aws", 0.0), 0.005, "hno3"
                ),
            },
            "cws": {
                "solution_kg": utilities.get("cws", 0.0),
                "composition": cip_solution_composition(
                    utilities.get("cws", 0.0), 0.010, "naoh"
                ),
            },
            "sws": {
                "solution_kg": utilities.get("sws", 0.0),
                "composition": cip_solution_composition(
                    utilities.get("sws", 0.0), 0.010, "naclo"
                ),
            },
            "rinse_water": {"solution_kg": utilities.get("water", 0.0)},
        }

    def standalone_subprocess_report(self) -> dict[str, Any]:
        return standalone_subprocess_models()

    def paper_scope_report(self) -> dict[str, Any]:
        return {
            "implemented_process_steps": self.process_steps,
            "paper_exclusions_and_limitations": paper_exclusions_and_limitations(),
            "note": "Items listed as paper exclusions were intentionally outside the original paper model, so the Python model records them as scope boundaries rather than simulating them.",
        }

    def mass_energy_report(self) -> dict[str, Any]:
        results = self.simulate()
        product = results.get("packaged") or results["cooled_product"]
        output_streams = {
            "product": product.mass_kg,
            "depleted_medium": results["depleted_medium"].mass_kg,
            "wash_waste": results["wash_waste"].mass_kg,
        }
        input_streams = {
            "prepared_media": results["media"].mass_kg,
            "buffer_solution": self.config["washing"]["buffer_volume_L"],
            "containers": product.components.get("container", 0.0),
            "oxygen": results["culture"].metadata.get("oxygen_consumed_kg", 0.0),
        }
        seed_energy = results["seed"].metadata.get("total_agitation_energy_kwh", 0.0)
        production_energy = results["culture"].metadata["stage"].get(
            "agitation_energy_kwh", 0.0
        )
        return {
            "scenario": self.scenario,
            "process_steps": self.process_steps,
            "stream_mass_balance": mass_balance(input_streams, output_streams),
            "inputs_kg": input_streams,
            "outputs_kg": output_streams,
            "utility_demands_kg_per_batch": self.utility_demands_kg_per_batch,
            "cip_chemistry": self.cip_report(),
            "timing_h": self.timing_h,
            "standalone_subprocess_models": self.standalone_subprocess_report(),
            "paper_scope": self.paper_scope_report(),
            "energy_kwh": {
                "media_heat_sterilization": results["media"].metadata[
                    "heat_sterilization"
                ]["sensible_heat_to_121_kwh"],
                "media_storage_cooling": results["media"].metadata[
                    "storage_cooling"
                ]["sensible_heat_kwh"],
                "seed_agitation": seed_energy,
                "production_agitation": production_energy,
                "downstream_initial_cooling": results["clarified"].metadata[
                    "initial_cooling"
                ]["sensible_heat_kwh"],
                "centrifuge_cooling": results["clarified"].metadata[
                    "centrifuge_cooling"
                ]["sensible_heat_kwh"],
                "centrifuge_dissipated_heat": results["clarified"].metadata[
                    "dissipated_heat_kwh"
                ],
                "wash_thermal_mixing": results["washed"].metadata[
                    "thermal_mixing_kwh"
                ],
                "extrusion_cooling": results.get("extruded", results["washed"]).metadata.get(
                    "cooling_kwh", 0.0
                ),
            },
            "calculation_notes": {
                "mass": "Component and stream masses are tracked in kg; liquid density is approximated as 1 kg/L where the paper used water-like properties.",
                "heat": "Sensible heat uses Q = m * Cp * deltaT with Cp(water) = 4.184 kJ/kg/K.",
                "steam": "Steam demand estimates convert heat duty using 2110 kJ/kg latent heat; paper-reported utility tables remain available as reference demands.",
                "reaction": "The fermentation reaction follows the paper pseudo-stoichiometry: 100 Medium + 5 O2 -> 5 Impurities + 10 Biomass + 10 CO2 + 80 Depleted Medium.",
            },
        }

    @property
    def daily_product_kg(self) -> float:
        result = self.simulate()
        product = result.get("packaged") or result["cooled_product"]
        return product.mass_kg * self.production_bioreactor.runs_per_day
