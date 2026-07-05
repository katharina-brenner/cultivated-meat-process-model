"""Reusable mass, chemistry, and thermal calculations."""

from __future__ import annotations


CP_WATER_KJ_KG_K = 4.184
STEAM_LATENT_HEAT_KJ_KG = 2110.0


def component_mass_fractions(components_kg: dict[str, float]) -> dict[str, float]:
    total = sum(components_kg.values())
    if total == 0.0:
        return {name: 0.0 for name in components_kg}
    return {name: amount / total for name, amount in components_kg.items()}


def mass_balance(
    inputs_kg: dict[str, float],
    outputs_kg: dict[str, float],
) -> dict[str, float | bool]:
    input_total = sum(inputs_kg.values())
    output_total = sum(outputs_kg.values())
    difference = input_total - output_total
    return {
        "input_kg": input_total,
        "output_kg": output_total,
        "difference_kg": difference,
        "relative_difference": difference / input_total if input_total else 0.0,
    }


def sensible_heat_kwh(
    mass_kg: float,
    inlet_temperature_C: float,
    outlet_temperature_C: float,
    *,
    cp_kj_kg_K: float = CP_WATER_KJ_KG_K,
) -> float:
    return mass_kg * cp_kj_kg_K * (outlet_temperature_C - inlet_temperature_C) / 3600.0


def heat_agent_kg(
    energy_kwh: float,
    inlet_temperature_C: float,
    outlet_temperature_C: float,
    *,
    cp_kj_kg_K: float = CP_WATER_KJ_KG_K,
) -> float:
    delta_t = abs(outlet_temperature_C - inlet_temperature_C)
    if delta_t == 0.0:
        return 0.0
    return abs(energy_kwh) * 3600.0 / (cp_kj_kg_K * delta_t)


def steam_kg(
    energy_kwh: float,
    *,
    latent_heat_kj_kg: float = STEAM_LATENT_HEAT_KJ_KG,
) -> float:
    if latent_heat_kj_kg == 0.0:
        return 0.0
    return abs(energy_kwh) * 3600.0 / latent_heat_kj_kg


def cip_solution_composition(
    solution_kg: float,
    active_mass_fraction: float,
    active_component: str,
) -> dict[str, float]:
    active_kg = solution_kg * active_mass_fraction
    return {
        active_component: active_kg,
        "water": solution_kg - active_kg,
    }


def fermentation_stoichiometry_per_100kg_medium() -> dict[str, float]:
    return {
        "medium_kg": -100.0,
        "oxygen_kg": -5.0,
        "impurities_kg": 5.0,
        "biomass_kg": 10.0,
        "carbon_dioxide_kg": 10.0,
        "depleted_medium_kg": 80.0,
    }
