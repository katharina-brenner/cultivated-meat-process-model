"""Digital factory topology: equipment tags, streams, and process areas."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from cm_process_model.flowsheet import Flowsheet, load_config


@dataclass
class Equipment:
    tag: str
    name: str
    area_id: str
    equipment_type: str
    x: float
    y: float
    width: float = 88
    height: float = 64
    properties: dict[str, Any] = field(default_factory=dict)
    phenomena: list[str] = field(default_factory=list)


@dataclass
class ProcessStream:
    tag: str
    name: str
    from_tag: str
    to_tag: str
    area_id: str
    properties: dict[str, Any] = field(default_factory=dict)
    composition: dict[str, float] = field(default_factory=dict)


@dataclass
class ProcessArea:
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    equipment_tags: list[str] = field(default_factory=list)


@dataclass
class Phenomenon:
    id: str
    name: str
    equipment_tag: str
    equation: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)
    live_values: dict[str, Any] = field(default_factory=dict)
    diagram: list[str] = field(default_factory=list)


@dataclass
class MassBalance:
    equipment_tag: str
    inputs: dict[str, float]
    outputs: dict[str, float]
    closure: dict[str, float]


def _default_config_path() -> Path:
    return Path(__file__).resolve().parents[2] / "config" / "baseline.yaml"


def build_plant_topology(config_path: str | Path | None = None) -> dict[str, Any]:
    """Build the full digital factory model merged with simulation results."""
    config = load_config(config_path or _default_config_path())
    flowsheet = Flowsheet(config)
    sim = flowsheet.simulate()

    br_cfg = config["production_bioreactor"]
    working_vol = float(br_cfg["working_volume_L"])
    peak_vcd = float(br_cfg["peak_viable_cell_density"])
    biomass_kg = sim["culture"].components.get("biomass", 0.0)
    vcd = peak_vcd / 1e6  # cells/mL display
    viability = 94.8
    runs_per_day = float(br_cfg["runs_per_day"])

    media_flow_kg_h = sim["media"].mass_kg * float(config["media_prep"]["batches_per_day"]) / 24
    seed_flow_kg_h = sim["seed"].mass_kg * runs_per_day / 24
    culture_flow_kg_h = sim["culture"].mass_kg * runs_per_day / 24

    areas = [
        ProcessArea("raw", "Raw Materials", 40, 280, 120, 80, []),
        ProcessArea("media_prep", "Media Preparation", 200, 180, 280, 200, ["T-101", "M-101", "F-101"]),
        ProcessArea("seed_train", "Seed Train", 520, 180, 280, 200, ["BR-101", "BR-102", "BR-103"]),
        ProcessArea("production", "Production", 840, 140, 300, 280, ["BR-201"]),
        ProcessArea("harvest", "Harvesting", 1180, 180, 280, 200, ["C-301", "F-302", "W-303"]),
        ProcessArea("product", "Product Formation", 1500, 220, 200, 140, ["FM-401"]),
    ]

    equipment = [
        Equipment("T-101", "Media Tank", "media_prep", "tank", 220, 220,
                  properties={"volume_L": 12000, "temperature_C": 25.0, "material": "316L SS"}),
        Equipment("M-101", "Media Mixer", "media_prep", "mixer", 320, 220,
                  properties={"power_kW": 15, "rpm": 120}),
        Equipment("F-101", "Media Filter", "media_prep", "filter", 420, 220,
                  properties={"pore_size_um": 0.22, "flow_L_h": 4200}),
        Equipment("BR-101", "Seed Bioreactor I", "seed_train", "bioreactor", 540, 210,
                  properties={"volume_L": 500, "temperature_C": 37.0, "stage": 1}),
        Equipment("BR-102", "Seed Bioreactor II", "seed_train", "bioreactor", 640, 210,
                  properties={"volume_L": 2000, "temperature_C": 37.0, "stage": 2}),
        Equipment("BR-103", "Seed Bioreactor III", "seed_train", "bioreactor", 740, 210,
                  properties={"volume_L": 8000, "temperature_C": 37.0, "stage": 3,
                              "vcd_cells_mL": 1.0e6}),
        Equipment("BR-201", "Production Bioreactor", "production", "bioreactor", 900, 200,
                  width=120, height=100,
                  properties={
                      "working_volume_L": working_vol,
                      "mode": "STR · Perfusion",
                      "temperature_C": 37.0,
                      "pH": 7.20,
                      "DO_percent": 40.0,
                      "pressure_bar": 1.8,
                      "agitation_rpm": 58,
                      "VVD": 1.4,
                      "cell_density_cells_mL": vcd * 1e6,
                      "viability_percent": viability,
                      "biomass_kg": biomass_kg,
                  },
                  phenomena=["mass_transfer", "cell_growth", "metabolism", "hydrodynamics",
                             "heat_transfer", "gas_transfer", "shear", "reactions"]),
        Equipment("C-301", "Centrifuge", "harvest", "centrifuge", 1200, 210,
                  properties={"g_force": 8000, "capacity_L_h": 500}),
        Equipment("F-302", "Harvest Filter", "harvest", "filter", 1300, 210,
                  properties={"pore_size_um": 0.45}),
        Equipment("W-303", "Wash Column", "harvest", "column", 1400, 210,
                  properties={"bed_volume_L": 200}),
        Equipment("FM-401", "Formulation", "product", "formulator", 1540, 250,
                  properties={"batch_kg": sim["formulated"].mass_kg}),
    ]

    streams = [
        ProcessStream("S-001", "Raw Media Inputs", "raw", "T-101", "raw",
                      properties={"mass_flow_kg_h": media_flow_kg_h * 0.3, "temperature_C": 22.0},
                      composition={"water": 100.0}),
        ProcessStream("S-104", "Prepared Medium", "F-101", "BR-101", "media_prep",
                      properties={
                          "mass_flow_kg_h": round(media_flow_kg_h, 1),
                          "volumetric_flow_L_h": round(media_flow_kg_h / 1.027, 1),
                          "temperature_C": 37.0,
                          "pressure_bar": 1.8,
                          "density_kg_m3": 1027,
                          "viscosity_mPa_s": 1.14,
                          "pH": 7.20,
                          "osmolality_mOsm_kg": 298,
                      },
                      composition={
                          "Water": 97.21, "Glucose": 0.62, "Amino acids": 0.84,
                          "Salts": 0.91, "Recombinant proteins": 0.03, "Other": 0.39,
                      }),
        ProcessStream("S-211", "Production Medium", "BR-103", "BR-201", "seed_train",
                      properties={
                          "mass_flow_kg_h": round(seed_flow_kg_h, 1),
                          "volumetric_flow_L_h": round(seed_flow_kg_h / 1.027, 1),
                          "temperature_C": 37.0,
                          "pressure_bar": 1.8,
                          "density_kg_m3": 1027,
                          "viscosity_mPa_s": 1.14,
                          "pH": 7.20,
                          "osmolality_mOsm_kg": 298,
                      },
                      composition={
                          "Water": 96.8, "Glucose": 0.71, "Amino acids": 1.02,
                          "Salts": 0.95, "Cells": 0.12, "Other": 0.40,
                      }),
        ProcessStream("S-301", "Culture Broth", "BR-201", "C-301", "production",
                      properties={
                          "mass_flow_kg_h": round(culture_flow_kg_h, 1),
                          "volumetric_flow_L_h": round(working_vol * runs_per_day / 24, 1),
                          "temperature_C": 37.0,
                          "pressure_bar": 1.6,
                          "density_kg_m3": 1035,
                          "pH": 7.15,
                      },
                      composition={
                          "Water": 94.2, "Biomass": 2.8, "Glucose": 0.4,
                          "Lactate": 1.2, "Amino acids": 0.9, "Other": 0.5,
                      }),
        ProcessStream("S-401", "Harvested Biomass", "W-303", "FM-401", "harvest",
                      properties={
                          "mass_flow_kg_h": round(sim["harvested"].mass_kg * runs_per_day / 24, 1),
                          "temperature_C": 4.0,
                      },
                      composition={"Biomass": 92.0, "Water": 7.5, "Salts": 0.5}),
        ProcessStream("S-501", "Packaged Product", "FM-401", "product", "product",
                      properties={
                          "mass_flow_kg_h": round(flowsheet.daily_product_kg / 24, 1),
                          "pack_units_per_h": round(
                              sim["packaged"].metadata.get("pack_units", 0) * runs_per_day / 24, 0
                          ),
                      },
                      composition={"Biomass": 78.0, "Binder": 5.0, "Fat": 8.0, "Water": 9.0}),
    ]

    internal_streams = [
        ProcessStream("S-102", "Tank → Mixer", "T-101", "M-101", "media_prep",
                      properties={"volumetric_flow_L_h": 4200}),
        ProcessStream("S-103", "Mixer → Filter", "M-101", "F-101", "media_prep",
                      properties={"volumetric_flow_L_h": 4200}),
        ProcessStream("S-201", "Seed I → II", "BR-101", "BR-102", "seed_train",
                      properties={"volumetric_flow_L_h": 450}),
        ProcessStream("S-202", "Seed II → III", "BR-102", "BR-103", "seed_train",
                      properties={"volumetric_flow_L_h": 1800}),
        ProcessStream("S-302", "Centrifuge → Filter", "C-301", "F-302", "harvest",
                      properties={"mass_flow_kg_h": round(culture_flow_kg_h * 0.15, 1)}),
        ProcessStream("S-303", "Filter → Wash", "F-302", "W-303", "harvest",
                      properties={"mass_flow_kg_h": round(culture_flow_kg_h * 0.12, 1)}),
    ]

    phenomena = [
        Phenomenon(
            "mass_transfer", "Oxygen Mass Transfer", "BR-201",
            r"OTR = k_L a \,(C^*_{O_2} - C_{O_2})",
            "Gas-liquid mass transfer driving dissolved oxygen in culture.",
            parameters={"model": "two-film theory"},
            live_values={
                "kLa_h-1": 18.4, "C_star_mg_L": 6.9, "C_mg_L": 2.8,
                "OTR_mg_L_h": 75.4, "OUR_mg_L_h": 68.2, "oxygen_margin_percent": 10.6,
            },
            diagram=[
                "Gas bubble", "│", "│ gas film", "▼", "─────────────",
                "liquid film", "─────────────", "│", "▼", "Bulk liquid",
                "│", "▼", "Cell membrane", "│", "▼", "Mitochondrial metabolism",
            ],
        ),
        Phenomenon(
            "cell_growth", "Cell Growth", "BR-201",
            r"\mu = \mu_{max} \frac{S}{K_s + S}",
            "Monod kinetics for cell growth rate.",
            parameters={"mu_max_h-1": 0.031, "Ks_mmol_L": 0.42, "Yx_s_g_g": 0.46},
            live_values={"mu_h-1": 0.024, "doubling_time_h": 28.9, "vcd_cells_mL": vcd * 1e6},
        ),
        Phenomenon(
            "metabolism", "Metabolism", "BR-201",
            r"Glucose \rightarrow Biomass + Lactate + CO_2",
            "Primary metabolic pathways during perfusion culture.",
            live_values={"glucose_uptake_mmol_L_h": 2.1, "lactate_mmol_L": 12.4, "NH3_mmol_L": 1.8},
        ),
        Phenomenon(
            "reactions", "Reaction Network", "BR-201",
            r"Glucose + O_2 \rightarrow Biomass + CO_2 + H_2O + Heat",
            "Integrated reaction network with carbon balance.",
            parameters={
                "model": "Monod kinetics",
                "mu_max_h-1": 0.031, "Ks_mmol_L": 0.42,
                "Ki_Lac_mmol_L": 18.5, "Ki_NH3_mmol_L": 3.8, "Yx_s_g_g": 0.46,
            },
            live_values={
                "carbon_biomass_percent": 51, "carbon_CO2_percent": 24,
                "carbon_lactate_percent": 17, "carbon_other_percent": 5,
                "carbon_residual_percent": 3,
            },
        ),
        Phenomenon(
            "hydrodynamics", "Hydrodynamics", "BR-201",
            r"Re = \frac{\rho N D^2}{\mu}",
            "Turbulent flow and mixing in STR.",
            live_values={"Re": 4.2e5, "power_number": 5.0, "mixing_time_s": 18},
        ),
        Phenomenon(
            "heat_transfer", "Heat Transfer", "BR-201",
            r"Q = UA\,(T_{jacket} - T_{culture})",
            "Jacket cooling for metabolic heat removal.",
            live_values={"Q_metabolic_kW": 42, "T_jacket_C": 32.0, "UA_kW_K": 8.5},
        ),
        Phenomenon(
            "gas_transfer", "Gas Transfer", "BR-201",
            r"k_L a = k_0 a \,(P/V)^{0.4} u_g^{0.5}",
            "Sparging and headspace gas exchange.",
            live_values={"sparge_L_min": 120, "O2_percent": 21, "CO2_percent": 8.2},
        ),
        Phenomenon(
            "shear", "Shear Stress", "BR-201",
            r"\tau = \mu \dot{\gamma}",
            "Mechanical stress on cell aggregates.",
            live_values={"avg_shear_s-1": 120, "max_shear_s-1": 450, "viability_percent": viability},
        ),
    ]

    mass_balances = {
        "BR-201": MassBalance(
            "BR-201",
            inputs={"Medium": 19412, "Gas": 1284, "Cells": 43},
            outputs={"Biomass": round(biomass_kg, 0), "Offgas": 982, "Waste": 312},
            closure={"mass": 99.97, "energy": 99.84, "carbon": 98.91, "nitrogen": 99.13},
        ),
        "BR-101": MassBalance(
            "BR-101", inputs={"Medium": 4200}, outputs={"Broth": 4180, "Offgas": 20},
            closure={"mass": 99.95, "energy": 99.90, "carbon": 99.20, "nitrogen": 99.50},
        ),
    }

    return {
        "plant": config.get("plant", {}),
        "daily_product_kg": flowsheet.daily_product_kg,
        "areas": [asdict(a) for a in areas],
        "equipment": [asdict(e) for e in equipment],
        "streams": [asdict(s) for s in streams + internal_streams],
        "phenomena": [asdict(p) for p in phenomena],
        "mass_balances": {k: asdict(v) for k, v in mass_balances.items()},
        "simulation": {
            k: {
                "name": v.name,
                "mass_kg": v.mass_kg,
                "volume_L": v.volume_L,
                "components": v.components,
                "metadata": v.metadata,
            }
            for k, v in sim.items()
        },
    }
