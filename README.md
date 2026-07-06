# insilico dynamics process model

Process model for cultivated meat production, from media preparation through packaging, exposed as the `insilico dynamics` bioprocess facility interface.
The baseline is aligned with Brenner et al. (2026), "Decoding cultured meat
manufacturing: a full process model to identify scale-up bottlenecks."

## Structure

```
config/baseline.yaml          Scenario parameters
src/cm_process_model/         Core library
  streams.py                  Material streams
  flowsheet.py                Process assembly and simulation
  units/                      Unit operations
  integrations/               External model adapters
notebooks/01_baseline_model.ipynb   Exploratory analysis
tests/                        Pytest suite
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run tests

```bash
pytest
```

## Quick start

```python
from pathlib import Path
from cm_process_model import Flowsheet, load_config

config = load_config(Path("config/baseline.yaml"))
flowsheet = Flowsheet(config)
results = flowsheet.simulate()
report = flowsheet.mass_energy_report()
print(f"Daily product: {flowsheet.daily_product_kg:.1f} kg")
print(report["energy_kwh"])
```

## Web app

Open [webapp/index.html](/Users/katharinajuliabrenner/Documents/GitHub/cultivated-meat-process-model/webapp/index.html) in a browser to use the interactive `insilico dynamics` process facility.
For browser-safe local use, run a static server from the repository root:

```bash
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/webapp/index.html`.

After pushes to `main`, the GitHub Pages workflow deploys the static web app
from `webapp/`. The expected public URL is:
`https://katharina-brenner.github.io/cultivated-meat-process-model/`.

# What the app shows

- live cultivation controls for final STR volume, peak viable cell density, doubling time, culture duration, cell mass, viability, media composition, sterilization split, biomass recovery, wash fraction, and buffer volume
- click-through views for `Factory`, `Timeline`, `Data`, and `Downloads`
- first-page factory map with every major equipment item and animated process stream from media prep through packaged product
- clickable equipment and streams with bioprocess-specific operation icons, hover-only explanations, and a live inspector for physical properties, reactions, mass balances, utilities, and connected objects
- light high-end `insilico dynamics` CI with a unified SF Pro/system font stack, warm white surfaces, restrained steel-blue, teal, green, amber, and red process accents
- plant-intelligence cards for batch cadence, bottleneck, energy intensity, utility envelope, and process yield
- Celonis-like process diagram and factory map with equipment icons for media prep, seed expansion, production STR, clarification, washing, extrusion, packaging, and waste
- paper reference table showing live app values, paper values, and numerical deltas
- simplified spatial factory view with 3D-style vessels and utility rail
- process-time slider, sticky Play/Pause control, elapsed-time readout, remaining-time readout, active-unit label, and an explicit time-balance strip where media prep + seed train + production + downstream + closeout equals the displayed total
- Timeline `PFD plant view` with chemical-engineering style symbols for tanks, sterile filters, heat exchangers, stirred-tank reactors, pumps, centrifugation, washing, extrusion, filling, utilities, waste, and product flow
- compact live time response with selectable cells, biomass, energy, medium, oxygen, CO2, and utility-water curves
- full inputs, outputs, chemical equations, mass equations, energy equations, utilities, stream tables, equipment tables, paper reference deltas, and stage-level outputs in the downloadable data package
- export scenario selection inside `Downloads`, including the 90:10 sterile split, 50:50 sterile split, local-scale variation, and STR-only expansion
- uploaded ZIP reference screenshots kept out of the visible page preview; they are available only as text download links and in the downloadable manifest

# Right-click export

Right-click anywhere in the process facility to download the current model state as JSON,
CSV, or Markdown. The same menu can copy the active equations.

# Downloads and step export

The blue `Export model` button downloads a complete HTML report with
parameters, summary metrics, all chemical/mass/energy equations, every
process-step input and output, utility data, reference-asset links, structured
equipment and stream tables, timeline data, paper reference deltas, and the full JSON
payload.

The `Data package JSON` download exposes the same technical tables as machine
readable JSON: equipment, streams, equations, utilities, energy, timing,
timeline, selectable response variables, paper reference deltas, plant-intelligence
KPIs, and the reference-file manifest.

The `Operation notes JSON` download contains the same hover explanations for
all process steps, equipment, and streams, including the relevant equations,
properties, mass balances, and utilities.

Each process node has an `Export step` button. It downloads a focused HTML
report for that unit operation, including equations, inputs, outputs,
utilities, and the step-level JSON payload.

Each equipment item and stream on the `Factory` page can also be right-clicked
for scoped JSON/CSV/Markdown export. The inspector additionally offers focused
HTML reports for the selected equipment or stream.

## Process flow

Media prep → Seed train → Production bioreactor → Clarification centrifuge →
Biomass washing → Extrusion → Packaging

The bioreactor step uses `BioreactorAdapter` as a pluggable interface for external kinetics models.

Paper-derived features now represented in the model include:

- artificial medium composition from the paper's Table 3
- medium-forming Reaction 1 with adjusted water mass and 19,907.5903 kg Medium per 20,000 L batch
- 90:10 and 50:50 sterile-filtration / heat-sterilization media-prep scenarios
- staged expansion through shake flasks, wave bioreactors, and stirred-tank reactors
- 20,000 L production-bioreactor broth composition from Table 4
- centrifugation, depleted-medium waste, buffer washing, extrusion cooling, and 1 kg filling
- CIP, heating/cooling, aeration, and timing references for the paper scenarios
- standalone media-prep, cell-expansion, and downstream subprocess descriptions
- Scenario 3 local-scale cooling to S-143 and Scenario 4 BR-105 STR-only expansion

Use `apply_scenario(config, "main_50_50")`, `apply_scenario(config, "local_scale")`,
or `apply_scenario(config, "cell_expansion_variation")` to inspect process variants.

## # What Was Missing And Is Now Added

# Correct Reaction 1 medium mass

The earlier Python model kept 20,000 kg water plus solids. The paper instead
adjusts water so the artificial medium becomes one water-like `Medium`
component:

```text
25.4375 Amino Acids + 90.0000 Glucose + 0.0001 IGF-1
+ 60.0000 Proteins + 191.7802 Salts + 0.1001 Trace Elements
+ 0.5874 Vitamins + 19539.6850 Water -> 19907.5903 Medium
```

That is now represented in `results["media"].metadata["reaction_1"]`.

# Media operation details

The model now includes the paper's 60 min blending, 0.1 kW/m3 mixing power,
5 h transfer-out duration, 90:10 flow rates of 3,600 L/h and 400 L/h,
1 bar pump pressure increase, 2.013 bar pump outlet pressure, 250 L/m2/h
filtration flux, and 0.1% impurity challenge on the heat-sensitive fraction.

# Sterile filtration removal sequence

The paper contaminated the heat-sensitive fraction with impurities before
filtration. The first dead-end filter removes 80%; the second removes the
remaining impurities. This is now in `metadata["sterile_filtration"]`.

# Equipment sizing and timing

The metadata now includes paper sizing/timing references such as V-101/V-102
tank volumes, filter cartridge counts, storage cooling time, cooling rate,
heating/cooling duties, and storage pressure.

# Operation sequences

Each expansion vessel now carries purge, transfer-in, fermentation,
aeration/venting, and transfer-out operation metadata. BR-102 keeps the
paper-specific 4,000 L/h transfer-out flow.

# CIP templates

`flowsheet.cip_report()["templates"]` now records `CIP_Template_Full`,
`CIP_Template_Reduced`, equipment assignments, post-CIP air purge behavior,
and equipment where CIP/autoclaves were omitted in the paper.

# Process variations

`apply_scenario(config, "local_scale")` now terminates at local cooled biomass
stream `S-143` using `P-14/EC-101`. `apply_scenario(config,
"cell_expansion_variation")` now represents the STR-only BR-101 through BR-105
variation with BR-105 as the final 20,000 L stage and outlet `S-121`.

# Standalone subprocess models

The paper's standalone media-preparation, cell-expansion, and downstream files
are represented in `flowsheet.standalone_subprocess_report()`, including the
changes to streams and charging/transfer operations described in Section 2.2.2.

# Paper scope boundaries

Some things are not simulated because the paper itself explicitly did not model
them. They are now recorded in `flowsheet.paper_scope_report()`:

- fed-batch operation
- microcarriers
- differentiation, maturation, and structured tissue formation
- lactate and ammonia accumulation
- explicit residual nutrient composition inside depleted medium
- extrusion additives such as plant proteins
- shake-flask and wave-bioreactor autoclaves
- cell banking for high-density cryopreservation
- media recycling, CO2 reuse, and anaerobic digestion

## # Calculation Model

The model now exposes chemical, mass, and energy calculations through stream
metadata and through `Flowsheet.mass_energy_report()`.

# Medium component masses

Each medium component from the paper's artificial medium is converted from g/L
to kg/batch:

```text
component_kg = concentration_g_L * batch_volume_L / 1000
```

For the 20,000 L baseline this gives 90 kg glucose, 25.44 kg amino acids,
191.8 kg salts, 60 kg proteins, 0.587 kg vitamins, 0.100 kg trace elements,
and 0.0001 kg IGF-1 growth factor.

# Media sterilization split

The 90:10 baseline sends growth factors, proteins, and vitamins to sterile
filtration and sends amino acids, glucose, salts, and trace elements to heat
sterilization. The 50:50 scenario is available with
`apply_scenario(config, "main_50_50")`.

# Sensible heat

Heating and cooling use the water-like heat capacity assumption from the paper:

```text
Q_kWh = mass_kg * 4.184 kJ/kg/K * delta_T_K / 3600
```

The model reports these values in `metadata["heat_sterilization"]`,
`metadata["storage_cooling"]`, `metadata["initial_cooling"]`,
`metadata["centrifuge_cooling"]`, and `metadata["cooling_kwh"]`.

# Steam and coolant estimates

The model keeps the paper's reported utility demands and also calculates
first-principles estimates:

```text
steam_kg = abs(Q_kWh) * 3600 / 2110 kJ/kg
coolant_kg = abs(Q_kWh) * 3600 / (4.184 * coolant_delta_T)
```

The reported scenario utilities remain available as
`flowsheet.utility_demands_kg_per_batch`.

# Fermentation reaction

The production bioreactor stores the paper's pseudo-stoichiometry:

```text
100 Medium + 5 O2 -> 5 Impurities + 10 Biomass + 10 CO2 + 80 Depleted Medium
```

The 20,000 L baseline outlet is represented as 1,990 kg biomass, 15,930 kg
depleted medium, and 1,000 kg impurities.

# Cell-growth calculations

Each expansion stage reports:

```text
N = log2(end_cell_count / starting_cell_count)
medium_L = working_volume_L - previous_stage_volume_L
E_kWh = power_kW * culture_duration_h
```

The seed train and production reactor also report medium warming and agitation
heat removal, because the paper assumes mechanical agitation energy dissipates
as heat in the culture.

# Downstream mass balances

Centrifugation applies 95% biomass recovery and 5% impurity carryover to the
product stream. Washing removes 100% depleted medium and impurities and leaves
a product stream that is 90% biomass and 10% buffer solution by mass.

# CIP chemistry

The CIP report converts paper utility masses into active chemical and water
masses:

```text
AWS = 0.5 mass% HNO3
CWS = 1.0 mass% NaOH
SWS = 1.0 mass% NaClO
```

Use `flowsheet.cip_report()` or `flowsheet.mass_energy_report()["cip_chemistry"]`.

## # Paper Process Steps Represented

# Media preparation

- `P-1/V-101`: blend heat-sensitive growth factor, protein, and vitamin fraction.
- `P-2/V-102`: blend heat-stable amino acid, glucose, salt, and trace-element fraction.
- `P-7/PM-102` and `P-6/PM-101`: pump both fractions to sterilization.
- `P-4/DE-102` and `P-16/DE-101`: sterile dead-end filtration.
- `P-3/ST-101`: heat sterilization at 121 C.
- `P-13/MX-101`: mix sterile-filtered and heat-sterilized streams.
- `P-5/V-110`: cool and store prepared medium at 4 C.

# Cell expansion

- `S-131`: thaw/charge inoculum.
- `SFR-101`: 100 mL shake flask expansion.
- `SFR-102`: 1.6 L shake flask expansion.
- `RBS-101`: 25 L wave bioreactor expansion.
- `RBS-102`: 250 L wave bioreactor expansion.
- `BR-101`: 2,000 L stirred-tank expansion.
- `BR-102`: 20,000 L production stirred-tank culture.
- Each vessel includes purge, transfer-in/charge, fermentation, aeration/venting, and transfer-out metadata.

# Downstream processing

- `P-15/PM-103`: pump production broth downstream.
- `P-18/HX-101`: cool broth from 37 C to 25 C.
- `P-17/DS-101`: disk-stack centrifugation with product and depleted-medium outlets.
- `P-19/DE-103`: sterile filtration of depleted medium waste.
- `P-20/V-103`: depleted-medium storage tank.
- `P-21/WSH-101`: buffer wash of biomass product.
- `P-22/XD-101`: extrusion placeholder and cooling to 4 C.
- `P-23/FL-101`: filling into 1 kg product entities with 10 g container mass.
- `P-14/EC-101`: local-scale final cooling to `S-143` at 4 C.

# Utilities and support operations

- `CIP_Template_Full`: applied to media tanks, storage tanks, and STRs.
- `CIP_Template_Reduced`: applied to pumps, heat sterilization, heat exchanger, centrifuge, washer, extruder, and filler.
- Synthetic air is represented as 5% CO2 and 95% air.
- Scenario timing and utility demands from the paper are exposed through
  `flowsheet.timing_h` and `flowsheet.utility_demands_kg_per_batch`.

# Process variations and standalone models

- `main_90_10`: main process with 90% sterile filtration and 10% heat sterilization.
- `main_50_50`: main process with equal sterile-filtration and heat-sterilization volumes.
- `local_scale`: 2,000 L final cell expansion, no extrusion/filling, final cooling to `S-143`.
- `cell_expansion_variation`: high-volume inoculum, STR-only expansion, five reactors from BR-101 to BR-105.
- Standalone media preparation, cell expansion, and downstream processing are documented in `standalone_subprocess_report()`.
