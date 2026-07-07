from pathlib import Path

import pytest

from cm_process_model import Flowsheet, apply_scenario, load_config


@pytest.fixture
def config() -> dict:
    config_path = Path(__file__).resolve().parents[1] / "config" / "baseline.yaml"
    return load_config(config_path)


def test_load_baseline_config(config: dict) -> None:
    assert config["plant"]["name"] == "baseline"
    assert "production_bioreactor" in config
    assert config["plant"]["scenario"] == "main_90_10"


def test_flowsheet_simulation_runs(config: dict) -> None:
    flowsheet = Flowsheet(config)
    results = flowsheet.simulate()

    assert set(results) == {
        "media",
        "seed",
        "culture",
        "clarified",
        "depleted_medium",
        "washed",
        "wash_waste",
        "extruded",
        "packaged",
    }
    assert results["packaged"].mass_kg > 0


def test_paper_baseline_mass_balance(config: dict) -> None:
    flowsheet = Flowsheet(config)
    results = flowsheet.simulate()

    assert results["media"].mass_kg == pytest.approx(19_907.5903)
    assert results["media"].components["water"] == pytest.approx(19_539.685)
    assert results["media"].components["glucose"] == pytest.approx(90.0)
    assert results["media"].metadata["sterile_filtered_volume_L"] == pytest.approx(
        18_000
    )
    assert results["media"].metadata["reaction_1"]["output_kg"]["medium"] == pytest.approx(
        19_907.5903
    )
    assert results["media"].metadata["sterile_filtration"][
        "impurities_remaining_kg"
    ] == pytest.approx(0.0)
    assert results["culture"].components == {
        "biomass": pytest.approx(1_990.0),
        "depleted_medium": pytest.approx(15_930.0),
        "impurities": pytest.approx(1_000.0),
    }
    assert results["washed"].components["biomass"] == pytest.approx(1_890.5)
    assert results["washed"].metadata["product_biomass_mass_fraction"] == pytest.approx(
        0.90
    )
    assert results["packaged"].mass_kg == pytest.approx(2_112.61, abs=0.01)
    assert results["packaged"].metadata["pack_units"] == pytest.approx(2_091.69)
    assert results["packaged"].components["container"] == pytest.approx(20.9169)
    assert results["packaged"].metadata["filling_calibration_kg"] == pytest.approx(
        -8.8656,
        abs=0.01,
    )


def test_utility_demands_and_timing(config: dict) -> None:
    flowsheet = Flowsheet(config)

    assert flowsheet.utility_demands_kg_per_batch["aws"] == pytest.approx(2_001.07)
    assert flowsheet.utility_demands_kg_per_batch["chilled_water"] == pytest.approx(
        163_111.91
    )
    assert flowsheet.timing_h["process_complete"] == pytest.approx(736.26)


def test_mass_energy_report_contains_chemical_and_energy_calculations(
    config: dict,
) -> None:
    flowsheet = Flowsheet(config)
    report = flowsheet.mass_energy_report()

    assert len(report["process_steps"]) >= 20
    assert report["energy_kwh"]["media_heat_sterilization"] == pytest.approx(
        223.1467, rel=1e-4
    )
    assert report["energy_kwh"]["production_agitation"] == pytest.approx(1162.8)
    assert report["cip_chemistry"]["aws"]["composition"]["hno3"] == pytest.approx(
        10.00535
    )
    assert report["cip_chemistry"]["templates"]["full"]["step_count"] == 5
    assert "standalone_subprocess_models" in report
    assert "lactate and ammonia accumulation were not explicitly modeled" in report[
        "paper_scope"
    ]["paper_exclusions_and_limitations"]
    assert report["calculation_notes"]["reaction"].startswith(
        "The fermentation reaction"
    )


def test_unit_metadata_explains_calculations(config: dict) -> None:
    results = Flowsheet(config).simulate()

    assert "calculations" in results["media"].metadata
    assert "mass_balance" in results["clarified"].metadata
    assert results["culture"].metadata["reaction"]["medium_kg"] == -100.0
    assert results["packaged"].metadata["mass_balance"]["difference_kg"] == pytest.approx(
        0.0
    )


def test_apply_paper_scenarios(config: dict) -> None:
    split_config = apply_scenario(config, "main_50_50")
    split_results = Flowsheet(split_config).simulate()

    assert split_results["media"].metadata["sterile_filtered_volume_L"] == pytest.approx(
        10_000
    )
    assert Flowsheet(split_config).utility_demands_kg_per_batch["steam"] == pytest.approx(
        216.53
    )

    local_config = apply_scenario(config, "local_scale")
    local_results = Flowsheet(local_config).simulate()

    assert "packaged" not in local_results
    assert local_results["cooled_product"].mass_kg > 0
    assert local_results["cooled_product"].metadata["stream_id"] == "S-143"
    assert Flowsheet(local_config).timing_h["process_complete"] == pytest.approx(616.50)

    variation_config = apply_scenario(config, "cell_expansion_variation")
    variation_results = Flowsheet(variation_config).simulate()

    assert variation_results["culture"].metadata["stage"]["vessel"] == "BR-105"
    assert variation_results["culture"].metadata["stream_id"] == "S-121"


def test_daily_product_kg(config: dict) -> None:
    flowsheet = Flowsheet(config)
    assert flowsheet.daily_product_kg > 0
