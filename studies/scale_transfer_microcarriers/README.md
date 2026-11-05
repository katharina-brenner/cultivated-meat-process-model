# Carrier loading to accepted capacity in cultivated meat

Numerically audited, reproducible **conditional engineering scenario model** accompanying *Engineering scale transfer for industrial cultivated meat production*.

The model asks when added microcarrier surface ceases to increase accepted annual capacity, and whether carrier loading, oxygen duty or maturation capacity can release the binding constraint. It couples a suspension screen, surface and oxygen inventories, expansion equipment occupancy, harvest recovery and downstream occupancy. It introduces no new physical correlation or experimental dataset.

## Reproduce

Use Python 3.12 or newer. The numerical model and tests use only the standard library; plotting also requires NumPy and Matplotlib.

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s Code -p test_model.py -v
python Code/run_scenarios.py
python Code/verify_independently.py
python Code/plot_figures.py
```

Run these commands from this study directory. Paths resolve relative to the scripts. Scenario generation writes seven CSV tables and `Source_Data/model_summary.json`; plotting writes Figures 5–6 as editable SVG, vector PDF and 600-dpi PNG/TIFF. There are 28 tests. Figures 1–4 belong to the original manuscript and are supplied unchanged in the submission package; they are not required to run the model.

The public study contains model code, parameter provenance, tests and reproduction instructions. Running the scripts generates the calculated Source Data and the two model figures locally.

## Inputs, boundaries and units

`Code/parameters.json` is the complete input register, including values, units, assumption/prior status and source links. The dataclass uses SI units. Explicit scenario arguments use litres, cm²/mL, W/m³ and dimensionless volume or demand ratios. No input is presented as a newly measured biological parameter.

- Suspension uses a reference-normalized empirical solids-suspension prior for unchanged carrier material, density, diameter and fluid properties. The **3 L, 20 cm²/mL, 60 rpm anchor is assumed**, not measured. Its Reynolds number is about 4,262; constant turbulent power-number validity at this minimum-speed anchor is unverified. [Zwietering (1958)](https://doi.org/10.1016/0009-2509(58)85031-9).
- Oxygen transfer uses the dimensional prior `kLa = alpha * 0.075 * (Pg/V)^0.47 * us^0.8`, with W/m³ and m/s returning s⁻¹. This is reproduced from a CHO-context process analysis and is **not calibrated to cultivated meat**. [Humbird (2021)](https://doi.org/10.1002/bit.27848), [Xing et al. (2009)](https://doi.org/10.1002/bit.22287).
- Carrier-loading and growth scenarios use laboratory bovine satellite-cell work as context. The assumed endpoint occupancy and doubling time are not validated industrial endpoints; the reported carrier-addition confluence trigger is a different quantity. [Bodiou et al. (2025)](https://doi.org/10.1038/s41598-025-97813-7).
- Power limits of 2, 5 and 20 W/m³ are scenario boundaries, **not biological safety limits**. An independently qualified speed can be supplied. A failed suspension screen gives missing annual output, not zero biological yield. The operating Reynolds flag is separate; all supplied plotted scenarios pass the selected 10,000 operating-point screen.
- Output is **accepted viable input-cell equivalents/year**, not kilograms or tonnes of meat. The accepted fraction is an input and does not predict retained myogenesis. Gross harvested endpoint cells include the externally supplied inoculum; seed-train capacity and net newly generated biomass are outside the boundary. Fixed volumetric inoculum also means that cells per unit carrier area decrease when carrier area increases; successful colonization is assumed. No universal wet-cell mass or final food yield is assigned.

## Conditional results

At the declared defaults, oxygen-supported loading thresholds are 33.0853, 50.8941 and 97.6417 cm²/mL at 2, 5 and 20 W/m³. At 40 cm²/mL and 5 W/m³, expansion occupies nine days and requires a maturation-to-expansion volume ratio of 0.711111 to receive all recovered cells. At ratio 0.3, the accepted capacity is 8.91 × 10¹⁴ input-cell equivalents/year per 100 m³ of total expansion working volume. Adding carrier surface or oxygen duty alone cannot release that maturation plateau.

All four equal-volume stirred-tank arrays have the same capacity when common transport, growth and downstream assumptions are imposed. The model does not manufacture an optimum reactor size. The 20,000 × 5 L array is an equal-volume reference, not a manufacturing recommendation. Rocking bags and fixed beds are outside the calculated format scope.

These are deterministic scenario results, not measured performance, probability bounds, cost forecasts or validated industrial predictions. The envelope omits medium/metabolite limits, carrier colonization dynamics, transient gradients, retained differentiation, seed supply, contamination, actual batch scheduling and shared-service contention. Its value is identifying which measured input could change a capacity-allocation decision.

## Files and provenance

| File | Purpose |
|---|---|
| `Code/model.py` | Geometry, transport and annual stage-capacity calculation |
| `Code/parameters.json` | Exact parameter and scenario register with DOI links |
| `Code/run_scenarios.py` | Deterministic source-table generation |
| `Code/test_model.py` | Independent unit, limit, conservation and intervention checks |
| `Code/figure_glyphs.py` | Original flat reactor symbols using the manuscript palette |
| `Code/plot_figures.py` | Two original calculated main figures |
| `Code/verify_independently.py` | Independent recomputation without importing the model or runner |
| `Source_Data/*.csv` | Calculated coordinates and diagnostics; no experimental rows |
| `Source_Data/model_summary.json` | Thresholds, scenario schemas and architecture results |

Figure 6 maps oxygen demand against maturation allocation; the equal-volume architecture comparison is retained as a Supplementary Information consistency check, since its equal outputs follow from imposed common assumptions. New figure code and layouts are original. No publisher figure or external figure image is copied. Standard physical and empirical relationships retain the sources linked above. The submission's Supplementary Information gives the full equations and limitations. The separate study subdirectory does not change the repository's existing process-model application.

Rechecked 5 November 2026. This package records a reproducible scenario analysis; author review and journal-specific requirements remain part of submission.

## Numerical audit

Independent recomputation checks 1,302 scenario rows and 47,092 fields, including the two derived allocation-boundary columns. No numeric or categorical mismatches were found. The checker does not import the model or runner. All 979 legacy rows remain identical. Scenario inputs are now executable configuration. Assumed biological inputs remain unvalidated; correct arithmetic does not establish industrial performance. Detailed source-verification notes record remaining access limitations separately.

The journal submission additionally includes the original manuscript assets, literature-audit notes and an attributed reconstruction of published source-workbook values. Those materials are separate from this code distribution and are not needed to reproduce the model. Generated CSVs are deterministic scenario calculations, not experimental observations.
