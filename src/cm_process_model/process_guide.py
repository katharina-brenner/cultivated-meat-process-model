"""Comprehensive process Q&A for cultivated meat manufacturing (English)."""

from __future__ import annotations

from typing import Any

from cm_process_model.brenner_data import load_brenner_reference
from cm_process_model.impact_model import build_impact_summary


def build_process_guide() -> dict[str, Any]:
    brenner = load_brenner_reference()
    impact = build_impact_summary()
    ref = brenner["reference"]
    params = brenner["process_parameters"]
    max_vcd = float(params["max_cell_density_cells_mL"])
    syn_air = brenner["utilities_per_batch"]["aeration"]["synthetic_air_kg"]
    cip_water = brenner["utilities_per_batch"]["cip"]["water_kg"]
    depleted_t = brenner["outlet_streams"]["depleted_medium"]["mass_t_per_batch"]

    categories = [
        {
            "id": "basics",
            "title": "Fundamentals",
            "icon": "◈",
            "questions": [
                {"q": "What is cultivated meat (CM)?",
                 "a": "Cultivated meat is produced by expanding animal cells ex vivo in controlled bioreactors. "
                 "This model describes unstructured cell biomass (ground-meat-like) without microcarriers, "
                 "differentiation, or tissue maturation — a realistic near-term target (Brenner et al. 2026)."},
                {"q": "What does this factory produce?",
                 "a": f"~{ref['product_mass_kg_per_batch']:,.0f} kg packaged biomass per batch (stream DS-102, "
                 f"{ref['product_entities_per_batch']:,.0f} units of 1 kg + 10 g packaging). Not structured steak."},
                {"q": "How long is one batch?",
                 "a": f"~{ref['batch_duration_h']/24:.1f} days ({ref['batch_duration_h']:.0f} h) gate-to-gate: "
                 "media prep (~9 h to expansion) + 6 expansion stages × 5 days + downstream (~4.75 h)."},
                {"q": "What reference study is this based on?",
                 "a": f"{ref['citation']}. DOI: {ref['doi']}. SuperPro Designer v12, Scenario 1 (90:10 split)."},
                {"q": "Batch, fed-batch, or perfusion?",
                 "a": "Batch expansion — medium is not removed during cultivation. Fed-batch and perfusion "
                 "require separate models; perfusion needs continuous medium feed and harvest."},
            ],
        },
        {
            "id": "materials",
            "title": "Raw Materials & Medium",
            "icon": "◎",
            "questions": [
                {"q": "Which media components are required?",
                 "a": "8 components (Table 3): water, amino acids, glucose, salts, trace elements, "
                 "proteins (FBS-equivalent), vitamins, growth factors (IGF-1). ~367.9 kg dry mass + "
                 "~19,540 kg water per 20,000 L batch."},
                {"q": "Where does the medium composition come from?",
                 "a": "Artificial medium from the arithmetic mean of AdvancedMEM, RPMI 1640, DMEM (high glucose), "
                 "and IMDM — avoiding bias while covering high cell density needs."},
                {"q": "Why two sterilization routes (90:10)?",
                 "a": "Heat-sensitive (vitamins, proteins, growth factors) → filtration via V-101. "
                 "Heat-stable (AA, glucose, salts, trace elements) → steam 121°C via V-102/ST-101."},
                {"q": "How much glucose and amino acids per batch?",
                 "a": "Glucose: 90 kg (4.5 g/L). Amino acids: 25.44 kg (1.27 g/L). Salts: 191.78 kg (9.59 g/L)."},
                {"q": "Is fetal bovine serum (FBS) used?",
                 "a": "FBS is replaced by defined protein and growth factor fractions (60 kg proteins, "
                 "0.0001 kg IGF-1 per batch) based on 10% FBS substitution."},
                {"q": "What drives medium cost?",
                 "a": "Proteins and growth factors dominate cost despite low concentration. "
                 f"Water and salts dominate mass ({impact['materials']['total_media_kg_per_batch']:,.0f} kg total)."},
            ],
        },
        {
            "id": "media_prep",
            "title": "Media Preparation",
            "icon": "◐",
            "questions": [
                {"q": "What are the media prep steps?",
                 "a": "1) Mix in V-101/V-102 (60 min). 2) Transfer via PM-101/PM-102. "
                 "3) Sterilize: DE-101/DE-102 (filtration) or ST-101 (121°C steam). "
                 "4) Mix in MX-101 → 26°C. 5) React to 'Medium'. 6) Cool & store in V-110 at 4°C (113 kWh)."},
                {"q": "What filter area is required?",
                 "a": "DE-101 and DE-102: 20 m² each (2× 10 m² cartridges), flux 250 L/m²·h, 80% then 100% impurity retention."},
                {"q": "Temperature profile in media prep?",
                 "a": "Mix 25°C → heat steril 121°C (152°C steam) → outlet 35°C → MX-101 26°C → V-110 storage 4°C."},
                {"q": "Why is media prep a scale-up bottleneck?",
                 "a": "High energy/cooling demand, sterilization filter area, CIP load, ~9 h before expansion starts. "
                 "50:50 split increases heating demand 5× vs 90:10."},
            ],
        },
        {
            "id": "expansion",
            "title": "Cell Expansion",
            "icon": "◉",
            "questions": [
                {"q": "How does the cell cascade work?",
                 "a": "6 stages, ~10× volume jump: SFR-101 (100 mL) → SFR-102 (1.6 L) → RBS-101 (25 L) → "
                 "RBS-102 (250 L) → BR-101 (2,000 L) → BR-102 (20,000 L). 5 days (120 h) per stage."},
                {"q": "What cell densities are achieved?",
                 "a": f"Inoculum transfer: 1×10⁷ cells/mL. Maximum in BR-102: {max_vcd:.0e} cells/mL. "
                 "SFR-101 start: 2×10⁵ cells/mL."},
                {"q": "What is the doubling time?",
                 "a": f"Reference {params['doubling_time_h']} h (CHO-K1 literature). Model uses fixed 120 h/stage — "
                 "calculated doublings per vessel ≤6 (Table 2)."},
                {"q": "What gas is supplied?",
                 "a": f"Synthetic Air: 5% CO₂ + 95% air. ~{syn_air:,.0f} kg/batch in expansion. Purging before fermentation."},
                {"q": "How much cooling water for BR-102?",
                 "a": "748.58 kg/h chilled water at 9.69 kW agitation (0.5 kW/m³). Agitation → heat → cooling at 37°C."},
                {"q": "Shake flask vs wave vs STR?",
                 "a": "Shake flasks (manual), wave bioreactors (single-use, 50% max vol.), STRs (80% max vol., automatable). "
                 "Scenario 4 replaces all with STRs."},
                {"q": "What leaves the production bioreactor?",
                 "a": "Stream S-145: ~10.5% biomass, ~84% depleted medium, ~5% impurities → downstream processing."},
            ],
        },
        {
            "id": "dsp",
            "title": "Downstream Processing",
            "icon": "◫",
            "questions": [
                {"q": "What are the DSP steps?",
                 "a": "Cool HX-101 (37→25°C) → centrifuge DS-101 (35.64 kW) → waste filter DE-103 → "
                 "wash WSH-101 → extrude XD-101 (4°C) → fill FL-101 (1 kg + 10 g container). ~4.75 h."},
                {"q": "What is harvest efficiency?",
                 "a": "Centrifuge separates biomass from depleted medium. Most biomass (38.4%) in product stream S-151."},
                {"q": "What happens to depleted medium?",
                 "a": f"Stream S-156: ~{depleted_t} t depleted medium — critical waste stream for sustainability."},
                {"q": "Are additives mixed during extrusion?",
                 "a": "Not in the baseline model — XD-101 is a compaction/cooling placeholder. Plant proteins/fat could be added later."},
            ],
        },
        {
            "id": "utilities",
            "title": "CIP, SIP & Utilities",
            "icon": "◧",
            "questions": [
                {"q": "What is CIP?",
                 "a": f"Cleaning-in-place: AWS (0.5% HNO₃), CWS (1% NaOH), SWS (1% NaClO) + water. "
                 f"{cip_water:,.0f} kg CIP water per batch."},
                {"q": "What is SIP?",
                 "a": "Sterilization-in-place — steam sterilization of equipment. Implicit in ST-101 and bioreactor CIP templates."},
                {"q": "Steam and cooling water per batch?",
                 "a": f"Steam: {brenner['utilities_per_batch']['heating_cooling']['steam_kg']:.1f} kg. "
                 f"Chilled water: {brenner['utilities_per_batch']['heating_cooling']['chilled_water_kg']:,.0f} kg."},
                {"q": "Why is cooling a bottleneck?",
                 "a": "Agitation heat scales with volume; heat removal scales with surface area. "
                 "Surface/volume ratio drops at scale. Chilled water dominates utility demand."},
            ],
        },
        {
            "id": "energy_co2",
            "title": "Energy & CO₂",
            "icon": "◬",
            "questions": [
                {"q": "Electricity per batch?",
                 "a": f"~{impact['energy']['electricity_kWh_per_batch']:,.0f} kWh/batch "
                 f"({impact['energy']['electricity_kWh_per_kg_product']:.2f} kWh/kg): media "
                 f"{impact['energy']['media_prep_kWh']:.0f} + expansion {impact['energy']['cell_expansion_kWh']:.0f} "
                 f"+ DSP ~{impact['energy']['dsp_kWh']:.0f} kWh."},
                {"q": "CO₂ footprint?",
                 "a": f"Screening estimate ~{impact['co2']['total_kg_per_batch']:,.0f} kg CO₂/batch "
                 f"({impact['co2']['total_kg_per_kg_product']:.3f} kg/kg product)."},
                {"q": "Which stage uses the most energy?",
                 "a": "Cell expansion (~85% of electricity) — 6 bioreactors × 120 h agitation and cooling, especially BR-102."},
                {"q": "Can medium be recycled?",
                 "a": "Not in baseline model — paper discusses 50–90% recycling as critical for economics."},
            ],
        },
        {
            "id": "scaleup",
            "title": "Scale-up & Scenarios",
            "icon": "◭",
            "questions": [
                {"q": "Main bottlenecks?",
                 "a": "Media prep & sterilization, CIP/cooling utilities, cell expansion performance, depleted medium waste."},
                {"q": "Scenario 3 (local scale)?",
                 "a": "Decentralized: max 2,000 L in BR-101, no extrusion/filling — washed biomass at 4°C only."},
                {"q": "Scenario 4 (expansion variation)?",
                 "a": "5 STRs, high-density cryopreservation (200 mL inoculum), 5 days shorter, +25% CIP, −6% energy."},
                {"q": "Is 5×10⁷ cells/mL realistic?",
                 "a": "Ambitious — CHO literature up to ~10⁸ cells/mL; not yet validated for CM at industrial scale."},
                {"q": "Microcarriers or suspension?",
                 "a": "Suspension without microcarriers — scalable with STRs, state of the art for industrial bioprocessing."},
            ],
        },
        {
            "id": "model",
            "title": "Model & Simulation",
            "icon": "◆",
            "questions": [
                {"q": "What data is shown in the Digital Factory?",
                 "a": "All equipment properties, all stream compositions, raw materials, phenomena, mass balances, "
                 "energy/materials analysis, and this knowledge base — fully visible without clicking."},
                {"q": "How to export all data?",
                 "a": "Export button → JSON with factory topology, simulation, impact data, and Brenner 2026 reference."},
                {"q": "What is NOT in the model?",
                 "a": "Cell differentiation, tissue maturation, texture/sensory, fed-batch/perfusion, medium recycling, "
                 "full LCA, costs, regulatory aspects."},
                {"q": "How are mass and energy balances closed?",
                 "a": "Closure values >99% per unit — medium formation reaction, fermentation stoichiometry, "
                 "CIP/utility streams from SuperPro reports."},
            ],
        },
    ]

    total_q = sum(len(c["questions"]) for c in categories)

    return {
        "title": "Process Knowledge Base",
        "subtitle": "Complete Q&A for CM manufacturing · Brenner et al. 2026",
        "total_questions": total_q,
        "categories": categories,
    }
