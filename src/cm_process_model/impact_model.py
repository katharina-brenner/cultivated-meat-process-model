"""Energy, material, and CO₂ impact calculations based on Brenner et al. (2026)."""

from __future__ import annotations

from typing import Any

from cm_process_model.brenner_data import load_brenner_reference
from cm_process_model.plant_topology import build_plant_topology


def _co2_from_synthetic_air(air_kg: float, co2_mol_percent: float) -> float:
    """Estimate CO₂ mass in synthetic air supply (5% mol CO₂, balance air)."""
    mw_co2 = 44.01
    mw_air = 28.84
    co2_mass_fraction = (co2_mol_percent / 100) * mw_co2 / (
        (co2_mol_percent / 100) * mw_co2 + (1 - co2_mol_percent / 100) * mw_air
    )
    return air_kg * co2_mass_fraction


def build_impact_summary(
    brenner: dict[str, Any] | None = None,
    factory: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ref = brenner or load_brenner_reference()
    plant = factory or build_plant_topology()
    meta = ref["reference"]
    utils = ref["utilities_per_batch"]
    energy = ref["energy_per_batch"]
    footprint = ref["footprint_assumptions"]
    product_kg = float(meta["product_mass_kg_per_batch"])
    batch_h = float(meta["batch_duration_h"])

    elec_kwh = float(energy["total_estimated_kWh"])
    grid_factor = float(footprint["grid_emission_factor_kgCO2_per_kWh"])
    steam_kg = float(utils["heating_cooling"]["steam_kg"])
    steam_factor = float(footprint["steam_emission_factor_kgCO2_per_kg"])
    syn_air = float(utils["aeration"]["synthetic_air_kg"])
    co2_mol = float(utils["aeration"]["synthetic_air_CO2_mol_percent"])

    co2_electricity = elec_kwh * grid_factor
    co2_steam = steam_kg * steam_factor
    co2_aeration_supply = _co2_from_synthetic_air(syn_air, co2_mol)
    co2_metabolic_est = product_kg * 0.48  # ~0.48 kg CO₂/kg biomass (screening estimate)

    total_co2 = co2_electricity + co2_steam + co2_aeration_supply + co2_metabolic_est

    raw_materials = ref["raw_materials"]
    media_components_kg = sum(
        float(m["mass_kg_per_batch"]) for m in raw_materials if m["id"] != "inoculum"
    )
    cip = utils["cip"]
    hc = utils["heating_cooling"]

    per_kg = product_kg if product_kg > 0 else 1.0

    by_stage = [
        {
            "stage": "Media Preparation",
            "electricity_kWh": float(energy["media_storage_cooling_kWh"]),
            "steam_kg": steam_kg,
            "water_kg": float(cip["water_kg"]) * 0.12,
            "materials_kg": media_components_kg,
            "co2_kg": float(energy["media_storage_cooling_kWh"]) * grid_factor + steam_kg * steam_factor,
        },
        {
            "stage": "Cell Expansion",
            "electricity_kWh": float(energy["cell_expansion_kWh"]),
            "chilled_water_kg": float(hc["chilled_water_kg"]) * 0.85,
            "synthetic_air_kg": syn_air,
            "materials_kg": media_components_kg * 0.95,
            "co2_kg": float(energy["cell_expansion_kWh"]) * grid_factor + co2_aeration_supply + co2_metabolic_est * 0.9,
        },
        {
            "stage": "Downstream Processing",
            "electricity_kWh": float(energy["dsp_estimated_kWh"]),
            "chilled_water_kg": float(hc["chilled_water_kg"]) * 0.10,
            "water_kg": float(cip["water_kg"]) * 0.05,
            "materials_kg": float(cip["aws_kg"]) + float(cip["cws_kg"]) + float(cip["sws_kg"]),
            "co2_kg": float(energy["dsp_estimated_kWh"]) * grid_factor,
        },
        {
            "stage": "CIP / SIP Utilities",
            "electricity_kWh": elec_kwh * 0.08,
            "water_kg": float(cip["water_kg"]),
            "aws_kg": float(cip["aws_kg"]),
            "cws_kg": float(cip["cws_kg"]),
            "sws_kg": float(cip["sws_kg"]),
            "co2_kg": elec_kwh * 0.08 * grid_factor,
        },
    ]

    return {
        "reference": meta,
        "citation": ref["reference"]["citation"],
        "doi": ref["reference"]["doi"],
        "scenario": ref["reference"]["scenario"],
        "batch": {
            "duration_h": batch_h,
            "duration_days": round(batch_h / 24, 1),
            "product_kg": product_kg,
            "product_entities": meta["product_entities_per_batch"],
        },
        "energy": {
            "electricity_kWh_per_batch": elec_kwh,
            "electricity_kWh_per_kg_product": round(elec_kwh / per_kg, 2),
            "media_prep_kWh": float(energy["media_storage_cooling_kWh"]),
            "cell_expansion_kWh": float(energy["cell_expansion_kWh"]),
            "dsp_kWh": float(energy["dsp_estimated_kWh"]),
            "breakdown": energy,
        },
        "materials": {
            "raw_materials": raw_materials,
            "total_media_kg_per_batch": round(media_components_kg, 2),
            "cip_per_batch": cip,
            "utilities_per_batch": {
                **hc,
                **utils["aeration"],
            },
            "water_consumptive_kg_per_batch": round(
                float(raw_materials[0]["mass_kg_per_batch"]) + float(cip["water_kg"]), 1
            ),
        },
        "co2": {
            "total_kg_per_batch": round(total_co2, 1),
            "total_kg_per_kg_product": round(total_co2 / per_kg, 3),
            "electricity_kg": round(co2_electricity, 1),
            "steam_kg": round(co2_steam, 1),
            "aeration_supply_kg": round(co2_aeration_supply, 1),
            "metabolic_est_kg": round(co2_metabolic_est, 1),
            "assumptions": footprint,
        },
        "by_stage": by_stage,
        "waste_streams": ref["outlet_streams"],
        "daily_product_kg": plant.get("daily_product_kg", 0),
        "batches_per_year": round(365 * 24 / batch_h, 1) if batch_h else 0,
    }


def build_export_bundle() -> dict[str, Any]:
    factory = build_plant_topology()
    impact = build_impact_summary(factory=factory)
    brenner = load_brenner_reference()
    return {
        "export_version": "1.0",
        "generated_from": "cm-process-model",
        "reference": brenner["reference"],
        "factory": factory,
        "impact": impact,
    }
