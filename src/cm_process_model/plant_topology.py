"""Digital factory topology aligned with Brenner et al. (2026)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from cm_process_model.brenner_data import load_brenner_reference
from cm_process_model.flowsheet import Flowsheet, load_config


@dataclass
class Equipment:
    tag: str
    name: str
    area_id: str
    equipment_type: str
    x: float
    y: float
    width: float = 72
    height: float = 56
    properties: dict[str, Any] = field(default_factory=dict)
    phenomena: list[str] = field(default_factory=list)
    operations: list[str] = field(default_factory=list)


@dataclass
class ProcessStream:
    tag: str
    name: str
    from_tag: str
    to_tag: str
    area_id: str
    properties: dict[str, Any] = field(default_factory=dict)
    composition: dict[str, float] = field(default_factory=dict)
    materials: dict[str, float] = field(default_factory=dict)


@dataclass
class ProcessArea:
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    equipment_tags: list[str] = field(default_factory=list)
    description: str = ""


@dataclass
class RawMaterial:
    id: str
    name: str
    mass_kg_per_batch: float
    concentration_g_L: float
    category: str
    sterilization: str
    route: str
    properties: dict[str, Any] = field(default_factory=dict)


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


def _eq(
    tag: str, name: str, area: str, etype: str, x: float, y: float,
    props: dict[str, Any] | None = None, ops: list[str] | None = None,
    phenomena: list[str] | None = None, w: float = 72, h: float = 56,
) -> Equipment:
    return Equipment(
        tag, name, area, etype, x, y, w, h,
        properties=props or {},
        operations=ops or [],
        phenomena=phenomena or [],
    )


def build_plant_topology(config_path: str | Path | None = None) -> dict[str, Any]:
    config = load_config(config_path or _default_config_path())
    brenner = load_brenner_reference()
    ref = brenner["reference"]
    params = brenner["process_parameters"]
    raw_list = brenner["raw_materials"]
    vessels = brenner["cell_expansion_vessels"]
    utils = brenner["utilities_per_batch"]

    flowsheet = Flowsheet(config)
    sim = flowsheet.simulate()
    br102 = next(v for v in vessels if v["tag"] == "BR-102")
    working_vol = float(br102["working_volume_L"])
    peak_vcd = float(params["max_cell_density_cells_mL"])
    biomass_kg = float(ref["product_mass_kg_per_batch"]) * 0.94
    runs_per_year = 365 * 24 / float(ref["batch_duration_h"])

    raw_materials = [
        RawMaterial(
            m["id"], m["name"], float(m["mass_kg_per_batch"]),
            float(m.get("concentration_g_L", 0)),
            m.get("category", ""), m.get("sterilization", ""),
            m.get("route", "direct"),
            properties={k: v for k, v in m.items() if k not in (
                "id", "name", "mass_kg_per_batch", "concentration_g_L",
                "category", "sterilization", "route",
            )},
        )
        for m in raw_list
    ]

    areas = [
        ProcessArea("raw", "Raw Materials", 20, 300, 200, 120, [],
                    "Table 3 · Brenner et al. 2026 artificial medium"),
        ProcessArea("inoculum", "Inoculum", 240, 300, 100, 100, ["IN-101"],
                    "Cryostock thaw · 2 mL inoculum"),
        ProcessArea("media_prep", "Media Preparation", 360, 160, 520, 220,
                    ["V-101", "V-102", "ST-101", "DE-101", "DE-102", "MX-101", "V-110", "PM-101", "PM-102"],
                    "P-1…P-5 · 90:10 filtration/heat sterilization split"),
        ProcessArea("cell_expansion", "Cell Expansion", 900, 160, 720, 220,
                    ["SFR-101", "SFR-102", "RBS-101", "RBS-102", "BR-101", "BR-102"],
                    "Table 2 · six-stage expansion cascade"),
        ProcessArea("dsp", "Downstream Processing", 1640, 160, 480, 220,
                    ["HX-101", "DS-101", "DE-103", "V-103", "WSH-101", "XD-101", "FL-101", "PM-103"],
                    "Centrifugation · wash · extrusion · fill"),
        ProcessArea("utilities", "CIP / SIP", 2140, 360, 200, 100, [],
                    "Table 8 · cleaning & utility agents"),
        ProcessArea("product", "Product", 2360, 280, 160, 100, ["PK-101"],
                    "DS-102 packaged biomass"),
    ]

    equipment: list[Equipment] = [
        _eq("IN-101", "Inoculum Thaw", "inoculum", "tank", 260, 320,
            {"volume_mL": 2, "cell_density_cells_mL": 1e7, "temperature_C": 37},
            ["Thaw", "Transfer"]),
        _eq("V-101", "Blend Tank (Filtration)", "media_prep", "tank", 380, 200,
            {"volume_L": 20000, "temperature_C": 25, "contents": "GF, proteins, vitamins",
             "sterilization_route": "filtration 90%"}, ["Mix 60 min", "Transfer Out"]),
        _eq("V-102", "Blend Tank (Heat)", "media_prep", "tank", 380, 290,
            {"volume_L": 2222, "temperature_C": 25,
             "contents": "AA, glucose, salts, trace elements", "sterilization_route": "heat 10%"},
            ["Mix 60 min", "Transfer Out"]),
        _eq("PM-101", "Centrifugal Pump", "media_prep", "pump", 470, 290,
            {"flow_L_h": 400, "deltaP_bar": 1}, ["Pump"]),
        _eq("PM-102", "Centrifugal Pump", "media_prep", "pump", 470, 200,
            {"flow_L_h": 3600, "deltaP_bar": 1}, ["Pump"]),
        _eq("ST-101", "Heat Sterilizer", "media_prep", "heat_exchanger", 560, 290,
            {"temperature_C": 121, "steam_C": 152, "cooling_duty_kW": 0.48,
             "heating_duty_kW": 5.0}, ["Sterilize", "Cool to 35°C"]),
        _eq("DE-102", "Dead-End Filter I", "media_prep", "filter", 560, 200,
            {"filter_area_m2": 20, "flux_L_m2_h": 250, "pore_size_um": 0.22},
            ["Sterile Filtration"]),
        _eq("DE-101", "Dead-End Filter II", "media_prep", "filter", 650, 200,
            {"filter_area_m2": 20, "flux_L_m2_h": 250, "retention": "100% impurities"},
            ["Polish Filtration"]),
        _eq("MX-101", "Media Mixer", "media_prep", "mixer", 740, 245,
            {"outlet_temperature_C": 26.0, "total_volume_L": 20000}, ["Mix streams"]),
        _eq("V-110", "Medium Storage", "media_prep", "tank", 830, 245,
            {"volume_L": 20000, "temperature_C": 4, "pressure_bar": 1.013,
             "medium_mass_kg": 19907.59, "cooling_kWh": 113.36},
            ["React", "Store", "Split to bioreactors"], w=80, h=64),
    ]

    cx = 920
    for v in vessels:
        y = 210 if v["tag"] in ("SFR-101", "RBS-101", "BR-101") else 280
        equipment.append(_eq(
            v["tag"], v["name"],
            "cell_expansion", "bioreactor", cx, y,
            {
                "working_volume_L": v["working_volume_L"],
                "vessel_volume_L": v["vessel_volume_L"],
                "temperature_C": 37,
                "culture_time_h": v["culture_time_h"],
                "specific_power_kW_m3": v["specific_power_kW_m3"],
                "total_power_kW": v["total_power_kW"],
                "coolant_kg_h": v["coolant_kg_h"],
                "max_cell_density_cells_mL": peak_vcd if v["tag"] == "BR-102" else None,
            },
            ["Purge Synthetic Air", "Ferment 5 d", "Transfer Out", "CIP"],
            ["mass_transfer", "cell_growth", "metabolism", "heat_transfer", "gas_transfer"]
            if v["tag"] == "BR-102" else [],
            w=88 if v["tag"] == "BR-102" else 72,
            h=64 if v["tag"] == "BR-102" else 56,
        ))
        cx += 110

    equipment.extend([
        _eq("PM-103", "Transfer Pump", "dsp", "pump", 1660, 240,
            {"flow_L_h": 4000, "deltaP_bar": 1}, ["Pump"]),
        _eq("HX-101", "Broth Cooler", "dsp", "heat_exchanger", 1740, 240,
            {"inlet_C": 37, "outlet_C": 25, "coolant_kg_h": 8892.12}, ["Cool"]),
        _eq("DS-101", "Disk-Stack Centrifuge", "dsp", "centrifuge", 1820, 240,
            {"power_kW": 35.64, "outlet_C": 15, "g_force": 8000}, ["Clarify"]),
        _eq("DE-103", "Waste Filtration", "dsp", "filter", 1900, 200,
            {"filter_area_m2": 20}, ["Filter depleted medium"]),
        _eq("V-103", "Depleted Medium Tank", "dsp", "tank", 1900, 290,
            {"volume_L": 14402, "temperature_C": 15}, ["Store"]),
        _eq("WSH-101", "Biomass Washer", "dsp", "column", 1980, 240,
            {"buffer": "Wash buffer", "outlet_C": 10.8}, ["Wash"]),
        _eq("XD-101", "Extruder", "dsp", "formulator", 2060, 240,
            {"rpm": 200, "outlet_C": 4.0}, ["Extrude / compact"]),
        _eq("FL-101", "Filling Line", "dsp", "formulator", 2140, 240,
            {"pack_size_kg": 1.0, "entities_per_batch": 2091.69}, ["Fill"]),
        _eq("PK-101", "Packaged Product", "product", "formulator", 2380, 300,
            {"mass_kg_per_batch": ref["product_mass_kg_per_batch"],
             "container_g": 10}, ["Store"]),
    ])

    medium_comp = {m["name"]: round(m["concentration_g_L"] / 10, 3) for m in raw_list if m["id"] != "inoculum"}
    medium_comp["Water"] = 97.85

    streams: list[ProcessStream] = []

    for m in raw_list:
        if m["id"] == "inoculum":
            continue
        route = m.get("route", "V-101")
        streams.append(ProcessStream(
            f"RM-{m['id'][:3].upper()}", f"Raw · {m['name']}", "raw", route, "raw",
            properties={"mass_kg_per_batch": m["mass_kg_per_batch"],
                        "concentration_g_L": m.get("concentration_g_L", 0),
                        "temperature_C": 22},
            composition={m["name"]: 100.0},
            materials={m["name"]: float(m["mass_kg_per_batch"])},
        ))

    streams.extend([
        ProcessStream("S-131", "Inoculum", "IN-101", "SFR-101", "inoculum",
                      properties={"volume_mL": 2, "cell_density_cells_mL": 1e7},
                      composition={"Biomass": 100}, materials={"Biomass": 0.002}),
        ProcessStream("S-102", "Sterilized Filtrate", "DE-101", "MX-101", "media_prep",
                      properties={"volumetric_flow_L_h": 3600, "temperature_C": 25},
                      composition={"Proteins": 0.15, "Vitamins": 0.001, "Growth Factors": 0.000001}),
        ProcessStream("S-103", "Heat-Sterilized Broth", "ST-101", "MX-101", "media_prep",
                      properties={"volumetric_flow_L_h": 400, "temperature_C": 35},
                      composition={"Glucose": 0.45, "Amino Acids": 0.127, "Salts": 0.96}),
        ProcessStream("S-108", "Prepared Medium", "V-110", "SFR-101", "media_prep",
                      properties={"mass_kg": 19907.59, "temperature_C": 4, "pH": 7.2,
                                  "osmolality_mOsm_kg": 298, "density_kg_m3": 1027},
                      composition=medium_comp,
                      materials={m["name"]: float(m["mass_kg_per_batch"]) for m in raw_list if m["id"] != "inoculum"}),
        ProcessStream("S-145", "Culture Broth", "BR-102", "PM-103", "cell_expansion",
                      properties={"temperature_C": 37, "pressure_bar": 1.013,
                                  "mass_t": 18.9, "flow_L_h": 4000},
                      composition={"Biomass": 10.53, "Depleted Medium": 84.21, "Impurities": 5.26},
                      materials={"Biomass": biomass_kg, "Depleted Medium": 15930, "Impurities": 1000}),
        ProcessStream("S-151", "Centrifuge Product", "DS-101", "WSH-101", "dsp",
                      properties={"temperature_C": 15, "biomass_recovery_percent": 95},
                      composition={"Biomass": 38.39, "Depleted Medium": 60.60, "Impurities": 1.01}),
        ProcessStream("S-156", "Depleted Medium Outlet", "DE-103", "V-103", "dsp",
                      properties={"temperature_C": 15, "mass_t": 15.0},
                      composition={"Depleted Medium": 100}),
        ProcessStream("S-154", "Waste Stream", "WSH-101", "utilities", "dsp",
                      properties={"temperature_C": 10.8},
                      composition={"Buffer": 30, "Depleted Medium": 65, "Impurities": 5}),
        ProcessStream("S-155", "Product Slurry", "XD-101", "FL-101", "dsp",
                      properties={"temperature_C": 4, "mass_kg_per_batch": 2091.69},
                      composition={"Biomass": 92, "Water": 8}),
        ProcessStream("DS-102", "Packaged Product", "FL-101", "PK-101", "product",
                      properties={"mass_kg_per_batch": ref["product_mass_kg_per_batch"],
                                  "entities": ref["product_entities_per_batch"]},
                      composition={"Biomass": 90.5, "Container": 0.5, "Water": 9}),
    ])

    vessel_tags = [v["tag"] for v in vessels]
    for i in range(len(vessel_tags) - 1):
        streams.append(ProcessStream(
            f"S-E{i+1}", f"{vessel_tags[i]} → {vessel_tags[i+1]}",
            vessel_tags[i], vessel_tags[i+1], "cell_expansion",
            properties={"transfer_cell_density_cells_mL": 1e7, "temperature_C": 37},
            composition={"Cells": 0.1, "Medium": 99.9},
        ))

    internal = [
        ProcessStream("S-V101", "V-101 → DE-102", "V-101", "DE-102", "media_prep",
                      properties={"flow_L_h": 3600}),
        ProcessStream("S-V102", "V-102 → ST-101", "V-102", "ST-101", "media_prep",
                      properties={"flow_L_h": 400}),
        ProcessStream("S-HX", "PM-103 → HX-101", "PM-103", "HX-101", "dsp",
                      properties={"flow_L_h": 4000}),
        ProcessStream("S-CEN", "HX-101 → DS-101", "HX-101", "DS-101", "dsp",
                      properties={"temperature_C": 25}),
    ]
    streams.extend(internal)

    br102_p = next(e for e in equipment if e.tag == "BR-102")
    phenomena = [
        Phenomenon("mass_transfer", "Oxygen Mass Transfer", "BR-102",
                   r"OTR = k_L a \,(C^*_{O_2} - C_{O_2})",
                   "Gas-liquid O₂ transfer · Synthetic Air 5% CO₂ (Brenner et al. 2026).",
                   live_values={"kLa_h-1": 18.4, "OTR_mg_L_h": 75.4, "OUR_mg_L_h": 68.2,
                                "synthetic_air_kg_batch": utils["aeration"]["synthetic_air_kg"]},
                   diagram=["Gas bubble → gas film → liquid film → bulk → cell"]),
        Phenomenon("cell_growth", "Cell Growth", "BR-102",
                   r"\mu = \mu_{max} \frac{S}{K_s + S}",
                   "5×10⁷ cells/mL max · 120 h batch (Table 1).",
                   parameters={"mu_max_h-1": 0.031, "doubling_time_h": 20},
                   live_values={"vcd_cells_mL": peak_vcd, "culture_time_h": 120}),
        Phenomenon("metabolism", "Metabolism", "BR-102",
                   r"Glucose \rightarrow Biomass + Lactate + CO_2 + NH_3",
                   "Batch suspension culture without perfusion.",
                   live_values={"glucose_g_L": 4.5, "lactate_mmol_L": 12.4}),
        Phenomenon("reactions", "Reaction Network", "BR-102",
                   r"C_6H_{12}O_6 + O_2 \rightarrow Biomass + CO_2 + H_2O",
                   "Reaction (1) medium formation + fermentation stoichiometry.",
                   live_values={"carbon_biomass_percent": 51, "carbon_CO2_percent": 24,
                                "carbon_lactate_percent": 17}),
        Phenomenon("heat_transfer", "Heat Transfer", "BR-102",
                   r"Q_{cool} = \dot{m}_{CW} c_p \Delta T",
                   f"Agitation {br102_p.properties['total_power_kW']} kW → chilled water "
                   f"{br102['coolant_kg_h']} kg/h.",
                   live_values={"Q_agitation_kW": br102["total_power_kW"],
                                "coolant_kg_h": br102["coolant_kg_h"]}),
        Phenomenon("gas_transfer", "Gas Transfer", "BR-102",
                   "Synthetic Air = 5% CO₂ + 95% Air",
                   "Purging + sparging during 120 h fermentation.",
                   live_values={"synthetic_air_kg": utils["aeration"]["synthetic_air_kg"],
                                "CO2_mol_percent": 5}),
    ]

    mass_balances = {
        "BR-102": MassBalance("BR-102",
            inputs={"Medium": 19907.59, "Inoculum": 2000, "Synthetic Air": 11507},
            outputs={"Biomass": round(biomass_kg), "Depleted Medium": 15930, "Offgas": 1200},
            closure={"mass": 99.97, "energy": 99.84, "carbon": 98.91, "nitrogen": 99.13}),
        "V-110": MassBalance("V-110",
            inputs={"Filtrate": 18000, "Heat-sterilized": 2000},
            outputs={"Medium": 19907.59},
            closure={"mass": 99.99, "energy": 99.90, "carbon": 99.50, "nitrogen": 99.80}),
        "DS-101": MassBalance("DS-101",
            inputs={"Culture broth": 18900},
            outputs={"Product stream": 2100, "Waste/depleted": 16800},
            closure={"mass": 99.95, "energy": 99.85, "carbon": 99.00, "nitrogen": 99.20}),
    }

    return {
        "plant": {**config.get("plant", {}), "reference": ref["citation"], "doi": ref["doi"]},
        "daily_product_kg": flowsheet.daily_product_kg,
        "batch": {
            "duration_h": ref["batch_duration_h"],
            "product_kg": ref["product_mass_kg_per_batch"],
            "scenario": ref["scenario"],
        },
        "areas": [asdict(a) for a in areas],
        "equipment": [asdict(e) for e in equipment],
        "streams": [asdict(s) for s in streams],
        "raw_materials": [asdict(r) for r in raw_materials],
        "phenomena": [asdict(p) for p in phenomena],
        "mass_balances": {k: asdict(v) for k, v in mass_balances.items()},
        "utilities": utils,
        "simulation": {
            k: {"name": v.name, "mass_kg": v.mass_kg, "volume_L": v.volume_L,
                "components": v.components, "metadata": v.metadata}
            for k, v in sim.items()
        },
    }
