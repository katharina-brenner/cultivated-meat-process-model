"""Named process steps represented from the paper flowsheet."""

from __future__ import annotations


PAPER_PROCESS_STEPS = [
    {
        "id": "P-1/V-101",
        "section": "media_preparation",
        "name": "blend heat-sensitive medium fraction for 60 min at 0.1 kW/m3",
        "modeled_as": "media.metadata['mixing'] and media.metadata['sterile_filtered_components']",
    },
    {
        "id": "P-2/V-102",
        "section": "media_preparation",
        "name": "blend heat-stable medium fraction for 60 min at 0.1 kW/m3",
        "modeled_as": "media.metadata['mixing'] and media.metadata['heat_sterilized_components']",
    },
    {
        "id": "P-7/PM-102 and P-6/PM-101",
        "section": "media_preparation",
        "name": "pump medium fractions to sterilization",
        "modeled_as": "media.metadata['pump_steps'] and media.metadata['pump_pressure']",
    },
    {
        "id": "P-4/DE-102 and P-16/DE-101",
        "section": "media_preparation",
        "name": "dead-end sterile filtration including 0.1% impurity challenge and staged removal",
        "modeled_as": "media_prep.metadata['sterile_filtration']",
    },
    {
        "id": "P-3/ST-101",
        "section": "media_preparation",
        "name": "heat sterilization at 121 C",
        "modeled_as": "media_prep.metadata['heat_sterilization']",
    },
    {
        "id": "P-13/MX-101",
        "section": "media_preparation",
        "name": "mix sterilized fractions into Medium via Reaction 1",
        "modeled_as": "media.metadata['reaction_1']",
    },
    {
        "id": "P-5/V-110",
        "section": "media_preparation",
        "name": "cool and store medium at 4 C",
        "modeled_as": "media_prep.metadata['storage_cooling']",
    },
    {
        "id": "S-131",
        "section": "cell_expansion",
        "name": "inoculum thaw/charge",
        "modeled_as": "seed_train.metadata['inoculum_volume_L']",
    },
    {
        "id": "SFR-101 through BR-102",
        "section": "cell_expansion",
        "name": "purge, transfer in, ferment, transfer out for each vessel",
        "modeled_as": "seed/culture metadata stage_results and stage",
    },
    {
        "id": "Table 2",
        "section": "cell_expansion",
        "name": "working volumes, starting cell counts, ending cell counts, and doublings",
        "modeled_as": "seed.metadata['stage_results'] and culture.metadata['stage']",
    },
    {
        "id": "Reaction 2",
        "section": "cell_expansion",
        "name": "stoichiometric batch fermentation to biomass, CO2, impurities, and depleted medium",
        "modeled_as": "culture.metadata['reaction']",
    },
    {
        "id": "Table 7",
        "section": "cell_expansion",
        "name": "instantaneous coolant flow and total power by expansion vessel",
        "modeled_as": "stage coolant_flow_kg_h and power_kw metadata",
    },
    {
        "id": "Synthetic Air",
        "section": "cell_expansion",
        "name": "aeration and venting with 5% CO2 and 95% air",
        "modeled_as": "culture.metadata['synthetic_air_kg_per_batch']",
    },
    {
        "id": "S-145",
        "section": "cell_expansion",
        "name": "production bioreactor outlet composition at 37 C and 1.013 bar",
        "modeled_as": "culture.components and culture.metadata['stream_id']",
    },
    {
        "id": "P-15/PM-103",
        "section": "downstream_processing",
        "name": "pump production broth to downstream processing",
        "modeled_as": "clarification.metadata['pump']",
    },
    {
        "id": "P-18/HX-101",
        "section": "downstream_processing",
        "name": "cool broth from 37 C to 25 C",
        "modeled_as": "clarification.metadata['initial_cooling']",
    },
    {
        "id": "P-17/DS-101",
        "section": "downstream_processing",
        "name": "disk-stack centrifuge solids removal",
        "modeled_as": "clarified stream plus depleted_medium waste stream",
    },
    {
        "id": "P-19/DE-103",
        "section": "downstream_processing",
        "name": "sterile filtration of depleted medium waste",
        "modeled_as": "depleted_medium.metadata['post_filtration_components']",
    },
    {
        "id": "P-20/V-103",
        "section": "downstream_processing",
        "name": "depleted medium storage tank",
        "modeled_as": "depleted_medium.metadata['storage_tank_volume_L']",
    },
    {
        "id": "P-21/WSH-101",
        "section": "downstream_processing",
        "name": "biomass washing with buffer solution",
        "modeled_as": "washed stream plus wash_waste stream",
    },
    {
        "id": "P-22/XD-101",
        "section": "downstream_processing",
        "name": "extrusion placeholder with cooling to 4 C",
        "modeled_as": "extruded stream metadata",
    },
    {
        "id": "P-23/FL-101",
        "section": "downstream_processing",
        "name": "fill 1 kg biomass product with 10 g container",
        "modeled_as": "packaged stream metadata",
    },
    {
        "id": "P-14/EC-101",
        "section": "local_scale_variation",
        "name": "Scenario 3 final cooling to S-143 at 4 C",
        "modeled_as": "cooled_product metadata when include_local_cooling is true",
    },
    {
        "id": "Standalone subprocess models",
        "section": "process_variations",
        "name": "separate media prep, cell expansion, and downstream files described in Section 2.2.2",
        "modeled_as": "flowsheet.standalone_subprocess_report()",
    },
    {
        "id": "Scenario 4 BR-101 through BR-105",
        "section": "process_variations",
        "name": "STR-only high-volume-inoculum expansion from 2 L to 20,000 L",
        "modeled_as": "apply_scenario(config, 'cell_expansion_variation')",
    },
    {
        "id": "CIP_Template_Full",
        "section": "utilities",
        "name": "full CIP for blending tanks, storage tanks, and STRs",
        "modeled_as": "flowsheet.cip_report()",
    },
    {
        "id": "CIP_Template_Reduced",
        "section": "utilities",
        "name": "reduced CIP for pumps, sterilizer, heat exchanger, centrifuge, washer, extruder, filler",
        "modeled_as": "flowsheet.cip_report()",
    },
]
