from pathlib import Path

import pytest

from cm_process_model import Flowsheet, load_config


@pytest.fixture
def config() -> dict:
    config_path = Path(__file__).resolve().parents[1] / "config" / "baseline.yaml"
    return load_config(config_path)


def test_load_baseline_config(config: dict) -> None:
    assert config["plant"]["name"] == "baseline"
    assert "production_bioreactor" in config


def test_flowsheet_simulation_runs(config: dict) -> None:
    flowsheet = Flowsheet(config)
    results = flowsheet.simulate()

    assert set(results) == {
        "media",
        "seed",
        "culture",
        "harvested",
        "formulated",
        "packaged",
    }
    assert results["packaged"].mass_kg > 0


def test_daily_product_kg(config: dict) -> None:
    flowsheet = Flowsheet(config)
    assert flowsheet.daily_product_kg > 0
