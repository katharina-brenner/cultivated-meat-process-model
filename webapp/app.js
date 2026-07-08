const cpWater = 4.184;
const mediumDensityKgL = 19907.5903 / 20000;
const playSpeedHoursPerSecond = 18;
const downstreamDurationsH = {
  clarification: 1.3,
  washing: 1.4,
  extrusion: 1.0,
  packaging: 1.05,
};
const ciPalette = {
  media: "#3a6ea5",
  cells: "#2f7d63",
  production: "#3a6ea5",
  energy: "#a36d20",
  utility: "#7b79b8",
  waste: "#9b6a63",
  product: "#1d8f83",
  text: "#111827",
  muted: "#667085",
  graphite: "#1f2937",
  surface: "#ffffff",
  page: "#f6f8fb",
  line: "#dbe3ec",
};
const canvasFontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
const modelName = "Cultivated Meat Process Model";
const modelAttribution = "© Katharina Julia Brenner";
const exportFilePrefix = "cultivated-meat-process-model";
const baselineComposition = {
  vitamins: 2.937e-2,
  salts: 9.58901,
  traceElements: 5.005e-3,
  growthFactorIgf1: 5.0e-6,
};
const paperReportedProduct = {
  filledBulkKg: 2091.69,
  packagedKg: 2112.61,
  entities: 2091.69,
};

const controls = {
  finalVolume: document.getElementById("finalVolume"),
  peakVcd: document.getElementById("peakVcd"),
  doublingTime: document.getElementById("doublingTime"),
  stageDuration: document.getElementById("stageDuration"),
  cellMass: document.getElementById("cellMass"),
  viability: document.getElementById("viability"),
  sterileFraction: document.getElementById("sterileFraction"),
  glucose: document.getElementById("glucose"),
  aminoAcids: document.getElementById("aminoAcids"),
  proteins: document.getElementById("proteins"),
  recovery: document.getElementById("recovery"),
  washFraction: document.getElementById("washFraction"),
  bufferVolume: document.getElementById("bufferVolume"),
  timeSlider: document.getElementById("timeSlider"),
};

const outputs = {
  finalVolume: document.getElementById("finalVolumeOut"),
  peakVcd: document.getElementById("peakVcdOut"),
  doublingTime: document.getElementById("doublingOut"),
  stageDuration: document.getElementById("stageDurationOut"),
  cellMass: document.getElementById("cellMassOut"),
  viability: document.getElementById("viabilityOut"),
  sterileFraction: document.getElementById("sterileOut"),
  glucose: document.getElementById("glucoseOut"),
  aminoAcids: document.getElementById("aminoOut"),
  proteins: document.getElementById("proteinOut"),
  recovery: document.getElementById("recoveryOut"),
  washFraction: document.getElementById("washFractionOut"),
  bufferVolume: document.getElementById("bufferOut"),
  time: document.getElementById("timeOut"),
};

const processCanvas = document.getElementById("processCanvas");
const processCtx = processCanvas.getContext("2d");
const timelineCanvas = document.getElementById("timelineCanvas");
const timelineCtx = timelineCanvas.getContext("2d");
const timelineMetricControls = document.getElementById("timelineMetricControls");
const contextMenu = document.getElementById("contextMenu");
const hoverTooltip = document.getElementById("hoverTooltip");
const processDiagram = document.getElementById("processDiagram");
const utilityRail = document.getElementById("utilityRail");
const factoryMap = document.getElementById("factoryMap");
const unitInspector = document.getElementById("unitInspector");
const referenceDeltaStrip = document.getElementById("referenceDeltaStrip");
const downloadScenarioSelect = document.getElementById("downloadScenario");

let simulation = null;
let exportScope = "full";
let isPlaying = false;
let lastFrame = 0;
let playTimer = null;
let lastDownloadUrl = null;
let currentPreset = "main";
let activeView = "plant";
let selectedStepKey = "production";
let selectedDetail = { type: "device", key: "br102" };

const pythonBaseline = {
  mediaKg: 19907.5903,
  sterileVolumeL: 18000,
  heatVolumeL: 2000,
  biomassKg: 1990,
  depletedMediumKg: 15930,
  impuritiesKg: 1000,
  washedKg: 2100.5555555555557,
  packagedKg: paperReportedProduct.packagedKg,
  packUnits: paperReportedProduct.entities,
  containerKg: paperReportedProduct.entities * 0.01,
  oxygenKg: 995,
  co2Kg: 1990,
  processCompleteH: 736.26,
  processCompleteH5050: 736.92,
  localProcessCompleteH: 616.5,
  seedAgitationKwh: 213.36,
  productionAgitationKwh: 1162.8,
  mediaHeatSterilizationKwh: 223.1466666666666,
  awsKg: 2001.07,
  cwsKg: 3842.06,
  swsKg: 1000.01,
  chilledWaterKg: 163111.91,
  steamKg: 42.72,
  syntheticAirKg: 11506.78,
  massBalanceDifferenceKg: 1982.5903,
};
const paperFillFactor = paperReportedProduct.filledBulkKg / pythonBaseline.washedKg;

const presetConfig = {
  main: {
    title: "90:10 sterile split",
    values: { finalVolume: 20000, sterileFraction: 90, doublingTime: 20, stageDuration: 120, peakVcd: 50000000 },
  },
  heat: {
    title: "50:50 sterile split",
    values: { finalVolume: 20000, sterileFraction: 50, doublingTime: 20, stageDuration: 120, peakVcd: 50000000 },
  },
  local: {
    title: "Local scale variation",
    values: { finalVolume: 2000, sterileFraction: 90, doublingTime: 20, stageDuration: 120, peakVcd: 50000000 },
  },
  str: {
    title: "STR-only expansion",
    values: { finalVolume: 20000, sterileFraction: 90, doublingTime: 20, stageDuration: 120, peakVcd: 50000000 },
  },
};

const referenceAssets = [
  "Continuous model steady state.png",
  "Continuous phase and DSP.png",
  "Feed stream.png",
  "Reactions tab.png",
  "Scheduling transient phase.png",
  "Split tab.png",
  "Transient phase.png",
].map((name) => `assets/reference/${name}`);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanTooltip(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tooltipAttrs(title, body, meta = "") {
  return `data-tooltip-title="${escapeHtml(cleanTooltip(title))}" data-tooltip-body="${escapeHtml(cleanTooltip(body))}" data-tooltip-meta="${escapeHtml(cleanTooltip(meta))}"`;
}

function iconSvg(type) {
  const icons = {
    media: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8M10 3v5l-4 8a4 4 0 0 0 3.6 5.7h4.8A4 4 0 0 0 18 16l-4-8V3"/><path d="M8 15h8"/><circle cx="10" cy="18" r=".8"/><circle cx="14" cy="17" r=".8"/></svg>',
    mediaBlend: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8M10 3v5l-4 8a4 4 0 0 0 3.6 5.7h4.8A4 4 0 0 0 18 16l-4-8V3"/><path d="M8 15h8"/><circle cx="9.5" cy="17.5" r=".8"/><circle cx="13.5" cy="16.5" r=".8"/><circle cx="15" cy="19" r=".6"/></svg>',
    sterileFilter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v4H5zM7 9v10h10V9"/><path d="M9 12h6M9 15h6M9 18h6"/><circle cx="6" cy="3" r="1"/><circle cx="18" cy="21" r="1"/></svg>',
    heatSterilizer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4a3 3 0 0 1 6 0v8a5 5 0 1 1-6 0z"/><path d="M12 7v8"/><path d="M5 7c1-1 2-1 3 0M16 7c1-1 2-1 3 0"/></svg>',
    mixer: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/><path d="M8 8c4 1 5 4 4 8M16 16c-4-1-5-4-4-8"/></svg>',
    coldStore: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z"/><path d="M10 8l4 8M14 8l-4 8M9 12h6"/><path d="M17 8h2M17 16h2"/></svg>',
    seed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3"/><circle cx="15.5" cy="8" r="2.4"/><circle cx="14" cy="16" r="3.2"/><path d="M5 18c2-1.2 4-1.2 6 0M13 12c1.5-.9 3-.9 4.5 0"/></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.7 4.4h8.6A3 3 0 0 0 19 17l-5-9V3"/><path d="M7.5 16h9"/><circle cx="10" cy="18" r=".7"/><circle cx="14" cy="17.4" r=".7"/></svg>',
    wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v8H4z"/><path d="M6 14c2-3 4 3 6 0s4-3 6 0"/><path d="M7 9V6h10v3"/></svg>',
    seedReactor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8v14H8z"/><path d="M10 9h4M10 15h4M12 3v2M12 19v2"/><circle cx="12" cy="12" r="2"/></svg>',
    productionReactor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10v14H7z"/><path d="M8 8h8M8 16h8M12 3v2M12 19v2M5 9h2M17 9h2"/><path d="M10 12h4"/><circle cx="18.5" cy="6" r="1.2"/><path d="M19 4v-1"/></svg>',
    reactor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10v14H7z"/><path d="M8 8h8M8 16h8M12 3v2M12 19v2M5 9h2M17 9h2"/><path d="M10 12h4"/></svg>',
    pump: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="12" r="5"/><path d="M15 12h5M3 12h2"/><path d="M10 8v4l3 2"/></svg>',
    exchanger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 18h14"/><path d="M7 6c4 3 6 9 10 12M17 6c-4 3-6 9-10 12"/><path d="M4 12h16"/></svg>',
    centrifuge: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 5v14M5 12h14M8 8l8 8M16 8l-8 8"/></svg>',
    wash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/><path d="M8 18c3 2 5 2 8 0"/></svg>',
    washer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/><path d="M7 16c3 2 7 2 10 0"/><path d="M6 20h12"/></svg>',
    extrusion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h10l3 3-3 3H4z"/><path d="M17 12h4M7 7v10M10 7v10"/></svg>',
    extruder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h10l3 3-3 3H4z"/><path d="M17 12h4"/><path d="M7 12c1.4-2 2.8 2 4.2 0S14 10 15.5 12"/></svg>',
    package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/></svg>',
    filler: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v5l-3 3v4"/><path d="M10 15h4"/><path d="M6 17h12v4H6z"/><path d="M12 11v4"/></svg>',
    release: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/><path d="M4 20h16"/><path d="M7 4h7"/></svg>',
    waste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10l-1 14H8z"/><path d="M5 7h14M9 7V4h6v3M10 11v6M14 11v6"/></svg>',
    wasteFilter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v4H5zM7 9v10h10V9"/><path d="M9 13h6M9 16h6"/><path d="M4 21h16"/></svg>',
    wasteTank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10v14H7z"/><path d="M9 8h6M9 16h6"/><path d="M10 12c1.4-1 2.6 1 4 0"/></svg>',
  };
  return icons[type] || icons.reactor;
}

function processStepCatalog(sim) {
  const seedFinal = sim.stages[Math.max(0, sim.stages.length - 2)];
  return [
    {
      key: "media",
      icon: "media",
      badge: "P-1..5",
      title: "Media prep",
      unit: "V-101, V-102, ST-101, DE-101/102, MX-101, V-110",
      detail: `${fmt(sim.medium.sterileVolumeL)} L sterile filtration, ${fmt(sim.medium.heatVolumeL)} L heat sterilization`,
      value: fmtKg(sim.medium.mediumKg),
      color: "var(--blue)",
      inputs: { water_kg: sim.medium.waterKg, amino_acids_kg: sim.medium.components.aminoAcids, glucose_kg: sim.medium.components.glucose, proteins_kg: sim.medium.components.proteins },
      outputs: { medium_kg: sim.medium.mediumKg, filter_impurities_kg: sim.medium.impurityChallengeKg },
      utilities: { steam_kg: sim.utility.steamKg, chilled_water_kg: sim.utility.chilledWaterKg },
      equations: [
        `component_kg = concentration_g_L * ${fmt(sim.params.finalVolumeL)} L / 1000`,
        `${fmt(sim.medium.waterKg, 1)} Water + ${fmt(sim.medium.solidsKg, 1)} Solids -> ${fmt(sim.medium.mediumKg, 1)} Medium`,
        `Q_heat = ${fmt(sim.medium.heatVolumeL)} kg * 4.184 * (121 - 25) / 3600`,
        `Q_cool = ${fmt(sim.medium.heatVolumeL)} kg * 4.184 * (121 - 35) / 3600`,
        `Q_storage = ${fmt(sim.medium.mediumKg, 1)} kg * 4.184 * (mixed_temperature - 4) / 3600`,
        `sterile_filter_feed = final_volume * sterile_fraction = ${fmt(sim.medium.sterileVolumeL)} L`,
        `heat_sterilizer_feed = final_volume * (1 - sterile_fraction) = ${fmt(sim.medium.heatVolumeL)} L`,
        `IGF-1 + heat -> denatured_growth_factor_impurity`,
        `protein + heat -> denatured_protein_impurity`,
        `impurity_challenge = 0.001 * heat_sensitive_components = ${fmt(sim.medium.impurityChallengeKg, 3)} kg`,
        `filter_1_removal = 0.8 * impurity_challenge = ${fmt(sim.medium.firstFilterRemovedKg, 3)} kg`,
        `filter_2_removal = 0.2 * impurity_challenge = ${fmt(sim.medium.secondFilterRemovedKg, 3)} kg`,
      ],
    },
    {
      key: "seed",
      icon: "seed",
      badge: "P-8..12",
      title: "Seed train",
      unit: "SFR-101, SFR-102, RBS-101, RBS-102, BR-101",
      detail: `${sim.stages.length - 1} expansion stages, ${fmt(sim.params.stageDurationH)} h each`,
      value: scientific(seedFinal.endCells),
      color: "var(--green)",
      inputs: { inoculum_cells: sim.stages[0].startCells, medium_L: sim.stages.slice(0, -1).reduce((sum, stage) => sum + stage.mediumAdditionL, 0) },
      outputs: { seed_cells: seedFinal.endCells },
      utilities: { agitation_kwh: sim.energy.seedAgitationKwh, synthetic_air_kg: sim.utility.syntheticAirKg },
      equations: [
        `N = log2(end_cells / start_cells)`,
        `end_cells = min(target_cells, start_cells * 2^(duration / doubling_time))`,
        `medium_addition_L = working_volume_L - previous_stage_volume_L`,
        `agitation_kWh = power_kW * ${fmt(sim.params.stageDurationH)} h`,
        `power_kW = specific_power_kW_m3 * working_volume_m3`,
        `seed_biomass_kg = seed_cells * cell_mass_kg * viability`,
        `medium_warming_kWh = medium_addition_kg * 4.184 * (37 - 4) / 3600`,
        `cell + medium_components + O2 -> 2 cell + CO2 + depleted_medium`,
      ],
    },
    {
      key: "production",
      icon: "productionReactor",
      badge: sim.finalStage.id,
      title: "Production STR",
      unit: "Final stirred-tank reactor",
      detail: `${fmt(sim.params.finalVolumeL)} L, ${scientific(sim.achievedDensity)} cells/mL achieved`,
      value: fmtKg(sim.reaction.biomassKg),
      color: "var(--blue)",
      inputs: { seed_cells: seedFinal.endCells, medium_L: sim.finalStage.mediumAdditionL, oxygen_kg: sim.reaction.oxygenKg },
      outputs: { biomass_kg: sim.reaction.biomassKg, depleted_medium_kg: sim.reaction.depletedMediumKg, impurities_kg: sim.reaction.impuritiesKg, co2_kg: sim.reaction.co2Kg },
      utilities: { agitation_kwh: sim.energy.productionAgitationKwh, cooling_kwh: sim.energy.productionAgitationKwh },
      equations: [
        `100 Medium + 5 O2 -> 5 Impurities + 10 Biomass + 10 CO2 + 80 Depleted Medium`,
        `C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O`,
        `amino_acids + glucose + salts + growth_factors + O2 -> biomass + CO2 + depleted_medium`,
        `biomass_kg = cells * cell_mass_kg * viability`,
        `oxygen_kg = 0.5 * biomass_kg`,
        `CO2_kg = biomass_kg`,
        `impurities_kg = biomass_kg * 1000 / 1990 = ${fmt(sim.reaction.impuritiesKg, 1)} kg`,
        `depleted_medium_kg = biomass_kg * 15930 / 1990 = ${fmt(sim.reaction.depletedMediumKg, 1)} kg`,
        `broth_kg = biomass + depleted_medium + impurities = ${fmt(sim.reaction.cultureMassKg, 1)} kg`,
        `production_agitation_kWh = ${fmt(sim.finalStage.powerKw, 2)} kW * ${fmt(sim.params.stageDurationH)} h = ${fmt(sim.energy.productionAgitationKwh, 1)} kWh`,
      ],
    },
    {
      key: "clarification",
      icon: "centrifuge",
      badge: "P-17",
      title: "Clarification",
      unit: "DS-101 disk-stack centrifuge, DE-103 waste filter",
      detail: `${fmt(sim.params.recovery * 100, 1)}% biomass recovery`,
      value: fmtKg(sim.downstream.productMassAfterCentrifuge),
      color: "var(--green)",
      inputs: { culture_broth_kg: sim.reaction.cultureMassKg },
      outputs: { product_stream_kg: sim.downstream.productMassAfterCentrifuge, depleted_medium_waste_kg: sim.downstream.depletedWasteKg },
      utilities: { centrifuge_cooling_kwh: sim.energy.centrifugeCoolKwh, power_heat_dissipation_fraction: 0.25 },
      equations: [
        `product_biomass = biomass * recovery`,
        `product_mass = product_biomass / 0.3839`,
        `product_impurity = impurities * 0.05`,
        `product_depleted_medium = product_mass - product_biomass - product_impurity`,
        `waste_depleted_medium = depleted_medium - product_depleted_medium`,
        `centrifuge_waste = culture_broth - product_mass`,
        `Q_cool = mass_kg * 4.184 * (15 - 25) / 3600`,
        `mechanical_heat_removed = centrifuge_power * 0.25`,
      ],
    },
    {
      key: "washing",
      icon: "washer",
      badge: "P-21",
      title: "Washing",
      unit: "WSH-101 buffer wash",
      detail: `${fmt(sim.params.bufferVolumeL)} L buffer removes depleted medium and impurities`,
      value: fmtKg(sim.downstream.washedProductKg),
      color: "var(--amber)",
      inputs: { centrifuge_product_kg: sim.downstream.productMassAfterCentrifuge, buffer_solution_kg: sim.params.bufferVolumeL },
      outputs: { washed_biomass_product_kg: sim.downstream.washedProductKg, wash_waste_kg: sim.downstream.washWasteKg },
      utilities: { thermal_mixing_kwh: sim.energy.washThermalKwh },
      equations: [
        `100% depleted medium and impurities are routed to S-154 wash waste`,
        `buffer_retained = biomass * (1 - biomass_fraction) / biomass_fraction`,
        `washed_product = product_biomass + retained_buffer`,
        `wash_waste = product_depleted + product_impurities + buffer_in - retained_buffer`,
        `buffer_solution -> retained_buffer + wash_waste`,
        `residual_impurities_after_wash = 0 kg in current simplified model`,
        `Q_mix = buffer_kg * 4.184 * (10.8 - 4) / 3600`,
      ],
    },
    {
      key: "extrusion",
      icon: "extruder",
      badge: "P-22",
      title: "Extrusion",
      unit: "XD-101 placeholder extrusion",
      detail: "No additives modeled; stream cooled to 4 C",
      value: `${fmt(sim.energy.extrusionCoolKwh, 1)} kWh`,
      color: "var(--amber)",
      inputs: { washed_product_kg: sim.downstream.washedProductKg },
      outputs: { extruded_product_kg: sim.downstream.washedProductKg },
      utilities: { coolant_inlet_C: -4, coolant_outlet_C: -3, cooling_kwh: sim.energy.extrusionCoolKwh },
      equations: [
        `Q_extrusion = product_kg * 4.184 * (4 - 10.8) / 3600`,
        `extruded_product_kg = washed_product_kg`,
        `thermal_load_removed = ${fmt(sim.energy.extrusionCoolKwh, 2)} kWh`,
        `coolant_sensible_heat = coolant_kg * 4.184 * (-3 - -4) / 3600`,
        `additives = 0 kg in current paper model`,
      ],
    },
    {
      key: "packaging",
      icon: "filler",
      badge: "P-23",
      title: "Packaging",
      unit: "FL-101 filling",
      detail: "1 kg product with 10 g container mass",
      value: `${fmt(sim.downstream.packageUnits, 0)} packs`,
      color: "var(--blue)",
      inputs: { washed_product_kg: sim.downstream.washedProductKg, filled_bulk_product_kg: sim.downstream.filledBulkProductKg, container_kg: sim.downstream.containerKg },
      outputs: { packaged_product_kg: sim.downstream.packagedKg },
      utilities: { packaging_entities: sim.downstream.packageUnits, paper_fill_factor: sim.downstream.paperFillFactor },
      equations: [
        `filled_bulk_product_kg = washed_product_kg * paper_fill_factor = ${fmtKg(sim.downstream.filledBulkProductKg)}`,
        `paper_fill_factor = 2091.69 / 2100.5556 = ${sim.downstream.paperFillFactor.toPrecision(6)}`,
        `entities = filled_bulk_product_kg / 1 kg`,
        `container_kg = entities * 0.01 kg`,
        `packaged_mass = filled_bulk_product + container_mass`,
        `product_yield = packaged_product_kg / medium_kg`,
        `net_mass_out = packaged_product + wastes + CO2`,
        `DS-102 paper reference = 2,091.69 entities and 2,112.61 kg/batch`,
      ],
    },
    ...(sim.timing.closeoutH > 0.01 ? [{
      key: "closeout",
      icon: "release",
      badge: "T-Σ",
      title: "Batch closeout",
      unit: "paper timing reconciliation",
      detail: `${fmt(sim.timing.closeoutH, 2)} h release, transfer lag and plant closeout allowance`,
      value: `${fmt(sim.timing.closeoutH, 2)} h`,
      color: "var(--cyan)",
      inputs: { modeled_process_time_h: sim.timing.modeledH },
      outputs: { reported_process_time_h: sim.totalTimeH },
      utilities: {},
      equations: [
        `process_time = media_prep + seed_train + production + DSP + closeout`,
        `${fmt(sim.totalTimeH, 2)} h = ${fmt(sim.timing.mediaPrepH, 2)} + ${fmt(sim.timing.seedTrainH, 2)} + ${fmt(sim.timing.productionH, 2)} + ${fmt(sim.timing.downstreamH, 2)} + ${fmt(sim.timing.closeoutH, 2)}`,
        `closeout_h = reported_paper_time_h - explicitly_scheduled_operations_h`,
        `explicitly_scheduled_operations_h = ${fmt(sim.timing.modeledH, 2)} h`,
      ],
    }] : []),
    {
      key: "waste",
      icon: "wasteTank",
      badge: "S-154",
      title: "Waste streams",
      unit: "S-156 depleted medium, S-154 wash waste",
      detail: "Depleted medium, impurities, buffer and filtration losses",
      value: fmtKg(sim.downstream.depletedWasteKg + sim.downstream.washWasteKg),
      color: "var(--red)",
      waste: true,
      inputs: { depleted_medium_waste_kg: sim.downstream.depletedWasteKg, wash_waste_kg: sim.downstream.washWasteKg },
      outputs: { total_waste_kg: sim.downstream.depletedWasteKg + sim.downstream.washWasteKg },
      utilities: {},
      equations: [
        `total_waste = depleted_medium_waste + wash_waste`,
        `wash_waste = product_depleted + product_impurities + buffer_in - retained_buffer`,
        `carbon_offgas = CO2_kg = ${fmt(sim.reaction.co2Kg, 1)} kg`,
        `solid_liquid_waste = ${fmt(sim.downstream.depletedWasteKg, 1)} kg + ${fmt(sim.downstream.washWasteKg, 1)} kg`,
        `mass_balance_gap = inputs - outputs; inspect JSON export for stream-level accounting`,
      ],
    },
  ];
}

function n(value) {
  return Number(value);
}

function bounded(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function fmt(value, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtKg(value) {
  if (Math.abs(value) >= 1000) return `${fmt(value, 0)} kg`;
  return `${fmt(value, 1)} kg`;
}

function scientific(value) {
  return Number(value).toExponential(1).replace("+", "");
}

function sensibleHeatKwh(massKg, fromC, toC) {
  return (massKg * cpWater * (toC - fromC)) / 3600;
}

function kgFromGL(concentrationGL, volumeL) {
  return (concentrationGL * volumeL) / 1000;
}

function readParams() {
  return {
    finalVolumeL: n(controls.finalVolume.value),
    peakVcd: n(controls.peakVcd.value),
    doublingTimeH: n(controls.doublingTime.value),
    stageDurationH: n(controls.stageDuration.value),
    cellMassKg: n(controls.cellMass.value) * 1e-12,
    cellMassNg: n(controls.cellMass.value),
    viability: n(controls.viability.value) / 100,
    sterileFraction: n(controls.sterileFraction.value) / 100,
    glucoseGL: n(controls.glucose.value),
    aminoGL: n(controls.aminoAcids.value),
    proteinGL: n(controls.proteins.value),
    recovery: n(controls.recovery.value) / 100,
    washBiomassFraction: n(controls.washFraction.value) / 100,
    bufferVolumeL: n(controls.bufferVolume.value),
    preset: currentPreset,
  };
}

function updateOutputs(p) {
  outputs.finalVolume.textContent = `${fmt(p.finalVolumeL)} L`;
  outputs.peakVcd.textContent = `${scientific(p.peakVcd)} cells/mL`;
  outputs.doublingTime.textContent = `${fmt(p.doublingTimeH)} h`;
  outputs.stageDuration.textContent = `${fmt(p.stageDurationH)} h`;
  outputs.cellMass.textContent = `${fmt(p.cellMassNg, 1)} ng`;
  outputs.viability.textContent = `${fmt(p.viability * 100, 1)}%`;
  outputs.sterileFraction.textContent = `${fmt(p.sterileFraction * 100)}%`;
  outputs.glucose.textContent = `${fmt(p.glucoseGL, 2)} g/L`;
  outputs.aminoAcids.textContent = `${fmt(p.aminoGL, 2)} g/L`;
  outputs.proteins.textContent = `${fmt(p.proteinGL, 2)} g/L`;
  outputs.recovery.textContent = `${fmt(p.recovery * 100, 1)}%`;
  outputs.washFraction.textContent = `${fmt(p.washBiomassFraction * 100)}%`;
  outputs.bufferVolume.textContent = `${fmt(p.bufferVolumeL)} L`;
}

function buildStages(p) {
  const defaultSeedTargets = [
    { id: "SFR-101", name: "Shake flask", type: "Flask", volumeL: 0.1, density: 1e7, specificPower: 3, coolantKgH: 0.04, powerKw: 0.0003 },
    { id: "SFR-102", name: "Shake flask", type: "Flask", volumeL: 1.6, density: 1e7, specificPower: 3, coolantKgH: 0.69, powerKw: 0.0047 },
    { id: "RBS-101", name: "Wave reactor", type: "Wave", volumeL: 25, density: 1e7, specificPower: 3, coolantKgH: 10.78, powerKw: 0.073 },
    { id: "RBS-102", name: "Wave reactor", type: "Wave", volumeL: 250, density: 1e7, specificPower: 3, coolantKgH: 108.13, powerKw: 0.73 },
    { id: "BR-101", name: "Seed STR", type: "STR", volumeL: 2000, density: 1e7, specificPower: 0.5, coolantKgH: 77.12, powerKw: 0.97 },
  ];
  const strOnlyTargets = [
    { id: "BR-101", name: "Seed STR", type: "STR", volumeL: 2, density: 1e7, specificPower: 0.5, coolantKgH: 0.08 },
    { id: "BR-102", name: "Seed STR", type: "STR", volumeL: 20, density: 1e7, specificPower: 0.5, coolantKgH: 0.75 },
    { id: "BR-103", name: "Seed STR", type: "STR", volumeL: 200, density: 1e7, specificPower: 0.5, coolantKgH: 7.5 },
    { id: "BR-104", name: "Seed STR", type: "STR", volumeL: 2000, density: 1e7, specificPower: 0.5, coolantKgH: 77.12 },
  ];
  const seedTargets = p.preset === "str" ? strOnlyTargets : defaultSeedTargets;

  const stages = seedTargets
    .filter((stage) => stage.volumeL < p.finalVolumeL * 0.999)
    .map((stage) => ({ ...stage, isFinal: false }));

  stages.push({
    id: p.preset === "str" ? "BR-105" : p.finalVolumeL === 20000 ? "BR-102" : "BR-Final",
    name: "Production STR",
    type: "STR",
    volumeL: p.finalVolumeL,
    density: p.peakVcd,
    specificPower: 0.5,
    coolantKgH: (748.58 * p.finalVolumeL) / 20000,
    powerKw: (9.69 * p.finalVolumeL) / 20000,
    isFinal: true,
  });

  let startCells = 2e7;
  let previousVolume = 0.002;
  let cumulativeTime = mediaPrepDuration(p);
  return stages.map((stage) => {
    const targetCells = stage.volumeL * 1000 * stage.density;
    const possibleCells = startCells * Math.pow(2, p.stageDurationH / p.doublingTimeH);
    const endCells = Math.min(targetCells, possibleCells);
    const doublings = Math.log2(endCells / startCells);
    const mediumAdditionL = Math.max(stage.volumeL - previousVolume, 0);
    const powerKw = stage.powerKw ?? stage.specificPower * (stage.volumeL / 1000);
    const startTimeH = cumulativeTime;
    const endTimeH = cumulativeTime + p.stageDurationH;
    const result = {
      ...stage,
      startCells,
      targetCells,
      endCells,
      doublings,
      mediumAdditionL,
      startTimeH,
      endTimeH,
      durationH: p.stageDurationH,
      powerKw,
      agitationKwh: powerKw * p.stageDurationH,
      mediumWarmKwh: Math.abs(sensibleHeatKwh(mediumAdditionL, 4, 37)),
      transferOut: stage.isFinal
        ? { flowLh: 4000, durationH: stage.volumeL / 4000 }
        : { flowLmin: stage.volumeL, durationMin: 1 },
    };
    startCells = endCells;
    previousVolume = stage.volumeL;
    cumulativeTime = endTimeH;
    return result;
  });
}

function mediaPrepDuration(p) {
  const fraction = p.sterileFraction;
  return 9.17 + ((0.9 - fraction) / 0.4) * 0.67;
}

function downstreamDurationH() {
  return Object.values(downstreamDurationsH).reduce((sum, value) => sum + value, 0);
}

function referenceCloseoutDurationH(p) {
  const downstreamH = downstreamDurationH();
  if (currentPreset === "local") {
    return Math.max(pythonBaseline.localProcessCompleteH - (mediaPrepDuration({ sterileFraction: 0.9 }) + 5 * 120 + downstreamH), 0);
  }
  if (currentPreset === "heat" || Math.abs(p.sterileFraction - 0.5) < 0.005) {
    return Math.max(pythonBaseline.processCompleteH5050 - (mediaPrepDuration({ sterileFraction: 0.5 }) + 6 * 120 + downstreamH), 0);
  }
  if (currentPreset === "main") {
    return Math.max(pythonBaseline.processCompleteH - (mediaPrepDuration({ sterileFraction: 0.9 }) + 6 * 120 + downstreamH), 0);
  }
  return 0;
}

function timingBreakdown(p, stages, totalTimeH) {
  const mediaPrepH = mediaPrepDuration(p);
  const seedTrainH = stages.slice(0, -1).reduce((sum, stage) => sum + stage.durationH, 0);
  const productionH = stages[stages.length - 1]?.durationH || 0;
  const downstreamH = downstreamDurationH();
  const modeledH = mediaPrepH + seedTrainH + productionH + downstreamH;
  const closeoutH = Math.max(totalTimeH - modeledH, 0);
  const sumH = modeledH + closeoutH;
  const downstreamStartH = stages[stages.length - 1]?.endTimeH || mediaPrepH;
  const segments = [
    { key: "media", label: "Media prep", startH: 0, endH: mediaPrepH, color: ciPalette.media },
  ];
  if (seedTrainH > 0) {
    segments.push({ key: "seed", label: "Seed train", startH: mediaPrepH, endH: mediaPrepH + seedTrainH, color: ciPalette.cells });
  }
  segments.push({ key: "production", label: "Production STR", startH: mediaPrepH + seedTrainH, endH: downstreamStartH, color: ciPalette.production });
  let cursor = downstreamStartH;
  Object.entries(downstreamDurationsH).forEach(([key, durationH]) => {
    segments.push({
      key,
      label: key === "clarification" ? "Clarification" : key[0].toUpperCase() + key.slice(1),
      startH: cursor,
      endH: cursor + durationH,
      color: key === "packaging" ? ciPalette.product : ciPalette.energy,
    });
    cursor += durationH;
  });
  if (closeoutH > 0.01) {
    segments.push({ key: "closeout", label: "Batch closeout", startH: cursor, endH: totalTimeH, color: "#2ca9b7" });
  }
  return {
    mediaPrepH,
    seedTrainH,
    productionH,
    downstreamH,
    closeoutH,
    modeledH,
    sumH,
    totalTimeH,
    addsUp: Math.abs(sumH - totalTimeH) < 0.01,
    downstreamStartH,
    downstreamEndH: downstreamStartH + downstreamH,
    segments,
  };
}

function paperUtilityDemands(p) {
  const scale = p.finalVolumeL / 20000;
  const steam = (currentPreset === "heat" || Math.abs(p.sterileFraction - 0.5) < 0.005) ? 216.53 : pythonBaseline.steamKg;
  return {
    steamKg: steam * scale,
    chilledWaterKg: pythonBaseline.chilledWaterKg * scale,
    syntheticAirKg: pythonBaseline.syntheticAirKg * scale,
    awsKg: pythonBaseline.awsKg * scale,
    cwsKg: pythonBaseline.cwsKg * scale,
    swsKg: pythonBaseline.swsKg * scale,
  };
}

function simulate() {
  const p = readParams();
  updateOutputs(p);
  const stages = buildStages(p);
  const finalStage = stages[stages.length - 1];
  const achievedDensity = finalStage.endCells / (p.finalVolumeL * 1000);
  const biomassKg = finalStage.endCells * p.cellMassKg * p.viability;
  const biomassScale = biomassKg / 1990;

  const components = {
    aminoAcids: kgFromGL(p.aminoGL, p.finalVolumeL),
    glucose: kgFromGL(p.glucoseGL, p.finalVolumeL),
    igf1: kgFromGL(baselineComposition.growthFactorIgf1, p.finalVolumeL),
    proteins: kgFromGL(p.proteinGL, p.finalVolumeL),
    salts: kgFromGL(baselineComposition.salts, p.finalVolumeL),
    traceElements: kgFromGL(baselineComposition.traceElements, p.finalVolumeL),
    vitamins: kgFromGL(baselineComposition.vitamins, p.finalVolumeL),
  };
  const solidsKg = Object.values(components).reduce((sum, value) => sum + value, 0);
  const mediumKg = p.finalVolumeL * mediumDensityKgL;
  const waterKg = Math.max(mediumKg - solidsKg, 0);
  const sterileVolumeL = p.finalVolumeL * p.sterileFraction;
  const heatVolumeL = p.finalVolumeL - sterileVolumeL;
  const sensitiveKg = components.igf1 + components.proteins + components.vitamins;
  const impurityChallengeKg = sensitiveKg * 0.001;

  const mixedTemperatureC = 26 + ((0.9 - p.sterileFraction) / 0.4) * 4;
  const mediaHeatKwh = Math.abs(sensibleHeatKwh(heatVolumeL, 25, 121));
  const mediaCoolKwh = Math.abs(sensibleHeatKwh(heatVolumeL, 121, 35));
  const storageCoolKwh = Math.abs(sensibleHeatKwh(mediumKg, mixedTemperatureC, 4));
  const mediaPrepKwh = mediaHeatKwh + mediaCoolKwh + storageCoolKwh;

  const impuritiesKg = biomassKg * (1000 / 1990);
  const depletedMediumKg = biomassKg * (15930 / 1990);
  const cultureMassKg = biomassKg + depletedMediumKg + impuritiesKg;
  const oxygenKg = biomassKg * 0.5;
  const co2Kg = biomassKg;

  const productBiomassKg = biomassKg * p.recovery;
  const productImpurityKg = impuritiesKg * 0.05;
  const productMassAfterCentrifuge = productBiomassKg / 0.3839;
  const productDepletedKg = Math.max(productMassAfterCentrifuge - productBiomassKg - productImpurityKg, 0);
  const depletedWasteKg = Math.max(depletedMediumKg - productDepletedKg, 0);
  const centrifugeWasteKg = Math.max(cultureMassKg - productMassAfterCentrifuge, 0);
  const retainedBufferKg = productBiomassKg * (1 - p.washBiomassFraction) / p.washBiomassFraction;
  const washedProductKg = productBiomassKg + retainedBufferKg;
  const washWasteKg = productDepletedKg + productImpurityKg + p.bufferVolumeL - retainedBufferKg;
  const filledBulkProductKg = washedProductKg * paperFillFactor;
  const packageUnits = filledBulkProductKg;
  const containerKg = packageUnits * 0.01;
  const packagedKg = filledBulkProductKg + containerKg;
  const fillingCalibrationKg = filledBulkProductKg - washedProductKg;

  const seedAgitationKwh = stages.slice(0, -1).reduce((sum, stage) => sum + stage.agitationKwh, 0);
  const productionAgitationKwh = finalStage.agitationKwh;
  const downstreamInitialCoolKwh = Math.abs(sensibleHeatKwh(cultureMassKg, 37, 25));
  const centrifugeCoolKwh = Math.abs(sensibleHeatKwh(productMassAfterCentrifuge, 25, 15));
  const washThermalKwh = Math.abs(sensibleHeatKwh(p.bufferVolumeL, 4, 10.8));
  const extrusionCoolKwh = Math.abs(sensibleHeatKwh(washedProductKg, 10.8, 4));
  const totalEnergyKwh = mediaPrepKwh + seedAgitationKwh + productionAgitationKwh + Math.abs(downstreamInitialCoolKwh) + Math.abs(centrifugeCoolKwh) + Math.abs(washThermalKwh) + Math.abs(extrusionCoolKwh);
  const downstreamTimeH = downstreamDurationH();
  const kineticTotalTimeH = finalStage.endTimeH + downstreamTimeH;
  const totalTimeH = kineticTotalTimeH + referenceCloseoutDurationH(p);
  const timing = timingBreakdown(p, stages, totalTimeH);
  const reportedUtilities = paperUtilityDemands(p);

  const timeline = buildTimeline(stages, {
    mediaPrepKwh,
    seedAgitationKwh,
    productionAgitationKwh,
    downstreamInitialCoolKwh,
    centrifugeCoolKwh,
    washThermalKwh,
    extrusionCoolKwh,
    totalTimeH,
    biomassKg,
    timing,
    mediumKg,
    oxygenKg,
    co2Kg,
    bufferKg: p.bufferVolumeL,
    utilityWaterKg:
      (reportedUtilities.chilledWaterKg || 0) +
      (reportedUtilities.cwsKg || 0) +
      (reportedUtilities.awsKg || 0) +
      (reportedUtilities.swsKg || 0) +
      p.bufferVolumeL,
  }, p);

  return {
    params: p,
    stages,
    finalStage,
    achievedDensity,
    medium: {
      components,
      solidsKg,
      waterKg,
      mediumKg,
      sterileVolumeL,
      heatVolumeL,
      impurityChallengeKg,
      firstFilterRemovedKg: impurityChallengeKg * 0.8,
      secondFilterRemovedKg: impurityChallengeKg * 0.2,
      remainingImpuritiesKg: 0,
    },
    reaction: {
      biomassKg,
      impuritiesKg,
      depletedMediumKg,
      oxygenKg,
      co2Kg,
      cultureMassKg,
    },
    downstream: {
      productBiomassKg,
      productImpurityKg,
      productDepletedKg,
      productMassAfterCentrifuge,
      depletedWasteKg,
      centrifugeWasteKg,
      retainedBufferKg,
      washedProductKg,
      filledBulkProductKg,
      washWasteKg,
      packageUnits,
      containerKg,
      packagedKg,
      fillingCalibrationKg,
      paperFillFactor,
    },
    energy: {
      mediaHeatKwh,
      mediaCoolKwh,
      storageCoolKwh,
      mediaPrepKwh,
      seedAgitationKwh,
      productionAgitationKwh,
      downstreamInitialCoolKwh,
      centrifugeCoolKwh,
      washThermalKwh,
      extrusionCoolKwh,
      totalEnergyKwh,
    },
    utility: {
      ...reportedUtilities,
      estimatedSteamKg: (mediaHeatKwh * 3600) / 2110,
      estimatedCoolingWaterKg: (mediaCoolKwh * 3600) / (cpWater * 5),
      estimatedChilledWaterKg: ((Math.abs(storageCoolKwh) + Math.abs(downstreamInitialCoolKwh) + Math.abs(centrifugeCoolKwh) + Math.abs(extrusionCoolKwh)) * 3600) / (cpWater * 5),
    },
    timeline,
    totalTimeH,
    timing,
  };
}

function buildTimeline(stages, energy, params) {
  const finalCells = stages[stages.length - 1]?.endCells || 1;
  const totalEnergyKwh = Math.max(energy.totalEnergyKwh || energy.mediaPrepKwh, 1);
  const downstreamStart = stages[stages.length - 1].endTimeH;
  const downstreamH = Math.max(energy.timing?.downstreamH || downstreamDurationH(), 0.001);
  const makePoint = (t, cells, biomass, cumulativeEnergy, stage) => {
    const mediaFraction = bounded(t / Math.max(energy.timing?.mediaPrepH || mediaPrepDuration(params), 0.001));
    const biologyFraction = bounded(cells / finalCells);
    const downstreamFraction = bounded((t - downstreamStart) / downstreamH);
    const energyFraction = bounded(cumulativeEnergy / totalEnergyKwh);
    return {
      t,
      cells,
      biomass,
      energy: cumulativeEnergy,
      medium: (energy.mediumKg || 0) * mediaFraction,
      oxygen: (energy.oxygenKg || 0) * biologyFraction,
      co2: (energy.co2Kg || 0) * biologyFraction,
      utilityWater: (energy.utilityWaterKg || 0) * bounded(energyFraction * 0.76 + downstreamFraction * 0.24),
      stage,
    };
  };
  const points = [makePoint(0, 0, 0, 0, "Media prep")];
  points.push(makePoint(stages[0].startTimeH, stages[0].startCells, 0, energy.mediaPrepKwh, "Media prep"));
  let cumulativeEnergy = energy.mediaPrepKwh;
  stages.forEach((stage) => {
    for (let i = 0; i <= 12; i += 1) {
      const f = i / 12;
      const t = stage.startTimeH + f * stage.durationH;
      const possible = stage.startCells * Math.pow(2, (f * stage.durationH) / params.doublingTimeH);
      const cells = Math.min(stage.endCells, possible);
      const biomass = cells * params.cellMassKg * params.viability;
      const stageEnergy = stage.agitationKwh * f;
      points.push(makePoint(
        t,
        cells,
        biomass,
        cumulativeEnergy + stageEnergy,
        stage.id,
      ));
    }
    cumulativeEnergy += stage.agitationKwh;
  });
  const downstreamEnergy = energy.downstreamInitialCoolKwh + energy.centrifugeCoolKwh + energy.washThermalKwh + energy.extrusionCoolKwh;
  const segmentEnergy = {
    clarification: energy.downstreamInitialCoolKwh + energy.centrifugeCoolKwh,
    washing: energy.washThermalKwh,
    extrusion: energy.extrusionCoolKwh,
    packaging: 0,
  };
  let downstreamCursor = downstreamStart;
  let cumulativeDownstreamEnergy = cumulativeEnergy;
  Object.entries(downstreamDurationsH).forEach(([key, durationH]) => {
    downstreamCursor += durationH;
    cumulativeDownstreamEnergy += segmentEnergy[key] || 0;
    points.push(makePoint(
      Math.min(downstreamCursor, energy.totalTimeH),
      stages[stages.length - 1].endCells,
      energy.biomassKg,
      cumulativeDownstreamEnergy,
      key === "clarification" ? "Clarification" : key[0].toUpperCase() + key.slice(1),
    ));
  });
  if (energy.totalTimeH > downstreamCursor) {
    points.push(makePoint(
      energy.totalTimeH,
      stages[stages.length - 1].endCells,
      energy.biomassKg,
      cumulativeEnergy + downstreamEnergy,
      "Batch closeout",
    ));
  }
  return points.sort((a, b) => a.t - b.t);
}

function equations(sim) {
  const p = sim.params;
  return [
    {
      title: "Reaction 1: artificial medium",
      expression: `${fmt(sim.medium.components.aminoAcids, 4)} Amino Acids + ${fmt(sim.medium.components.glucose, 4)} Glucose + ${fmt(sim.medium.components.igf1, 4)} IGF-1 + ${fmt(sim.medium.components.proteins, 4)} Proteins + ${fmt(sim.medium.components.salts, 4)} Salts + ${fmt(sim.medium.components.traceElements, 4)} Trace Elements + ${fmt(sim.medium.components.vitamins, 4)} Vitamins + ${fmt(sim.medium.waterKg, 4)} Water -> ${fmt(sim.medium.mediumKg, 4)} Medium`,
    },
    {
      title: "Reaction 2: fermentation pseudo-stoichiometry",
      expression: "100 Medium + 5 O2 -> 5 Impurities + 10 Biomass + 10 CO2 + 80 Depleted Medium",
    },
    {
      title: "Cell growth",
      expression: `end_cells = min(target_cells, start_cells * 2^(stage_duration / doubling_time)); current doubling time = ${fmt(p.doublingTimeH)} h`,
    },
    {
      title: "Biomass",
      expression: `biomass_kg = cells * cell_mass_kg * viability = ${fmtKg(sim.reaction.biomassKg)}`,
    },
    {
      title: "Sensible heat",
      expression: "Q_kWh = mass_kg * 4.184 kJ/kg/K * delta_T_K / 3600",
    },
    {
      title: "Steam estimate",
      expression: `steam_kg = abs(Q_kWh) * 3600 / 2110 = ${fmt(sim.utility.steamKg, 1)} kg`,
    },
    {
      title: "Centrifugation",
      expression: `product_biomass = biomass * recovery = ${fmtKg(sim.downstream.productBiomassKg)}`,
    },
    {
      title: "Washing",
      expression: `buffer_retained = biomass * (1 - ${fmt(p.washBiomassFraction, 2)}) / ${fmt(p.washBiomassFraction, 2)} = ${fmtKg(sim.downstream.retainedBufferKg)}`,
    },
    {
      title: "Packaging",
      expression: `filled_bulk_product_kg = washed_product_kg * paper_fill_factor; entities = filled_bulk_product_kg / 1 kg; container_kg = entities * 0.01 = ${fmtKg(sim.downstream.containerKg)}`,
    },
    {
      title: "Overall mass checkpoint",
      expression: `main_inputs = medium + O2 + buffer + containers = ${fmtKg(sim.medium.mediumKg + sim.reaction.oxygenKg + sim.params.bufferVolumeL + sim.downstream.containerKg)}`,
    },
    {
      title: "Overall output checkpoint",
      expression: `main_outputs = packaged product + depleted waste + wash waste + CO2 = ${fmtKg(sim.downstream.packagedKg + sim.downstream.depletedWasteKg + sim.downstream.washWasteKg + sim.reaction.co2Kg)}`,
    },
    {
      title: "Energy total",
      expression: `E_total = E_media + E_seed + E_production + E_DSP = ${fmt(sim.energy.totalEnergyKwh, 1)} kWh`,
    },
    {
      title: "Process time balance",
      expression: `T_total = media_prep + seed_train + production + downstream + closeout = ${fmt(sim.timing.mediaPrepH, 2)} + ${fmt(sim.timing.seedTrainH, 2)} + ${fmt(sim.timing.productionH, 2)} + ${fmt(sim.timing.downstreamH, 2)} + ${fmt(sim.timing.closeoutH, 2)} = ${fmt(sim.timing.sumH, 2)} h`,
    },
  ];
}

function allEquationEntries(sim) {
  const stepEquations = processStepCatalog(sim).flatMap((step) =>
    step.equations.map((expression, index) => ({
      title: `${step.badge} ${step.title} ${index + 1}`,
      expression,
    })),
  );
  return equations(sim).concat(stepEquations);
}

function render() {
  simulation = simulate();
  const sim = simulation;
  const maxTime = Math.ceil(sim.totalTimeH);
  controls.timeSlider.max = maxTime;
  if (n(controls.timeSlider.value) > maxTime) controls.timeSlider.value = maxTime;
  const currentTime = n(controls.timeSlider.value);
  outputs.time.textContent = `${fmt(currentTime, 1)} h`;
  document.getElementById("scenarioTitle").textContent = "Bioprocess facility model";
  document.getElementById("factoryStatus").textContent = `${currentPhaseLabel(sim, currentTime)} · ${fmt(currentTime, 1)} h`;
  if (downloadScenarioSelect && downloadScenarioSelect.value !== currentPreset) {
    downloadScenarioSelect.value = currentPreset;
  }

  document.getElementById("packagedMass").textContent = fmtKg(sim.downstream.packagedKg);
  document.getElementById("biomassMass").textContent = fmtKg(sim.reaction.biomassKg);
  document.getElementById("totalTime").textContent = `${fmt(sim.totalTimeH, 1)} h`;
  document.getElementById("energyTotal").textContent = `${fmt(sim.energy.totalEnergyKwh, 0)} kWh`;
  document.getElementById("mediumDemand").textContent = fmtKg(sim.medium.mediumKg);
  document.getElementById("stepCount").textContent = `${processStepCatalog(sim).length} steps`;
  const elapsed = currentTime;
  const remaining = Math.max(sim.totalTimeH - elapsed, 0);
  document.getElementById("timeDetail").textContent = `${fmt(elapsed, 1)} h elapsed · ${fmt(remaining, 1)} h remaining · active: ${currentPhaseLabel(sim, elapsed)}`;
  document.getElementById("playExplanation").textContent = isPlaying
    ? `Playing at ${playSpeedHoursPerSecond} process-hours per second; this run stops at ${fmt(sim.totalTimeH, 1)} h.`
    : `Play advances the process clock at ${playSpeedHoursPerSecond} process-hours per second. Drag the slider for an exact time.`;

  renderUtilityRail(sim);
  renderProcessDiagram(sim, currentTime);
  renderStreams(sim);
  renderTimingBalance(sim);
  renderEquations(sim);
  renderStageCards(sim);
  renderReferenceAssets();
  renderPlantInsights(sim);
  renderFactoryMap(sim, currentTime);
  renderUnitInspector(sim);
  renderReferenceValues(sim);
  renderExportCenter(sim);
  drawProcess(sim, currentTime);
  drawTimeline(sim, currentTime);
}

function plantInsights(sim) {
  const timingSegments = [
    ["Media prep", sim.timing.mediaPrepH],
    ["Seed train", sim.timing.seedTrainH],
    ["Production", sim.timing.productionH],
    ["Downstream", sim.timing.downstreamH],
    ["Closeout", sim.timing.closeoutH],
  ];
  const bottleneck = timingSegments.reduce((max, item) => item[1] > max[1] ? item : max, timingSegments[0]);
  const packagedKg = Math.max(sim.downstream.packagedKg, 1);
  const cadenceKgDay = sim.downstream.packagedKg / Math.max(sim.totalTimeH / 24, 0.001);
  const energyIntensity = sim.energy.totalEnergyKwh / packagedKg;
  const mediumIntensity = sim.medium.mediumKg / packagedKg;
  const biomassYield = sim.downstream.packagedKg / Math.max(sim.medium.mediumKg + sim.params.bufferVolumeL, 1);
  const utilityWaterKg =
    (sim.utility.chilledWaterKg || 0) +
    (sim.utility.estimatedCoolingWaterKg || 0) +
    (sim.utility.cwsKg || 0) +
    (sim.utility.awsKg || 0) +
    (sim.utility.swsKg || 0) +
    (sim.utility.processWaterKg || 0) +
    sim.params.bufferVolumeL;
  return [
    {
      key: "cadence",
      label: "Daily output",
      value: `${fmt(cadenceKgDay, 0)} kg/day`,
      detail: `${fmt(sim.totalTimeH, 1)} h batch cycle`,
      status: "steady",
    },
    {
      key: "bottleneck",
      label: "Bottleneck",
      value: bottleneck[0],
      detail: `${fmt(bottleneck[1], 1)} h critical path`,
      status: bottleneck[0] === "Production" ? "critical" : "steady",
    },
    {
      key: "intensity",
      label: "Energy intensity",
      value: `${fmt(energyIntensity, 2)} kWh/kg`,
      detail: `${fmt(mediumIntensity, 1)} kg medium/kg product`,
      status: energyIntensity > 2 ? "watch" : "steady",
    },
    {
      key: "utilities",
      label: "Utility envelope",
      value: `${fmt(utilityWaterKg / 1000, 1)} t water`,
      detail: `${fmt(sim.utility.steamKg || 0, 0)} kg steam / batch`,
      status: "watch",
    },
    {
      key: "yield",
      label: "Process yield",
      value: `${fmt(biomassYield * 100, 1)}%`,
      detail: `${fmt(sim.downstream.packagedKg, 0)} kg packaged / batch`,
      status: biomassYield > 0.08 ? "steady" : "watch",
    },
  ];
}

function renderPlantInsights(sim) {
  const target = document.getElementById("plantInsightStrip");
  if (!target) return;
  target.innerHTML = plantInsights(sim).map((item) => `
    <article class="plant-insight-card ${item.status}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.detail)}</small>
    </article>
  `).join("");
}

function currentPhase(sim, currentTime) {
  if (currentTime >= sim.totalTimeH) return "complete";
  if (currentTime <= sim.timing.mediaPrepH) return "media";
  const activeStage = sim.stages.find((stage) => currentTime >= stage.startTimeH && currentTime <= stage.endTimeH);
  if (activeStage) return activeStage.isFinal ? "production" : "seed";
  const dspStart = sim.finalStage.endTimeH;
  const elapsed = currentTime - dspStart;
  if (elapsed < downstreamDurationsH.clarification) return "clarification";
  if (elapsed < downstreamDurationsH.clarification + downstreamDurationsH.washing) return "washing";
  if (elapsed < downstreamDurationsH.clarification + downstreamDurationsH.washing + downstreamDurationsH.extrusion) return "extrusion";
  if (elapsed < sim.timing.downstreamH) return "packaging";
  if (currentTime < sim.totalTimeH) return "closeout";
  return "complete";
}

function currentPhaseLabel(sim, currentTime) {
  if (currentTime >= sim.totalTimeH) return "Process complete";
  if (currentTime <= sim.timing.mediaPrepH) return "Media prep";
  const activeStage = sim.stages.find((stage) => currentTime >= stage.startTimeH && currentTime <= stage.endTimeH);
  if (activeStage) return `${activeStage.id} ${activeStage.isFinal ? "production STR" : "seed expansion"}`;
  const phase = currentPhase(sim, currentTime);
  const labels = {
    clarification: "P-17 clarification",
    washing: "P-21 washing",
    extrusion: "P-22 extrusion",
    packaging: "P-23 packaging",
    closeout: "Batch closeout",
    complete: "Process complete",
  };
  return labels[phase] || "Process complete";
}

function renderUtilityRail(sim) {
  const items = [
    ["Steam", `${fmt(sim.utility.steamKg, 0)} kg`],
    ["Chilled water", `${fmt(sim.utility.chilledWaterKg, 0)} kg`],
    ["Synthetic air", `${fmt(sim.utility.syntheticAirKg, 0)} kg`],
    ["CIP water", `${fmt(sim.utility.awsKg + sim.utility.cwsKg + sim.utility.swsKg, 0)} kg`],
  ];
  utilityRail.innerHTML = items.map(([label, value]) => `
    <div class="utility-pill">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderProcessDiagram(sim, currentTime) {
  const phase = currentPhase(sim, currentTime);
  const nodes = processStepCatalog(sim);

  processDiagram.innerHTML = `
    <div class="diagram-grid">
      ${nodes.map((node, index) => `
        <article class="process-node ${node.key === phase ? "active" : ""} ${node.waste ? "waste break" : ""} ${index === 3 ? "break" : ""}" style="--node-color:${node.color}" data-export-scope="node-${node.key}" ${tooltipAttrs(stepTooltip(node).title, stepTooltip(node).body, stepTooltip(node).meta)}>
          <div class="node-top">
            <span class="node-index">${iconSvg(node.icon)}</span>
            <span class="node-badge">${node.badge}</span>
          </div>
          <div>
            <h4>${node.title}</h4>
            <p>${node.unit}</p>
          </div>
          <div class="node-value">${node.value}</div>
          ${index < nodes.length - 2 ? '<span class="node-arrow"></span>' : ""}
        </article>
      `).join("")}
    </div>
    <div class="side-stream">
      <div class="stream-chip"><span>O2 in</span><strong>${fmtKg(sim.reaction.oxygenKg)}</strong></div>
      <div class="stream-chip"><span>CO2 out</span><strong>${fmtKg(sim.reaction.co2Kg)}</strong></div>
      <div class="stream-chip"><span>Depleted medium</span><strong>${fmtKg(sim.downstream.depletedWasteKg)}</strong></div>
      <div class="stream-chip"><span>Final product</span><strong>${fmtKg(sim.downstream.packagedKg)}</strong></div>
    </div>
  `;
}

function renderStreams(sim) {
  const rows = [
    ["Medium feed", sim.medium.mediumKg, 0],
    ["O2 / synthetic air", sim.reaction.oxygenKg, 0],
    ["Wash buffer", sim.params.bufferVolumeL, 0],
    ["Biomass", 0, sim.reaction.biomassKg],
    ["Packaged product", 0, sim.downstream.packagedKg],
    ["Total waste", 0, sim.downstream.depletedWasteKg + sim.downstream.washWasteKg + sim.reaction.co2Kg],
  ];
  document.getElementById("streamTable").innerHTML = rows
    .map(([name, input, output]) => `<tr><td>${name}</td><td>${input ? fmt(input, 1) : ""}</td><td>${output ? fmt(output, 1) : ""}</td></tr>`)
    .join("");
}

function renderTimingBalance(sim) {
  const target = document.getElementById("timeBalanceStrip");
  if (!target) return;
  const rows = [
    ["Media prep", sim.timing.mediaPrepH],
    ["Seed train", sim.timing.seedTrainH],
    ["Production", sim.timing.productionH],
    ["DSP", sim.timing.downstreamH],
    ["Closeout", sim.timing.closeoutH],
    ["Total", sim.timing.sumH],
  ];
  target.innerHTML = rows.map(([label, value]) => `
    <div class="${label === "Total" ? "total" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${fmt(value, label === "Total" ? 2 : 2)} h</strong>
    </div>
  `).join("");
}

function renderEquations(sim) {
  document.getElementById("equationList").innerHTML = allEquationEntries(sim)
    .map((item) => `<div class="equation"><strong>${item.title}</strong><code>${item.expression}</code></div>`)
    .join("");
}

function renderReferenceAssets() {
  const target = document.getElementById("referenceAssets");
  if (!target) return;
  if (activeView !== "exports") {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = referenceAssets
    .map((asset) => {
      const label = asset.split("/").pop().replace(".png", "");
      return `
        <a class="reference-tile reference-download" href="${asset}" download data-export-scope="references">
          <span class="button-icon">↓</span>
          <strong>${escapeHtml(label)}</strong>
          <small>PNG reference file</small>
        </a>
      `;
    })
    .join("");
}

function deviceCatalog(sim) {
  const stepByKey = Object.fromEntries(processStepCatalog(sim).map((step) => [step.key, step]));
  const commonPhysical = { pressure_bar: 1.013, material_model: "water-like broth/media", cp_kj_kg_K: cpWater };
  return [
    { key: "v101", id: "V-101", title: "Sensitive media blend", stepKey: "media", icon: "mediaBlend", x: 112, y: 138, type: "blend tank", value: `${fmt(sim.medium.sterileVolumeL)} L`, properties: { volume_L: sim.medium.sterileVolumeL, temperature_C: 25, mixing_min: 60, specific_power_kw_m3: 0.1, ...commonPhysical } },
    { key: "de102", id: "DE-102", title: "Sterile filter 1", stepKey: "media", icon: "sterileFilter", x: 288, y: 138, type: "dead-end filter", value: `${fmt(sim.medium.firstFilterRemovedKg, 3)} kg removed`, properties: { filter_area_m2: 20, flux_L_m2_h: 250, removal_fraction: 0.8 } },
    { key: "v102", id: "V-102", title: "Heat-stable media blend", stepKey: "media", icon: "mediaBlend", x: 112, y: 292, type: "blend tank", value: `${fmt(sim.medium.heatVolumeL)} L`, properties: { volume_L: sim.medium.heatVolumeL, temperature_C: 25, mixing_min: 60, specific_power_kw_m3: 0.1, ...commonPhysical } },
    { key: "st101", id: "ST-101", title: "Heat sterilizer", stepKey: "media", icon: "heatSterilizer", x: 288, y: 292, type: "sterilizer", value: `${fmt(sim.energy.mediaHeatKwh, 1)} kWh`, properties: { inlet_C: 25, sterilization_C: 121, outlet_C: 35, steam_kg_reported: sim.utility.steamKg, steam_kg_estimated: sim.utility.estimatedSteamKg } },
    { key: "de101", id: "DE-101", title: "Sterile filter 2", stepKey: "media", icon: "sterileFilter", x: 464, y: 138, type: "polishing filter", value: `${fmt(sim.medium.secondFilterRemovedKg, 3)} kg removed`, properties: { removal_fraction: 1.0, impurities_remaining_kg: 0 } },
    { key: "mx101", id: "MX-101", title: "Medium mixer", stepKey: "media", icon: "mixer", x: 660, y: 214, type: "static mixer", value: fmtKg(sim.medium.mediumKg), properties: { reaction: "Reaction 1", output_medium_kg: sim.medium.mediumKg, water_kg: sim.medium.waterKg, solids_kg: sim.medium.solidsKg } },
    { key: "v110", id: "V-110", title: "Cold medium store", stepKey: "media", icon: "coldStore", x: 842, y: 214, type: "storage tank", value: "4 C", properties: { storage_temperature_C: 4, storage_cooling_kwh: sim.energy.storageCoolKwh, chilled_water_kg_reported: sim.utility.chilledWaterKg } },
    { key: "sfr101", id: "SFR-101", title: "Shake flask 0.1 L", stepKey: "seed", icon: "flask", x: 112, y: 458, type: "shake flask", value: scientific(sim.stages[0]?.endCells || 0), properties: stageProperties(sim.stages[0]) },
    { key: "sfr102", id: "SFR-102", title: "Shake flask 1.6 L", stepKey: "seed", icon: "flask", x: 288, y: 458, type: "shake flask", value: scientific(sim.stages[1]?.endCells || 0), properties: stageProperties(sim.stages[1]) },
    { key: "rbs101", id: "RBS-101", title: "Wave reactor 25 L", stepKey: "seed", icon: "wave", x: 464, y: 458, type: "wave bioreactor", value: scientific(sim.stages[2]?.endCells || 0), properties: stageProperties(sim.stages[2]) },
    { key: "rbs102", id: "RBS-102", title: "Wave reactor 250 L", stepKey: "seed", icon: "wave", x: 640, y: 458, type: "wave bioreactor", value: scientific(sim.stages[3]?.endCells || 0), properties: stageProperties(sim.stages[3]) },
    { key: "br101", id: "BR-101", title: "Seed STR 2,000 L", stepKey: "seed", icon: "seedReactor", x: 816, y: 458, type: "seed STR", value: scientific(sim.stages[4]?.endCells || 0), properties: stageProperties(sim.stages[4]) },
    { key: "br102", id: sim.finalStage.id, title: "Production STR", stepKey: "production", icon: "productionReactor", x: 1046, y: 458, type: "production STR", value: fmtKg(sim.reaction.biomassKg), properties: { working_volume_L: sim.params.finalVolumeL, density_cells_ml: sim.achievedDensity, power_kw: sim.finalStage.powerKw, culture_duration_h: sim.params.stageDurationH, temperature_C: 37, oxygen_kg: sim.reaction.oxygenKg, co2_kg: sim.reaction.co2Kg } },
    { key: "pm103", id: "PM-103", title: "Broth transfer pump", stepKey: "clarification", icon: "pump", x: 112, y: 672, type: "pump", value: "4,000 L/h", properties: { flow_L_h: 4000, pressure_increase_bar: 1 } },
    { key: "hx101", id: "HX-101", title: "Broth cooler", stepKey: "clarification", icon: "exchanger", x: 288, y: 672, type: "heat exchanger", value: `${fmt(sim.energy.downstreamInitialCoolKwh, 1)} kWh`, properties: { inlet_C: 37, outlet_C: 25, cooling_kwh: sim.energy.downstreamInitialCoolKwh } },
    { key: "ds101", id: "DS-101", title: "Disk-stack centrifuge", stepKey: "clarification", icon: "centrifuge", x: 464, y: 672, type: "centrifuge", value: fmtKg(sim.downstream.productMassAfterCentrifuge), properties: { recovery: sim.params.recovery, power_kw: 35.64, heat_dissipation_fraction: 0.25, product_biomass_fraction: 0.3839 } },
    { key: "de103", id: "DE-103", title: "Waste sterile filter", stepKey: "waste", icon: "wasteFilter", x: 660, y: 822, type: "waste filter", value: fmtKg(sim.downstream.depletedWasteKg), properties: { filter_area_m2: 20, cartridges: 2 } },
    { key: "v103", id: "V-103", title: "Depleted medium store", stepKey: "waste", icon: "wasteTank", x: 842, y: 822, type: "waste tank", value: fmtKg(sim.downstream.depletedWasteKg), properties: { storage_tank_volume_L: 14402.33, stream_id: "S-156" } },
    { key: "wsh101", id: "WSH-101", title: "Biomass washer", stepKey: "washing", icon: "washer", x: 660, y: 672, type: "washer", value: fmtKg(sim.downstream.washedProductKg), properties: { buffer_volume_L: sim.params.bufferVolumeL, target_biomass_fraction: sim.params.washBiomassFraction, thermal_mixing_kwh: sim.energy.washThermalKwh } },
    { key: "xd101", id: "XD-101", title: "Extruder", stepKey: "extrusion", icon: "extruder", x: 842, y: 672, type: "extruder", value: `${fmt(sim.energy.extrusionCoolKwh, 1)} kWh`, properties: { screw_velocity_rpm: 200, outlet_temperature_C: 4, cooling_kwh: sim.energy.extrusionCoolKwh } },
    { key: "fl101", id: "FL-101", title: "Filler", stepKey: "packaging", icon: "filler", x: 1046, y: 672, type: "filling", value: `${fmt(sim.downstream.packageUnits, 0)} packs`, properties: { product_per_entity_kg: 1, container_kg_each: 0.01, filled_bulk_product_kg: sim.downstream.filledBulkProductKg, container_total_kg: sim.downstream.containerKg, paper_fill_factor: sim.downstream.paperFillFactor, paper_ds102_kg: paperReportedProduct.packagedKg } },
  ].map((device) => {
    const step = stepByKey[device.stepKey];
    return {
      ...device,
      step,
      reactions: deviceEquations(device, step),
      massBalance: {
        inputs: step?.inputs || {},
        outputs: step?.outputs || {},
      },
      energy: step?.utilities || {},
    };
  });
}

function deviceEquations(device, step) {
  const stepEquations = step?.equations || [];
  const byType = {
    "blend tank": [
      "component_kg = concentration_g_L * volume_L / 1000",
      "P_mix_kW = 0.1 kW/m3 * volume_m3",
      "E_mix_kWh = P_mix_kW * 1 h",
    ],
    "dead-end filter": [
      "J_L_m2_h = V_filtrate_L / (A_filter_m2 * t_h)",
      "m_impurity_out = m_impurity_in * (1 - 0.80)",
      "m_removed_1 = 0.80 * m_impurity_in",
    ],
    "polishing filter": [
      "m_impurity_out = 0 after second sterile filtration",
      "m_removed_2 = m_impurity_after_filter_1",
      "sterile_fraction_out = sterile_fraction_in - removed_impurity",
    ],
    sterilizer: [
      "Q_heat_kWh = m_kg * cp * (121 - 25) / 3600",
      "Q_cool_kWh = m_kg * cp * (121 - 35) / 3600",
      "steam_kg = Q_heat_kWh * 3600 / latent_heat_kJ_kg",
    ],
    "static mixer": [
      "Reaction 1: medium_components + adjusted_water -> Medium",
      "m_medium = m_water + sum(m_components)",
      "m_water = m_target_medium - sum(m_components)",
    ],
    "storage tank": [
      "Q_storage_cool_kWh = m_kg * cp * (35 - 4) / 3600",
      "residence_inventory_kg = medium_density * storage_volume",
      "storage_temperature_target = 4 C",
    ],
    "shake flask": [
      "N_end = N_start * 2^(duration_h / doubling_time_h)",
      "biomass_kg = N_end * cell_mass_kg * viability",
      "E_agitation_kWh = P_kw * duration_h",
    ],
    "wave bioreactor": [
      "N_end = N_start * 2^(duration_h / doubling_time_h)",
      "E_agitation_kWh = rocking_power_kW * duration_h",
      "coolant_kg_h = heat_release_kW * 3600 / (cp * delta_T)",
    ],
    "seed STR": [
      "N_end = N_start * 2^(duration_h / doubling_time_h)",
      "E_agitation_kWh = P_agitation_kW * duration_h",
      "aeration_kg = synthetic_air_flow * duration_h",
    ],
    "production STR": [
      "cells_total = V_L * 1000 * peak_VCD_cells_mL",
      "C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + biomass",
      "biomass_kg = cells_total * cell_mass_kg * viability",
      "E_agitation_kWh = P_agitation_kW * culture_duration_h",
    ],
    pump: [
      "P_hydraulic_kW = flow_m3_s * deltaP_Pa / efficiency / 1000",
      "t_transfer_h = volume_L / flow_L_h",
      "E_pump_kWh = P_hydraulic_kW * t_transfer_h",
    ],
    "heat exchanger": [
      "Q_cooling_kWh = m_broth_kg * cp * (37 - 25) / 3600",
      "coolant_kg = Q_kWh * 3600 / (cp * delta_T)",
      "T_out = 25 C before disk-stack centrifuge",
    ],
    centrifuge: [
      "m_product = m_broth * recovery",
      "m_depleted_medium = m_broth - m_product",
      "Q_heat_kWh = P_centrifuge_kW * t_h * heat_fraction",
    ],
    "waste filter": [
      "m_filtered_waste = m_depleted_medium - retained_solids",
      "J_waste = V_waste / (A_filter * t_filter)",
      "retained_impurity = incoming_impurity",
    ],
    "waste tank": [
      "inventory_waste_kg = depleted_medium_waste + wash_waste",
      "tank_hold_up_L = inventory_waste_kg / density_kg_L",
      "waste_stream = S-156 + S-154",
    ],
    washer: [
      "m_washed_product = recovered_biomass / target_biomass_fraction",
      "m_wash_waste = buffer_kg + displaced_depleted_medium",
      "Q_wash_kWh = m_buffer_kg * cp * delta_T / 3600",
    ],
    extruder: [
      "Q_extrusion_cool_kWh = m_product_kg * cp * (25 - 4) / 3600",
      "m_extrudate = m_washed_product",
      "shaft_work_kWh = P_extruder_kW * t_h",
    ],
    filling: [
      "filled_bulk_product_kg = washed_product_kg * paper_fill_factor",
      "packages = filled_bulk_product_kg / 1 kg",
      "container_mass_kg = packages * 0.01 kg",
      "m_packaged = filled_bulk_product_kg + container_mass",
    ],
  };
  return [...(byType[device.type] || []), ...stepEquations].slice(0, 7);
}

function stageProperties(stage = {}) {
  return {
    working_volume_L: stage.volumeL || 0,
    start_cells: stage.startCells || 0,
    end_cells: stage.endCells || 0,
    doublings: stage.doublings || 0,
    power_kw: stage.powerKw || 0,
    agitation_kwh: stage.agitationKwh || 0,
    coolant_kg_h: stage.coolantKgH || 0,
    duration_h: stage.durationH || 0,
  };
}

function streamCatalog(sim) {
  return [
    stream("s-sensitive", "Sensitive media fraction", "V-101", "DE-102", "v101", "de102", `${fmt(sim.medium.sterileVolumeL)} L`, "media", { components: "IGF-1, proteins, vitamins", temperature_C: 25 }),
    stream("s-filtered", "Filtered sensitive fraction", "DE-102", "DE-101", "de102", "de101", `${fmt(sim.medium.sterileVolumeL)} L`, "media", { impurities_removed_kg: sim.medium.firstFilterRemovedKg }),
    stream("s-stable", "Heat-stable fraction", "V-102", "ST-101", "v102", "st101", `${fmt(sim.medium.heatVolumeL)} L`, "media", { components: "amino acids, glucose, salts, trace elements" }),
    stream("s-sterile-heat", "Heat sterilized fraction", "ST-101", "MX-101", "st101", "mx101", `${fmt(sim.medium.heatVolumeL)} L`, "energy", { temperature_C: 35, heat_kwh: sim.energy.mediaHeatKwh }),
    stream("s-medium", "Prepared medium", "MX-101", "V-110", "mx101", "v110", fmtKg(sim.medium.mediumKg), "media", { medium_kg: sim.medium.mediumKg, storage_C: 4 }),
    stream("s-feed-seed", "Cold medium feed", "V-110", "SFR-101", "v110", "sfr101", fmtKg(sim.medium.mediumKg), "media", { temperature_C: 4 }),
    stream("s-sfr101", "Seed transfer", "SFR-101", "SFR-102", "sfr101", "sfr102", scientific(sim.stages[0]?.endCells || 0), "cells", { cells: sim.stages[0]?.endCells || 0 }),
    stream("s-sfr102", "Seed transfer", "SFR-102", "RBS-101", "sfr102", "rbs101", scientific(sim.stages[1]?.endCells || 0), "cells", { cells: sim.stages[1]?.endCells || 0 }),
    stream("s-rbs101", "Seed transfer", "RBS-101", "RBS-102", "rbs101", "rbs102", scientific(sim.stages[2]?.endCells || 0), "cells", { cells: sim.stages[2]?.endCells || 0 }),
    stream("s-rbs102", "Seed transfer", "RBS-102", "BR-101", "rbs102", "br101", scientific(sim.stages[3]?.endCells || 0), "cells", { cells: sim.stages[3]?.endCells || 0 }),
    stream("s-br101", "Production inoculum", "BR-101", "BR-102", "br101", "br102", scientific(sim.stages[4]?.endCells || 0), "cells", { cells: sim.stages[4]?.endCells || 0 }),
    stream("s-o2", "O2 / synthetic air", "Utility", "BR-102", null, "br102", fmtKg(sim.reaction.oxygenKg), "utility", { oxygen_kg: sim.reaction.oxygenKg, synthetic_air_kg: sim.utility.syntheticAirKg }),
    stream("s-co2", "CO2 vent", "BR-102", "Vent", "br102", null, fmtKg(sim.reaction.co2Kg), "waste", { co2_kg: sim.reaction.co2Kg }),
    stream("s-broth", "Culture broth S-145", "BR-102", "PM-103", "br102", "pm103", fmtKg(sim.reaction.cultureMassKg), "cells", { biomass_kg: sim.reaction.biomassKg, depleted_medium_kg: sim.reaction.depletedMediumKg, impurities_kg: sim.reaction.impuritiesKg }),
    stream("s-cool-broth", "Cooled broth", "HX-101", "DS-101", "hx101", "ds101", fmtKg(sim.reaction.cultureMassKg), "energy", { inlet_C: 37, outlet_C: 25 }),
    stream("s-clarified", "Centrifuge product", "DS-101", "WSH-101", "ds101", "wsh101", fmtKg(sim.downstream.productMassAfterCentrifuge), "cells", { product_biomass_kg: sim.downstream.productBiomassKg }),
    stream("s-depleted", "Depleted medium S-156", "DS-101", "DE-103", "ds101", "de103", fmtKg(sim.downstream.depletedWasteKg), "waste", { depleted_medium_waste_kg: sim.downstream.depletedWasteKg }),
    stream("s-depleted-store", "Filtered depleted waste", "DE-103", "V-103", "de103", "v103", fmtKg(sim.downstream.depletedWasteKg), "waste", { stream_id: "S-156" }),
    stream("s-buffer", "Wash buffer", "Buffer", "WSH-101", null, "wsh101", `${fmt(sim.params.bufferVolumeL)} L`, "utility", { buffer_volume_L: sim.params.bufferVolumeL, inlet_C: 4 }),
    stream("s-wash-waste", "Wash waste S-154", "WSH-101", "Waste", "wsh101", null, fmtKg(sim.downstream.washWasteKg), "waste", { wash_waste_kg: sim.downstream.washWasteKg }),
    stream("s-washed", "Washed biomass", "WSH-101", "XD-101", "wsh101", "xd101", fmtKg(sim.downstream.washedProductKg), "cells", { biomass_fraction: sim.params.washBiomassFraction }),
    stream("s-extruded", "Extruded product", "XD-101", "FL-101", "xd101", "fl101", fmtKg(sim.downstream.washedProductKg), "product", { outlet_C: 4 }),
    stream("s-containers", "Containers", "Packaging supply", "FL-101", null, "fl101", fmtKg(sim.downstream.containerKg), "utility", { container_kg: sim.downstream.containerKg }),
    stream("s-packaged", "Packaged product", "FL-101", "Product", "fl101", null, fmtKg(sim.downstream.packagedKg), "product", { packaged_product_kg: sim.downstream.packagedKg }),
  ];
}

function stream(key, title, from, to, fromKey, toKey, value, category, properties) {
  return { key, title, from, to, fromKey, toKey, value, category, properties };
}

function renderFactoryMap(sim, currentTime) {
  if (!factoryMap) return;
  const devices = deviceCatalog(sim);
  const deviceByKey = Object.fromEntries(devices.map((device) => [device.key, device]));
  const streams = streamCatalog(sim);
  factoryMap.innerHTML = `
    <svg class="factory-svg detailed" viewBox="0 0 1400 920" role="img" aria-label="Clickable cultivated meat process facility map">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#121923" flood-opacity=".18"/>
        </filter>
      </defs>
      <rect class="factory-floor" x="20" y="20" width="1360" height="880" rx="22"/>
      <rect class="factory-zone" x="46" y="70" width="1048" height="264" rx="16"/>
      <rect class="factory-zone" x="46" y="374" width="1048" height="138" rx="16"/>
      <rect class="factory-zone" x="46" y="592" width="1048" height="274" rx="16"/>
      <text class="factory-zone-label" x="68" y="58">Media preparation</text>
      <text class="factory-zone-label" x="68" y="362">Cell expansion and production</text>
      <text class="factory-zone-label" x="68" y="580">Downstream processing</text>
      <text class="factory-zone-label" x="878" y="580">Waste and side streams</text>
      ${streams.map((item, index) => renderStreamPath(item, deviceByKey, index)).join("")}
      ${devices.map((device) => renderDeviceNode(device, currentPhase(sim, currentTime))).join("")}
      <g class="factory-callout compact">
        <rect x="1164" y="72" width="178" height="62" rx="12"/>
        <text x="1182" y="98">${escapeHtml(currentPhaseLabel(sim, currentTime))}</text>
        <text x="1182" y="119">${escapeHtml(fmt(currentTime, 1))} h / ${escapeHtml(fmt(sim.totalTimeH, 1))} h</text>
      </g>
      <g class="factory-legend" transform="translate(1164 156)">
        <rect x="0" y="0" width="178" height="154" rx="12"/>
        <text class="legend-title" x="16" y="24">Stream legend</text>
        ${factoryLegendRows().map((row, index) => `
          <g transform="translate(16 ${44 + index * 18})">
            <line class="${row.className}" x1="0" y1="0" x2="30" y2="0"/>
            <text x="40" y="4">${escapeHtml(row.label)}</text>
          </g>
        `).join("")}
      </g>
    </svg>
  `;
}

function factoryLegendRows() {
  return [
    { className: "stream-path media legend-line", label: "media" },
    { className: "stream-path cells legend-line", label: "cells / biomass" },
    { className: "stream-path energy legend-line", label: "thermal duty" },
    { className: "stream-path utility legend-line", label: "utility / supply" },
    { className: "stream-path waste legend-line", label: "waste / vent" },
    { className: "stream-path product legend-line", label: "product" },
  ];
}

function renderDeviceNode(device, phase) {
  const selected = selectedDetail.type === "device" && selectedDetail.key === device.key;
  const active = device.stepKey === phase;
  const tip = deviceTooltip(device);
  const shortLabel = factoryShortLabel(device);
  return `
    <g class="factory-unit detail ${selected ? "selected" : ""} ${active ? "active" : ""}" data-select-device="${device.key}" data-export-scope="device-${device.key}" tabindex="0" role="button" aria-label="${escapeHtml(`${device.id} ${device.title}`)}" ${tooltipAttrs(tip.title, tip.body, tip.meta)} transform="translate(${device.x}, ${device.y})" style="--unit-color:${device.step?.color || "var(--blue)"}">
      <title>${escapeHtml(tip.title)}</title>
      <rect class="unit-platform" x="-48" y="38" width="96" height="16" rx="6"/>
      <rect class="unit-card" x="-58" y="-40" width="116" height="88" rx="12"/>
      <foreignObject x="-19" y="-31" width="38" height="38">
        <div class="factory-icon compact">${iconSvg(device.icon)}</div>
      </foreignObject>
      <text class="unit-title compact" y="22" text-anchor="middle">${escapeHtml(device.id)}</text>
      <text class="unit-badge compact" y="39" text-anchor="middle">${escapeHtml(shortLabel)}</text>
      ${active ? '<circle class="active-pulse" cx="35" cy="-24" r="5"/>' : ""}
    </g>
  `;
}

function factoryShortLabel(device) {
  return {
    v101: "Sensitive media",
    de102: "Filter 1",
    v102: "Heat-stable",
    st101: "Sterilizer",
    de101: "Filter 2",
    mx101: "Mixer",
    v110: "Cold store",
    sfr101: "0.1 L flask",
    sfr102: "1.6 L flask",
    rbs101: "25 L wave",
    rbs102: "250 L wave",
    br101: "Seed STR",
    br102: "Production STR",
    pm103: "Broth pump",
    hx101: "Cooler",
    ds101: "Centrifuge",
    de103: "Waste filter",
    v103: "Waste store",
    wsh101: "Washer",
    xd101: "Extruder",
    fl101: "Filler",
  }[device.key] || device.title;
}

function renderStreamPath(item, deviceByKey, index = 0) {
  const from = item.fromKey ? deviceByKey[item.fromKey] : null;
  const to = item.toKey ? deviceByKey[item.toKey] : null;
  const start = from ? [from.x + 58, from.y] : [Math.max((to?.x || 80) - 132, 42), to?.y || 100];
  const end = to ? [to.x - 58, to.y] : [Math.min((from?.x || 950) + 150, 1334), from?.y || 100];
  const midX = (start[0] + end[0]) / 2;
  const selected = selectedDetail.type === "stream" && selectedDetail.key === item.key;
  const className = `stream-path ${item.category} ${selected ? "selected" : ""}`;
  const tip = streamTooltip(item);
  const d = `M ${start[0]} ${start[1]} C ${midX} ${start[1]}, ${midX} ${end[1]}, ${end[0]} ${end[1]}`;
  const specialAnchor = streamTagSpecialAnchor(item);
  const anchor = specialAnchor || streamTagAnchor(item, start, end, midX);
  const labelX = specialAnchor ? anchor[0] : anchor[0] + streamTagOffset(index, "x");
  const labelY = specialAnchor ? anchor[1] : anchor[1] + streamTagOffset(index, "y");
  const tag = String(index + 1).padStart(2, "0");
  return `
    <path class="${className}" data-select-stream="${item.key}" data-export-scope="stream-${item.key}" ${tooltipAttrs(tip.title, tip.body, tip.meta)} d="${d}"/>
    <g class="stream-label stream-tag ${selected ? "selected" : ""}" data-select-stream="${item.key}" data-export-scope="stream-${item.key}" tabindex="0" role="button" aria-label="${escapeHtml(`${item.title} ${item.value}`)}" ${tooltipAttrs(tip.title, tip.body, tip.meta)} transform="translate(${labelX}, ${labelY})">
      <title>${escapeHtml(tip.title)}</title>
      <rect x="-18" y="-14" width="36" height="28" rx="9"/>
      <text y="4" text-anchor="middle">${escapeHtml(tag)}</text>
      ${selected ? `
        <rect class="stream-popover" x="26" y="-23" width="162" height="46" rx="9"/>
        <text class="stream-popover-title" x="40" y="-4">${escapeHtml(shortStreamLabel(item.title))}</text>
        <text class="stream-popover-value" x="40" y="12">${escapeHtml(item.value)}</text>
      ` : ""}
    </g>
  `;
}

function streamTagSpecialAnchor(item) {
  return {
    "s-o2": [970, 386],
    "s-buffer": [560, 560],
    "s-wash-waste": [760, 760],
    "s-containers": [982, 600],
  }[item.key] || null;
}

function streamTagAnchor(item, start, end, midX) {
  if (!item.fromKey && item.toKey) return [start[0] - 28, start[1] - 4];
  if (item.fromKey && !item.toKey) return [end[0] + 28, end[1] - 4];
  return [midX, (start[1] + end[1]) / 2];
}

function streamTagOffset(index, axis) {
  const offsets = [
    [0, -28],
    [0, 28],
    [0, 0],
    [0, -46],
    [0, 46],
    [0, 14],
  ];
  const value = offsets[index % offsets.length];
  return axis === "x" ? value[0] : value[1];
}

function shortStreamLabel(label) {
  if (label.length <= 24) return label;
  return `${label.slice(0, 21)}...`;
}

function inspectorMetricLabel(key) {
  const labels = {
    working_volume_L: "Working volume",
    density_cells_ml: "Cell density",
    power_kw: "Power",
    culture_duration_h: "Culture time",
    biomass_kg: "Biomass",
    depleted_medium_kg: "Depleted medium",
    agitation_kwh: "Agitation energy",
    cooling_kwh: "Cooling duty",
    heat_kwh: "Heat duty",
    electricity_kwh: "Electricity",
    storage_C: "Storage temp.",
    temperature_C: "Temperature",
    filter_area_m2: "Filter area",
    cartridges: "Cartridges",
    components: "Components",
    impurities_removed_kg: "Impurities removed",
    from: "From",
    to: "To",
    type: "Stream type",
    cells: "Cells",
    oxygen_kg: "Oxygen",
    synthetic_air_kg: "Synthetic air",
    co2_kg: "CO2",
    medium_kg: "Medium",
    product_biomass_kg: "Product biomass",
    depleted_medium_waste_kg: "Spent medium",
    wash_waste_kg: "Wash side stream",
    packaged_product_kg: "Packaged product",
    container_kg: "Container mass",
    stream_id: "Stream ID",
    buffer_volume_L: "Buffer volume",
    inlet_C: "Inlet temp.",
    outlet_C: "Outlet temp.",
  };
  if (labels[key]) return labels[key];
  return String(key)
    .replace(/_kg_h\b/g, " kg/h")
    .replace(/_kwh\b/g, " kWh")
    .replace(/_kw\b/g, " kW")
    .replace(/_kg\b/g, " kg")
    .replace(/_L\b/g, " L")
    .replace(/_C\b/g, " C")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detailForSelection(sim) {
  if (selectedDetail.type === "stream") {
    const item = streamCatalog(sim).find((streamItem) => streamItem.key === selectedDetail.key);
    if (item) return { type: "stream", item };
  }
  const device = deviceCatalog(sim).find((entry) => entry.key === selectedDetail.key) || deviceCatalog(sim).find((entry) => entry.key === "br102");
  selectedStepKey = device.stepKey;
  return { type: "device", item: device };
}

function renderUnitInspector(sim) {
  if (!unitInspector) return;
  const detail = detailForSelection(sim);
  const item = detail.item;
  const color = detail.type === "stream" ? streamColor(item.category) : item.step?.color || "var(--blue)";
  const reactions = detail.type === "device"
    ? item.reactions
    : streamEquations(item, sim);
  const propertyEntries = Object.entries(item.properties || {}).slice(0, 4);
  const massEntries = detail.type === "device"
    ? Object.entries(item.massBalance?.outputs || {}).slice(0, 2)
    : [["from", item.from], ["to", item.to]];
  const utilityEntries = detail.type === "device"
    ? Object.entries(item.energy || {}).slice(0, 2)
    : [["type", item.category]];
  unitInspector.innerHTML = `
    <div class="inspector-top" style="--unit-color:${color}">
      <span class="inspector-icon">${detail.type === "stream" ? '<span class="stream-dot"></span>' : iconSvg(item.icon)}</span>
      <div>
        <span>${detail.type === "stream" ? `${escapeHtml(item.from)} -> ${escapeHtml(item.to)}` : escapeHtml(item.id)}</span>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
    </div>
    <p>${detail.type === "stream" ? "Stream" : escapeHtml(item.type)} · ${escapeHtml(item.value)}</p>
    <div class="inspector-summary">
      ${propertyEntries.map(([key, value]) => `<div class="inspector-mini"><span>${escapeHtml(inspectorMetricLabel(key))}</span><strong>${formatValue(value)}</strong></div>`).join("")}
      ${massEntries.map(([key, value]) => `<div class="inspector-mini"><span>${escapeHtml(inspectorMetricLabel(key))}</span><strong>${formatValue(value)}</strong></div>`).join("")}
      ${utilityEntries.map(([key, value]) => `<div class="inspector-mini"><span>${escapeHtml(inspectorMetricLabel(key))}</span><strong>${formatValue(value)}</strong></div>`).join("")}
    </div>
    <div class="equation-preview">
      <span>Equation preview</span>
      ${reactions.slice(0, 2).map((equation) => `<code>${escapeHtml(equation)}</code>`).join("") || "<code>no direct reaction modeled</code>"}
    </div>
    <div class="inspector-actions">
      ${detail.type === "device" ? `<button class="secondary-button" type="button" data-detail-export="device-${item.key}">Download equipment</button><button class="primary-button" type="button" data-step-export="${item.stepKey}">Download step</button>` : `<button class="secondary-button" type="button" data-select-related-device="${item.toKey || item.fromKey}">Open equipment</button><button class="primary-button" type="button" data-detail-export="stream-${item.key}">Download stream</button>`}
    </div>
  `;
}

function streamColor(category) {
  return {
    media: "var(--blue)",
    cells: "var(--green)",
    energy: "var(--amber)",
    utility: ciPalette.utility,
    waste: "var(--red)",
    product: ciPalette.product,
  }[category] || "var(--blue)";
}

function streamEquations(item) {
  const base = [`stream_mass_or_count = upstream_output routed to downstream_input`, `selected_stream = ${item.title}: ${item.value}`];
  if (item.category === "media") base.push("component_kg = concentration_g_L * volume_L / 1000");
  if (item.category === "cells") base.push("biomass_kg = cells * cell_mass_kg * viability");
  if (item.category === "energy") base.push("Q_kWh = mass_kg * 4.184 * delta_T / 3600");
  if (item.category === "waste") base.push("waste_total = depleted_medium_waste + wash_waste + removed_impurities");
  if (item.category === "product") base.push("packaged_mass = filled_bulk_product + container_mass");
  return base;
}

function firstEntries(object = {}, limit = 2) {
  return Object.entries(object)
    .slice(0, limit)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join("; ");
}

function deviceTooltip(device) {
  const step = device.step || {};
  const equation = (device.reactions || [])[0] || "tracked in process model";
  const balance = firstEntries(device.massBalance?.outputs || device.massBalance?.inputs || {}, 2);
  return {
    title: `${device.id} · ${device.title}`,
    body: `${device.type}. ${step.detail || step.unit || "Unit operation in the process train."} ${equation}`,
    meta: `${device.value}${balance ? ` · ${balance}` : ""}`,
  };
}

function streamTooltip(item) {
  const equation = streamEquations(item)[0];
  return {
    title: `${item.title}`,
    body: `${item.from} -> ${item.to}. ${equation}`,
    meta: `${item.category} · ${item.value}`,
  };
}

function stepTooltip(step) {
  return {
    title: `${step.badge} · ${step.title}`,
    body: `${step.unit}. ${step.equations[0] || "Tracked as a process operation."}`,
    meta: step.value,
  };
}

function operationExplanationData(sim) {
  const devices = deviceCatalog(sim);
  const streams = streamCatalog(sim);
  const steps = processStepCatalog(sim);
  return {
    generated_at: new Date().toISOString(),
    model: modelName,
    process_steps: steps.map((step) => ({
      key: step.key,
      badge: step.badge,
      title: step.title,
      unit: step.unit,
      explanation: stepTooltip(step),
      equations: step.equations,
      inputs: step.inputs,
      outputs: step.outputs,
      utilities: step.utilities,
    })),
    equipment: devices.map((device) => ({
      key: device.key,
      id: device.id,
      title: device.title,
      type: device.type,
      icon: device.icon,
      process_step: device.step?.title,
      explanation: deviceTooltip(device),
      properties: device.properties,
      mass_balance: device.massBalance,
      utilities: device.energy,
      equations: device.reactions,
    })),
    streams: streams.map((streamItem) => ({
      key: streamItem.key,
      title: streamItem.title,
      from: streamItem.from,
      to: streamItem.to,
      category: streamItem.category,
      explanation: streamTooltip(streamItem),
      properties: streamItem.properties,
      equations: streamEquations(streamItem),
    })),
  };
}

function balanceRowsHtml(balance = {}) {
  const rows = [];
  Object.entries(balance.inputs || {}).slice(0, 5).forEach(([key, value]) => rows.push(`<li><span>in: ${escapeHtml(key)}</span><strong>${formatValue(value)}</strong></li>`));
  Object.entries(balance.outputs || {}).slice(0, 5).forEach(([key, value]) => rows.push(`<li><span>out: ${escapeHtml(key)}</span><strong>${formatValue(value)}</strong></li>`));
  return rows.join("") || '<li><span>balance</span><strong>tracked in step payload</strong></li>';
}

function streamBalanceRows(item) {
  return `
    <li><span>from</span><strong>${escapeHtml(item.from)}</strong></li>
    <li><span>to</span><strong>${escapeHtml(item.to)}</strong></li>
    <li><span>value</span><strong>${escapeHtml(item.value)}</strong></li>
  `;
}

function formatValue(value) {
  if (typeof value !== "number") return escapeHtml(value);
  if (Math.abs(value) >= 1e6) return scientific(value);
  if (Math.abs(value) >= 100) return fmt(value, 1);
  if (Math.abs(value) >= 1) return fmt(value, 2);
  return Number(value).toPrecision(3);
}

function referenceComparisons(sim) {
  const processTarget = currentPreset === "heat" ? pythonBaseline.processCompleteH5050 : currentPreset === "local" ? pythonBaseline.localProcessCompleteH : pythonBaseline.processCompleteH;
  const steamTarget = currentPreset === "heat" ? 216.53 : pythonBaseline.steamKg;
  return [
    ["Prepared medium", sim.medium.mediumKg, pythonBaseline.mediaKg, "kg"],
    ["Sterile filtration volume", sim.medium.sterileVolumeL, pythonBaseline.sterileVolumeL, "L"],
    ["Heat sterilization volume", sim.medium.heatVolumeL, pythonBaseline.heatVolumeL, "L"],
    ["Production biomass", sim.reaction.biomassKg, pythonBaseline.biomassKg, "kg"],
    ["Depleted medium", sim.reaction.depletedMediumKg, pythonBaseline.depletedMediumKg, "kg"],
    ["Impurities", sim.reaction.impuritiesKg, pythonBaseline.impuritiesKg, "kg"],
    ["Packaged product", sim.downstream.packagedKg, pythonBaseline.packagedKg, "kg"],
    ["Process complete", sim.totalTimeH, processTarget, "h"],
    ["Seed agitation", sim.energy.seedAgitationKwh, pythonBaseline.seedAgitationKwh, "kWh"],
    ["Production agitation", sim.energy.productionAgitationKwh, pythonBaseline.productionAgitationKwh, "kWh"],
    ["Steam utility", sim.utility.steamKg, steamTarget, "kg"],
    ["Chilled water utility", sim.utility.chilledWaterKg, pythonBaseline.chilledWaterKg, "kg"],
  ].map(([label, live, paperReference, unit]) => {
    const diff = live - paperReference;
    const tolerance = Math.max(Math.abs(paperReference) * 0.002, unit === "h" ? 0.5 : 0.05);
    return {
      label,
      live,
      paperReference,
      unit,
      diff,
      withinTolerance: Math.abs(diff) <= tolerance,
    };
  });
}

function formatDelta(item) {
  const sign = item.diff > 0 ? "+" : "";
  return `${sign}${formatValue(item.diff)} ${item.unit}`;
}

function renderReferenceValues(sim) {
  const comparisons = referenceComparisons(sim);
  document.getElementById("referenceStatus").textContent = `${comparisons.length} paper values`;
  referenceDeltaStrip.innerHTML = comparisons.slice(0, 5).map((item) => `
    <div class="reference-pill ${item.withinTolerance ? "near" : "offset"}">
      <span>${escapeHtml(item.label)}</span>
      <strong>Δ ${escapeHtml(formatDelta(item))}</strong>
    </div>
  `).join("");
  document.getElementById("referenceTable").innerHTML = comparisons.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${formatValue(item.live)} ${escapeHtml(item.unit)}</td>
      <td>${formatValue(item.paperReference)} ${escapeHtml(item.unit)}</td>
      <td><span class="delta-status ${item.withinTolerance ? "near" : "offset"}">Δ ${escapeHtml(formatDelta(item))}</span></td>
    </tr>
  `).join("");
}

function renderExportCenter(sim) {
  const target = document.getElementById("stepExportList");
  const summary = document.getElementById("downloadSummary");
  if (summary) {
    const pack = downloadDataPackage(sim);
    summary.innerHTML = `
      <article>
        <span>Equipment</span>
        <strong>${pack.equipmentTable.length}</strong>
      </article>
      <article>
        <span>Streams</span>
        <strong>${pack.streamTable.length}</strong>
      </article>
      <article>
        <span>Equations</span>
        <strong>${pack.chemicalEquationRegister.length}</strong>
      </article>
      <article>
        <span>Time check</span>
        <strong>${sim.timing.addsUp ? "OK" : "Drift"}</strong>
      </article>
    `;
  }
  if (!target) return;
  target.innerHTML = processStepCatalog(sim).map((step) => `
    <button class="step-export-card" type="button" data-step-export="${step.key}" style="--unit-color:${step.color}">
      <span>${iconSvg(step.icon)}</span>
      <strong>${escapeHtml(step.title)}</strong>
      <small>${escapeHtml(step.badge)} · ${escapeHtml(step.value)}</small>
    </button>
  `).join("");
}

function setActiveView(view) {
  activeView = view;
  document.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === view);
  });
}

function renderStageCards(sim) {
  const dspCards = [
    { id: "P-17", name: "Centrifuge", value: fmtKg(sim.downstream.productMassAfterCentrifuge), accent: "var(--green)" },
    { id: "P-21", name: "Wash", value: fmtKg(sim.downstream.washedProductKg), accent: "var(--amber)" },
    { id: "P-23", name: "Fill", value: `${fmt(sim.downstream.packageUnits, 0)} packs`, accent: "var(--blue)" },
  ];
  const cards = sim.stages.map((stage) => ({
    id: stage.id,
    name: `${stage.name}, ${fmt(stage.volumeL, stage.volumeL < 10 ? 1 : 0)} L`,
    value: `${scientific(stage.endCells)} cells`,
    accent: stage.isFinal ? "var(--blue)" : "var(--green)",
  })).concat(dspCards);

  document.getElementById("stageCards").innerHTML = cards
    .map((card) => `
      <div class="stage-card" data-export-scope="stage-${card.id}">
        <span class="stage-chip" style="background:${card.accent}">${card.id}</span>
        <div><strong>${card.name}</strong><p>${card.value}</p></div>
        <span class="stage-value">${card.id.startsWith("P-") ? "unit" : "stage"}</span>
      </div>
    `)
    .join("");
}

function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width * dpr));
  const height = Math.max(240, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return rect;
}

function drawProcess(sim, currentTime) {
  const rect = resizeCanvas(processCanvas, processCtx);
  const ctx = processCtx;
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, rect.width, rect.height);

  drawPfdGrid(ctx, rect);

  const current = currentPhase(sim, currentTime);
  const activeKey = activePfdNodeKey(sim, currentTime);
  const activeLabel = currentPhaseLabel(sim, currentTime);
  const padX = rect.width < 720 ? 20 : 32;
  const topPad = 84;
  const bottomPad = 30;
  const innerW = rect.width - padX * 2;
  const innerH = Math.max(360, rect.height - topPad - bottomPad);
  const scale = Math.max(0.68, Math.min(1, innerW / 960));
  const nodeW = 72 * scale;
  const nodeH = 58 * scale;
  const nodes = pfdNodes(sim).map((node) => ({
    ...node,
    x: padX + node.x * innerW,
    y: topPad + node.y * innerH,
    w: nodeW,
    h: nodeH,
  }));
  const byKey = Object.fromEntries(nodes.map((node) => [node.key, node]));

  drawPfdZones(ctx, rect, topPad, innerH, current);
  drawPfdStreams(ctx, byKey, sim, scale);
  nodes.forEach((node) => drawPfdNode(ctx, node, {
    active: node.key === activeKey,
    phaseActive: node.phase === current,
    scale,
  }));
  drawPfdExternalStreams(ctx, byKey, sim, scale);
  drawPfdLegend(ctx, rect);

  document.getElementById("currentStage").textContent = activeLabel;
  document.getElementById("activeUnit").textContent = activeLabel;

  ctx.fillStyle = ciPalette.text;
  ctx.font = `700 22px ${canvasFontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("Process flow diagram", padX, 34);
  ctx.fillStyle = ciPalette.muted;
  ctx.font = `12px ${canvasFontFamily}`;
  ctx.fillText(`${fmt(currentTime, 1)} h / ${fmt(sim.totalTimeH, 1)} h · ${fmt(sim.params.finalVolumeL)} L final STR · ${scientific(sim.achievedDensity)} cells/mL`, padX, 56);
}

function pfdNodes(sim) {
  return [
    { key: "v101", id: "V-101", label: "Sensitive media", type: "tank", phase: "media", x: 0.06, y: 0.17, value: `${fmt(sim.medium.sterileVolumeL)} L` },
    { key: "de102", id: "DE-102", label: "Sterile filter 1", type: "filter", phase: "media", x: 0.19, y: 0.17, value: "80% removal" },
    { key: "de101", id: "DE-101", label: "Sterile filter 2", type: "filter", phase: "media", x: 0.32, y: 0.17, value: "polish" },
    { key: "v102", id: "V-102", label: "Heat-stable media", type: "tank", phase: "media", x: 0.06, y: 0.36, value: `${fmt(sim.medium.heatVolumeL)} L` },
    { key: "st101", id: "ST-101", label: "Sterilizer", type: "heater", phase: "media", x: 0.19, y: 0.36, value: `${fmt(sim.energy.mediaHeatKwh, 0)} kWh` },
    { key: "mx101", id: "MX-101", label: "Medium mixer", type: "mixer", phase: "media", x: 0.46, y: 0.27, value: "Reaction 1" },
    { key: "v110", id: "V-110", label: "Cold store", type: "tank", phase: "media", x: 0.60, y: 0.27, value: "4 C" },
    { key: "sfr101", id: "SFR-101", label: "Shake flask", type: "flask", phase: "seed", x: 0.06, y: 0.58, value: "0.1 L" },
    { key: "sfr102", id: "SFR-102", label: "Shake flask", type: "flask", phase: "seed", x: 0.19, y: 0.58, value: "1.6 L" },
    { key: "rbs101", id: "RBS-101", label: "Wave bag", type: "wave", phase: "seed", x: 0.32, y: 0.58, value: "25 L" },
    { key: "rbs102", id: "RBS-102", label: "Wave bag", type: "wave", phase: "seed", x: 0.45, y: 0.58, value: "250 L" },
    { key: "br101", id: "BR-101", label: "Seed STR", type: "reactor", phase: "seed", x: 0.58, y: 0.58, value: "2,000 L" },
    { key: "br102", id: sim.finalStage.id, label: "Production STR", type: "reactor", phase: "production", x: 0.76, y: 0.58, value: `${fmtKg(sim.reaction.biomassKg)}` },
    { key: "pm103", id: "PM-103", label: "Transfer pump", type: "pump", phase: "clarification", x: 0.06, y: 0.82, value: "4,000 L/h" },
    { key: "hx101", id: "HX-101", label: "Broth cooler", type: "exchanger", phase: "clarification", x: 0.19, y: 0.82, value: "37 -> 25 C" },
    { key: "ds101", id: "DS-101", label: "Disk stack", type: "centrifuge", phase: "clarification", x: 0.32, y: 0.82, value: `${fmt(sim.params.recovery * 100, 1)}% rec.` },
    { key: "wsh101", id: "WSH-101", label: "Washer", type: "wash", phase: "washing", x: 0.47, y: 0.82, value: `${fmt(sim.params.bufferVolumeL)} L buffer` },
    { key: "xd101", id: "XD-101", label: "Extruder", type: "extruder", phase: "extrusion", x: 0.62, y: 0.82, value: "200 rpm" },
    { key: "fl101", id: "FL-101", label: "Filler", type: "filler", phase: "packaging", x: 0.78, y: 0.82, value: `${fmt(sim.downstream.packageUnits, 0)} packs` },
    { key: "de103", id: "DE-103", label: "Waste filter", type: "filter", phase: "clarification", x: 0.32, y: 0.96, value: "waste" },
    { key: "v103", id: "V-103", label: "Waste tank", type: "wasteTank", phase: "clarification", x: 0.47, y: 0.96, value: "S-156" },
  ];
}

function activePfdNodeKey(sim, currentTime) {
  if (currentTime <= sim.timing.mediaPrepH) return "mx101";
  const activeStage = sim.stages.find((stage) => currentTime >= stage.startTimeH && currentTime <= stage.endTimeH);
  if (activeStage) {
    return {
      "SFR-101": "sfr101",
      "SFR-102": "sfr102",
      "RBS-101": "rbs101",
      "RBS-102": "rbs102",
      "BR-101": "br101",
    }[activeStage.id] || "br102";
  }
  return {
    clarification: "ds101",
    washing: "wsh101",
    extrusion: "xd101",
    packaging: "fl101",
    closeout: "fl101",
    complete: "fl101",
  }[currentPhase(sim, currentTime)] || "fl101";
}

function drawPfdGrid(ctx, rect) {
  ctx.save();
  ctx.strokeStyle = "rgba(23, 23, 28, 0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x < rect.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rect.height);
    ctx.stroke();
  }
  for (let y = 0; y < rect.height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPfdZones(ctx, rect, topPad, innerH, activePhase) {
  const zones = [
    { label: "Media preparation", phase: "media", y: topPad + innerH * 0.06, h: innerH * 0.39, color: ciPalette.media },
    { label: "Cell expansion and production", phase: "seed", y: topPad + innerH * 0.47, h: innerH * 0.22, color: ciPalette.cells },
    { label: "Downstream processing", phase: "clarification", y: topPad + innerH * 0.73, h: innerH * 0.26, color: ciPalette.energy },
  ];
  ctx.save();
  zones.forEach((zone) => {
    const phaseActive = activePhase === zone.phase || (zone.phase === "clarification" && ["washing", "extrusion", "packaging"].includes(activePhase)) || (zone.phase === "seed" && activePhase === "production");
    roundRect(ctx, 18, zone.y - 28, rect.width - 36, zone.h, 12);
    ctx.fillStyle = phaseActive ? hexToRgba(zone.color, 0.08) : "rgba(255,255,255,0.48)";
    ctx.fill();
    ctx.strokeStyle = phaseActive ? hexToRgba(zone.color, 0.35) : "rgba(23,23,28,0.08)";
    ctx.stroke();
    ctx.fillStyle = "rgba(23,23,28,0.48)";
    ctx.font = `700 10px ${canvasFontFamily}`;
    ctx.fillText(zone.label.toUpperCase(), 32, zone.y - 10);
  });
  ctx.restore();
}

function drawPfdStreams(ctx, byKey, sim, scale) {
  const streams = [
    ["v101", "de102", "media", `${fmt(sim.medium.sterileVolumeL)} L`],
    ["de102", "de101", "media", "filtered"],
    ["de101", "mx101", "media", "sensitive"],
    ["v102", "st101", "media", `${fmt(sim.medium.heatVolumeL)} L`],
    ["st101", "mx101", "energy", "121 C"],
    ["mx101", "v110", "media", fmtKg(sim.medium.mediumKg)],
    ["v110", "sfr101", "media", "cold medium"],
    ["sfr101", "sfr102", "cells", "seed"],
    ["sfr102", "rbs101", "cells", "seed"],
    ["rbs101", "rbs102", "cells", "seed"],
    ["rbs102", "br101", "cells", "seed"],
    ["br101", "br102", "cells", "inoculum"],
    ["br102", "pm103", "cells", "S-145"],
    ["pm103", "hx101", "cells", "broth"],
    ["hx101", "ds101", "energy", "cooled"],
    ["ds101", "wsh101", "cells", "product"],
    ["wsh101", "xd101", "cells", "washed"],
    ["xd101", "fl101", "product", "extrudate"],
    ["ds101", "de103", "waste", "S-156"],
    ["de103", "v103", "waste", "filtered waste"],
  ];
  streams.forEach(([fromKey, toKey, kind, label]) => {
    drawPfdStream(ctx, byKey[fromKey], byKey[toKey], kind, label, scale);
  });
}

function drawPfdExternalStreams(ctx, byKey, sim, scale) {
  const br = byKey.br102;
  const washer = byKey.wsh101;
  const filler = byKey.fl101;
  if (!br || !washer || !filler) return;
  drawExternalPfdStream(ctx, { x: br.x, y: br.y - br.h * 1.15 }, pfdPort(br, "top"), "utility", `O2 / air ${fmt(sim.reaction.oxygenKg, 0)} kg`, scale);
  drawExternalPfdStream(ctx, pfdPort(br, "top"), { x: br.x + br.w * 1.6, y: br.y - br.h * 1.08 }, "waste", `CO2 ${fmt(sim.reaction.co2Kg, 0)} kg`, scale);
  drawExternalPfdStream(ctx, { x: washer.x, y: washer.y - washer.h * 1.2 }, pfdPort(washer, "top"), "utility", `${fmt(sim.params.bufferVolumeL)} L buffer`, scale);
  drawExternalPfdStream(ctx, { x: filler.x, y: filler.y - filler.h * 1.1 }, pfdPort(filler, "top"), "utility", `${fmt(sim.downstream.containerKg, 0)} kg containers`, scale);
  drawExternalPfdStream(ctx, pfdPort(filler, "right"), { x: filler.x + filler.w * 1.65, y: filler.y }, "product", fmtKg(sim.downstream.packagedKg), scale);
}

function drawPfdStream(ctx, from, to, kind, label, scale) {
  if (!from || !to) return;
  const start = pfdPort(from, "right");
  const end = pfdPort(to, "left");
  const midX = (start.x + end.x) / 2;
  const points = end.x < start.x
    ? [start, { x: start.x + 26 * scale, y: start.y }, { x: start.x + 26 * scale, y: end.y }, end]
    : Math.abs(start.y - end.y) > 8
    ? [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
    : [start, end];
  drawPfdPolyline(ctx, points, kind, scale);
  drawStreamLabel(ctx, label, (start.x + end.x) / 2, (start.y + end.y) / 2 - 7 * scale, scale);
}

function drawExternalPfdStream(ctx, start, end, kind, label, scale) {
  drawPfdPolyline(ctx, [start, end], kind, scale);
  drawStreamLabel(ctx, label, (start.x + end.x) / 2, (start.y + end.y) / 2 - 5 * scale, scale);
}

function drawPfdPolyline(ctx, points, kind, scale) {
  const color = pfdColor(kind);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 2.4 * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (["energy", "utility", "waste"].includes(kind)) ctx.setLineDash([7 * scale, 5 * scale]);
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  drawArrowHead(ctx, a, b, color, scale);
  ctx.restore();
}

function drawArrowHead(ctx, a, b, color, scale) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const size = 7 * scale;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - size * Math.cos(angle - Math.PI / 6), b.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(b.x - size * Math.cos(angle + Math.PI / 6), b.y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStreamLabel(ctx, label, x, y, scale) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `650 ${Math.max(7, 8 * scale)}px ${canvasFontFamily}`;
  const width = Math.min(104 * scale, Math.max(42 * scale, ctx.measureText(label).width + 12 * scale));
  roundRect(ctx, x - width / 2, y - 10 * scale, width, 17 * scale, 5 * scale);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(23,23,28,0.08)";
  ctx.stroke();
  ctx.fillStyle = ciPalette.graphite;
  ctx.fillText(label, x, y + 2 * scale);
  ctx.restore();
}

function drawPfdNode(ctx, node, state) {
  const { active, phaseActive, scale } = state;
  const x = node.x - node.w / 2;
  const y = node.y - node.h / 2;
  ctx.save();
  ctx.shadowColor = active ? `${pfdColor(node.phase)}55` : "rgba(20,20,30,0.08)";
  ctx.shadowBlur = active ? 22 : 12;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, node.w, node.h, 8 * scale);
  ctx.fillStyle = active ? "#ffffff" : "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = active ? pfdColor(node.phase) : phaseActive ? `${pfdColor(node.phase)}88` : "rgba(23,23,28,0.16)";
  ctx.lineWidth = active ? 2.4 : 1.2;
  ctx.stroke();
  drawPfdSymbol(ctx, node.type, node.x, node.y - node.h * 0.08, pfdColor(node.phase), scale);
  ctx.textAlign = "center";
  ctx.fillStyle = ciPalette.text;
  ctx.font = `800 ${Math.max(8, 10 * scale)}px ${canvasFontFamily}`;
  ctx.fillText(node.id, node.x, y + node.h - 16 * scale);
  ctx.fillStyle = ciPalette.muted;
  ctx.font = `600 ${Math.max(7, 8 * scale)}px ${canvasFontFamily}`;
  ctx.fillText(node.value, node.x, y + node.h - 5 * scale);
  if (active) {
    ctx.fillStyle = pfdColor(node.phase);
    ctx.beginPath();
    ctx.arc(x + node.w - 7 * scale, y + 7 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPfdSymbol(ctx, type, x, y, color, scale) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}18`;
  ctx.lineWidth = Math.max(1.2, 1.8 * scale);
  const w = 26 * scale;
  const h = 28 * scale;
  if (type === "tank" || type === "wasteTank") drawTankSymbol(ctx, x, y, w, h, type === "wasteTank");
  else if (type === "filter") drawFilterSymbol(ctx, x, y, w, h);
  else if (type === "heater" || type === "exchanger") drawExchangerSymbol(ctx, x, y, w);
  else if (type === "mixer") drawMixerSymbol(ctx, x, y, w);
  else if (type === "flask") drawFlaskSymbol(ctx, x, y, w, h);
  else if (type === "wave") drawWaveSymbol(ctx, x, y, w, h);
  else if (type === "reactor" || type === "wash") drawReactorSymbol(ctx, x, y, w, h, type === "wash");
  else if (type === "pump") drawPumpSymbol(ctx, x, y, w);
  else if (type === "centrifuge") drawCentrifugeSymbol(ctx, x, y, w);
  else if (type === "extruder") drawExtruderSymbol(ctx, x, y, w, h);
  else if (type === "filler") drawFillerSymbol(ctx, x, y, w, h);
  ctx.restore();
}

function drawTankSymbol(ctx, x, y, w, h, dashed = false) {
  if (dashed) ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.ellipse(x, y - h / 2, w / 2, h * 0.13, 0, 0, Math.PI * 2);
  ctx.moveTo(x - w / 2, y - h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.ellipse(x, y + h / 2, w / 2, h * 0.13, 0, 0, Math.PI);
  ctx.lineTo(x + w / 2, y - h / 2);
  ctx.fill();
  ctx.stroke();
}

function drawFilterSymbol(ctx, x, y, w, h) {
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + i * w * 0.22, y + h / 2);
    ctx.lineTo(x + i * w * 0.22, y - h / 2);
    ctx.stroke();
  }
}

function drawExchangerSymbol(ctx, x, y, w) {
  ctx.beginPath();
  ctx.arc(x, y, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y + w * 0.35);
  ctx.lineTo(x + w * 0.35, y - w * 0.35);
  ctx.moveTo(x - w * 0.35, y - w * 0.35);
  ctx.lineTo(x + w * 0.35, y + w * 0.35);
  ctx.stroke();
}

function drawMixerSymbol(ctx, x, y, w) {
  ctx.beginPath();
  ctx.arc(x, y, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - w * 0.42);
  ctx.lineTo(x, y + w * 0.42);
  ctx.moveTo(x - w * 0.34, y - w * 0.16);
  ctx.lineTo(x + w * 0.34, y + w * 0.16);
  ctx.moveTo(x + w * 0.34, y - w * 0.16);
  ctx.lineTo(x - w * 0.34, y + w * 0.16);
  ctx.stroke();
}

function drawFlaskSymbol(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, y - h / 2);
  ctx.lineTo(x - w * 0.12, y - h * 0.12);
  ctx.lineTo(x - w * 0.42, y + h / 2);
  ctx.lineTo(x + w * 0.42, y + h / 2);
  ctx.lineTo(x + w * 0.12, y - h * 0.12);
  ctx.lineTo(x + w * 0.12, y - h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.26, y + h * 0.18);
  ctx.quadraticCurveTo(x, y + h * 0.08, x + w * 0.26, y + h * 0.18);
  ctx.stroke();
}

function drawWaveSymbol(ctx, x, y, w, h) {
  roundRect(ctx, x - w / 2, y - h * 0.32, w, h * 0.64, 5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y);
  ctx.bezierCurveTo(x - w * 0.15, y - h * 0.18, x + w * 0.15, y + h * 0.18, x + w * 0.35, y);
  ctx.stroke();
}

function drawReactorSymbol(ctx, x, y, w, h, wash = false) {
  drawTankSymbol(ctx, x, y, w, h, false);
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.45);
  ctx.lineTo(x, y + h * 0.12);
  ctx.moveTo(x - w * 0.22, y + h * 0.02);
  ctx.lineTo(x + w * 0.22, y + h * 0.22);
  ctx.moveTo(x + w * 0.22, y + h * 0.02);
  ctx.lineTo(x - w * 0.22, y + h * 0.22);
  if (wash) {
    ctx.moveTo(x - w * 0.35, y - h * 0.08);
    ctx.quadraticCurveTo(x, y - h * 0.18, x + w * 0.35, y - h * 0.08);
  }
  ctx.stroke();
}

function drawPumpSymbol(ctx, x, y, w) {
  ctx.beginPath();
  ctx.arc(x, y, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.18, y - w * 0.24);
  ctx.lineTo(x + w * 0.28, y);
  ctx.lineTo(x - w * 0.18, y + w * 0.24);
  ctx.closePath();
  ctx.stroke();
}

function drawCentrifugeSymbol(ctx, x, y, w) {
  ctx.beginPath();
  ctx.arc(x, y, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const a = i * (Math.PI * 2 / 3) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * w * 0.38, y + Math.sin(a) * w * 0.38);
    ctx.stroke();
  }
}

function drawExtruderSymbol(ctx, x, y, w, h) {
  ctx.strokeRect(x - w / 2, y - h * 0.28, w, h * 0.56);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y);
  for (let i = 0; i < 4; i += 1) {
    const x0 = x - w * 0.35 + i * w * 0.18;
    ctx.quadraticCurveTo(x0 + w * 0.09, y - h * 0.18, x0 + w * 0.18, y);
    ctx.quadraticCurveTo(x0 + w * 0.27, y + h * 0.18, x0 + w * 0.36, y);
  }
  ctx.stroke();
}

function drawFillerSymbol(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y - h * 0.36);
  ctx.lineTo(x + w * 0.35, y - h * 0.36);
  ctx.lineTo(x + w * 0.13, y);
  ctx.lineTo(x - w * 0.13, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeRect(x - w * 0.32, y + h * 0.08, w * 0.64, h * 0.36);
}

function pfdPort(node, side) {
  if (side === "left") return { x: node.x - node.w / 2, y: node.y };
  if (side === "right") return { x: node.x + node.w / 2, y: node.y };
  if (side === "top") return { x: node.x, y: node.y - node.h / 2 };
  return { x: node.x, y: node.y + node.h / 2 };
}

function pfdColor(kind) {
  return {
    media: ciPalette.media,
    seed: ciPalette.cells,
    production: ciPalette.production,
    clarification: ciPalette.energy,
    washing: ciPalette.energy,
    extrusion: ciPalette.energy,
    packaging: ciPalette.product,
    cells: ciPalette.cells,
    energy: ciPalette.energy,
    utility: ciPalette.utility,
    waste: ciPalette.waste,
    product: ciPalette.product,
  }[kind] || ciPalette.media;
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawPfdLegend(ctx, rect) {
  const items = [
    ["media", "medium"],
    ["cells", "cells / biomass"],
    ["energy", "thermal duty"],
    ["utility", "utility"],
    ["waste", "waste / vent"],
    ["product", "product"],
  ];
  const width = 156;
  const x = rect.width - width - 24;
  const y = 18;
  ctx.save();
  roundRect(ctx, x, y, width, 58, 8);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(23,23,28,0.1)";
  ctx.stroke();
  ctx.font = `700 9px ${canvasFontFamily}`;
  ctx.textAlign = "left";
  items.forEach((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const lx = x + 12 + col * 74;
    const ly = y + 17 + row * 16;
    ctx.strokeStyle = pfdColor(item[0]);
    ctx.lineWidth = 2;
    if (["energy", "utility", "waste"].includes(item[0])) ctx.setLineDash([5, 4]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 18, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ciPalette.muted;
    ctx.fillText(item[1], lx + 24, ly + 3);
  });
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function timelineMetricCatalog() {
  return [
    { key: "cells", field: "growthIndex", label: "log10 cells", color: ciPalette.cells },
    { key: "biomass", field: "biomass", label: "biomass kg", color: ciPalette.product },
    { key: "energy", field: "energy", label: "cumulative kWh", color: ciPalette.media },
    { key: "medium", field: "medium", label: "medium kg", color: ciPalette.utility },
    { key: "oxygen", field: "oxygen", label: "O2 kg", color: ciPalette.energy },
    { key: "co2", field: "co2", label: "CO2 kg", color: ciPalette.waste },
    { key: "utilityWater", field: "utilityWater", label: "utility water kg", color: "#5e6a75" },
  ];
}

function selectedTimelineMetrics() {
  const boxes = Array.from(timelineMetricControls?.querySelectorAll("[data-timeline-metric]") || []);
  const selected = boxes.filter((box) => box.checked).map((box) => box.dataset.timelineMetric);
  return selected.length ? selected : ["cells", "biomass", "energy"];
}

function drawTimeline(sim, currentTime) {
  const rect = resizeCanvas(timelineCanvas, timelineCtx);
  const ctx = timelineCtx;
  ctx.clearRect(0, 0, rect.width, rect.height);
  const padL = 58;
  const padR = 58;
  const padT = 34;
  const selectedKeys = selectedTimelineMetrics();
  const selectedMetrics = timelineMetricCatalog().filter((metric) => selectedKeys.includes(metric.key));
  const estimatedLegendCols = rect.width > 760 ? 4 : rect.width > 560 ? 3 : rect.width > 420 ? 2 : 1;
  const padB = 44 + Math.ceil(Math.max(selectedMetrics.length, 1) / estimatedLegendCols) * 18;
  const w = rect.width - padL - padR;
  const h = rect.height - padT - padB;
  const chartPoints = sim.timeline.map((point) => ({
    ...point,
    growthIndex: Math.log10(Math.max(point.cells, 1)),
  }));

  ctx.fillStyle = "rgba(248,251,253,0.86)";
  roundRect(ctx, 10, 10, rect.width - 20, rect.height - 20, 8);
  ctx.fill();

  sim.timing.segments.forEach((segment, index) => {
    const x0 = padL + (segment.startH / sim.totalTimeH) * w;
    const x1 = padL + (segment.endH / sim.totalTimeH) * w;
    ctx.fillStyle = index % 2 === 0 ? "rgba(31,42,55,0.032)" : "rgba(58,110,165,0.035)";
    ctx.fillRect(x0, padT, Math.max(x1 - x0, 1), h);
    if (x1 - x0 > 58) {
      ctx.fillStyle = "rgba(17,24,39,0.54)";
      ctx.font = `700 10px ${canvasFontFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(segment.label, x0 + (x1 - x0) / 2, padT - 10);
    }
  });

  ctx.strokeStyle = "rgba(16,24,32,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(16,24,32,0.22)";
  ctx.strokeRect(padL, padT, w, h);
  [0, 0.5, 1].forEach((fraction) => {
    const xTick = padL + w * fraction;
    ctx.fillStyle = "rgba(16,20,24,0.52)";
    ctx.font = `10px ${canvasFontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(`${fmt(sim.totalTimeH * fraction, 0)} h`, xTick, padT + h + 18);
  });

  selectedMetrics.forEach((metric) => {
    const maxValue = Math.max(...chartPoints.map((point) => Math.abs(point[metric.field] || 0)), 1);
    drawLine(ctx, chartPoints, padL, padT, w, h, sim.totalTimeH, maxValue, metric.field, metric.color);
  });

  const x = padL + (currentTime / sim.totalTimeH) * w;
  ctx.strokeStyle = ciPalette.graphite;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, padT);
  ctx.lineTo(x, padT + h);
  ctx.stroke();

  ctx.fillStyle = ciPalette.graphite;
  ctx.font = `700 12px ${canvasFontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(`${fmt(currentTime, 1)} h · ${currentPhaseLabel(sim, currentTime)}`, Math.min(x + 8, rect.width - 230), padT + 18);
  ctx.fillStyle = "rgba(16,20,24,0.62)";
  const topLabels = selectedMetrics.slice(0, 2).map((metric) => {
    const maxValue = Math.max(...chartPoints.map((point) => Math.abs(point[metric.field] || 0)), 1);
    return `${metric.label} max ${metric.key === "cells" ? fmt(maxValue, 1) : fmt(maxValue, 0)}`;
  });
  ctx.fillText(topLabels.join(" · ") || `${scientific(sim.finalStage.endCells)} final cells`, padL, padT - 12);
  ctx.textAlign = "right";
  ctx.fillText(`total ${fmt(sim.totalTimeH, 2)} h`, padL + w, padT - 12);

  const legendCols = Math.max(1, Math.min(4, Math.floor(w / 170)));
  selectedMetrics.forEach((metric, index) => {
    const col = index % legendCols;
    const row = Math.floor(index / legendCols);
    const lx = padL + col * Math.min(172, w / legendCols);
    const ly = rect.height - 34 + row * 16;
    ctx.fillStyle = metric.color;
    ctx.beginPath();
    ctx.arc(lx + 5, ly - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(16,20,24,0.7)";
    ctx.textAlign = "left";
    ctx.font = `700 11px ${canvasFontFamily}`;
    ctx.fillText(metric.label, lx + 15, ly);
  });
  ctx.fillStyle = "rgba(16,20,24,0.52)";
  ctx.textAlign = "right";
  ctx.fillText("normalized per selected signal", padL + w, rect.height - 14);
}

function drawLine(ctx, points, padX, padY, w, h, totalTime, maxValue, key, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = padX + (point.t / totalTime) * w;
    const y = padY + h - (point[key] / maxValue) * h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const last = points[points.length - 1];
  const endX = padX + (last.t / totalTime) * w;
  const endY = padY + h - (last[key] / maxValue) * h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(endX, endY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function downloadDataPackage(sim) {
  const devices = deviceCatalog(sim);
  const streams = streamCatalog(sim);
  const equationsList = allEquationEntries(sim);
  return {
    summary: {
      model: modelName,
      scenario: presetConfig[currentPreset].title,
      preset: currentPreset,
      generated_at: new Date().toISOString(),
      final_str_volume_L: sim.params.finalVolumeL,
      peak_vcd_cells_mL: sim.params.peakVcd,
      packaged_product_kg: sim.downstream.packagedKg,
      paper_reported_ds102_kg: paperReportedProduct.packagedKg,
      paper_reported_ds102_entities: paperReportedProduct.entities,
      filled_bulk_product_kg: sim.downstream.filledBulkProductKg,
      filling_calibration_kg: sim.downstream.fillingCalibrationKg,
      biomass_kg: sim.reaction.biomassKg,
      total_process_time_h: sim.totalTimeH,
      time_balance_h: {
        media_prep: sim.timing.mediaPrepH,
        seed_train: sim.timing.seedTrainH,
        production: sim.timing.productionH,
        downstream: sim.timing.downstreamH,
        closeout: sim.timing.closeoutH,
        sum: sim.timing.sumH,
      },
      total_energy_kwh: sim.energy.totalEnergyKwh,
      medium_kg: sim.medium.mediumKg,
      selected_timeline_variables: selectedTimelineMetrics(),
    },
    equipmentTable: devices.map((device) => ({
      key: device.key,
      id: device.id,
      title: device.title,
      type: device.type,
      process_step: device.step?.title,
      value: device.value,
      properties: device.properties,
      equations: device.reactions,
      mass_balance: device.massBalance,
      utilities: device.energy,
    })),
    streamTable: streams.map((streamItem) => ({
      key: streamItem.key,
      title: streamItem.title,
      from: streamItem.from,
      to: streamItem.to,
      category: streamItem.category,
      value: streamItem.value,
      properties: streamItem.properties,
      equations: streamEquations(streamItem),
    })),
    chemicalEquationRegister: equationsList.map((item) => ({
      title: item.title,
      expression: item.expression,
    })),
    processStepBalances: processStepCatalog(sim).map((step) => ({
      key: step.key,
      badge: step.badge,
      title: step.title,
      unit: step.unit,
      inputs: step.inputs,
      outputs: step.outputs,
      utilities: step.utilities,
      equations: step.equations,
    })),
    utilityTable: Object.entries(sim.utility).map(([key, value]) => ({ key, value })),
    energyTable: Object.entries(sim.energy).map(([key, value]) => ({ key, value_kwh: value })),
    timingTable: [
      { step: "media_prep", duration_h: sim.timing.mediaPrepH },
      { step: "seed_train", duration_h: sim.timing.seedTrainH },
      { step: "production", duration_h: sim.timing.productionH },
      { step: "downstream_processing", duration_h: sim.timing.downstreamH },
      { step: "batch_closeout", duration_h: sim.timing.closeoutH },
      { step: "total", duration_h: sim.timing.sumH, matches_displayed_total: sim.timing.addsUp },
    ],
    timelineTable: sim.timeline.map((point) => ({
      time_h: point.t,
      stage: point.stage,
      cells: point.cells,
      biomass_kg: point.biomass,
      cumulative_energy_kwh: point.energy,
      prepared_medium_kg: point.medium,
      cumulative_oxygen_kg: point.oxygen,
      cumulative_co2_kg: point.co2,
      cumulative_utility_water_kg: point.utilityWater,
    })),
    timelineVariableCatalog: timelineMetricCatalog().map((metric) => ({
      key: metric.key,
      label: metric.label,
      exported_column: metric.field === "growthIndex" ? "cells" : metric.field,
    })),
    referenceComparisons: referenceComparisons(sim),
    plantIntelligence: plantInsights(sim),
    operationExplanations: operationExplanationData(sim),
    referenceAssetManifest: referenceAssets.map((asset) => ({
      file: asset,
      download_section_only: true,
    })),
  };
}

function dataForExport(scope = "full") {
  const sim = simulation || simulate();
  const deviceKey = scope.startsWith("device-") ? scope.replace("device-", "") : null;
  const streamKey = scope.startsWith("stream-") ? scope.replace("stream-", "") : null;
  const nodeKey = scope.startsWith("node-") ? scope.replace("node-", "") : null;
  const stageId = scope.startsWith("stage-") ? scope.replace("stage-", "") : null;
  if (deviceKey) {
    const devices = deviceCatalog(sim);
    const streams = streamCatalog(sim);
    const device = devices.find((item) => item.key === deviceKey);
    return {
      generatedAt: new Date().toISOString(),
      scope,
      type: "equipment",
      preset: currentPreset,
      scenarioTitle: presetConfig[currentPreset].title,
      equipment: device,
      connectedStreams: streams.filter((item) => item.fromKey === deviceKey || item.toKey === deviceKey),
      processStep: device?.step,
      parameters: sim.params,
    };
  }
  if (streamKey) {
    const streams = streamCatalog(sim);
    const devices = deviceCatalog(sim);
    const streamItem = streams.find((item) => item.key === streamKey);
    return {
      generatedAt: new Date().toISOString(),
      scope,
      type: "stream",
      preset: currentPreset,
      scenarioTitle: presetConfig[currentPreset].title,
      stream: streamItem,
      connectedEquipment: devices.filter((item) => item.key === streamItem?.fromKey || item.key === streamItem?.toKey),
      equations: streamItem ? streamEquations(streamItem, sim) : [],
      parameters: sim.params,
    };
  }
  if (nodeKey) {
    const step = processStepCatalog(sim).find((item) => item.key === nodeKey);
    return {
      generatedAt: new Date().toISOString(),
      scope,
      preset: currentPreset,
      scenarioTitle: presetConfig[currentPreset].title,
      processStep: step,
      parameters: sim.params,
    };
  }
  if (stageId) {
    const stage = sim.stages.find((item) => item.id === stageId);
    const dspStep = processStepCatalog(sim).find((item) => item.badge === stageId);
    return {
      generatedAt: new Date().toISOString(),
      scope,
      preset: currentPreset,
      scenarioTitle: presetConfig[currentPreset].title,
      stage: stage || dspStep,
      parameters: sim.params,
    };
  }
  const report = {
    generatedAt: new Date().toISOString(),
    scope,
    preset: currentPreset,
    scenarioTitle: presetConfig[currentPreset].title,
    parameters: sim.params,
    medium: sim.medium,
    stages: sim.stages,
    reaction: sim.reaction,
    downstream: sim.downstream,
    energy: sim.energy,
    utility: sim.utility,
    timing: sim.timing,
    equations: allEquationEntries(sim),
    processSteps: processStepCatalog(sim),
    devices: deviceCatalog(sim),
    streams: streamCatalog(sim),
    dataPackage: downloadDataPackage(sim),
    referenceComparisons: referenceComparisons(sim),
    plantIntelligence: plantInsights(sim),
    selectedProcessStep: selectedStepKey,
    selectedFactoryDetail: selectedDetail,
    referenceAssets,
    operationExplanations: operationExplanationData(sim),
  };
  if (scope === "parameters") return { parameters: report.parameters };
  if (scope === "equations") return { equations: report.equations };
  if (scope === "streams") return { medium: report.medium, reaction: report.reaction, downstream: report.downstream };
  if (scope === "timeline") return { timeline: sim.timeline, timing: sim.timing };
  if (scope === "summary") {
    return {
      scenarioTitle: report.scenarioTitle,
      packagedProductKg: sim.downstream.packagedKg,
      biomassKg: sim.reaction.biomassKg,
      totalTimeH: sim.totalTimeH,
      totalEnergyKwh: sim.energy.totalEnergyKwh,
      mediumKg: sim.medium.mediumKg,
    };
  }
  if (scope === "process") return { processSteps: report.processSteps, utility: report.utility };
  if (scope === "stages") return { stages: report.stages, processSteps: report.processSteps };
  if (scope === "references") return { referenceAssets: report.referenceAssets };
  if (scope === "reference-values") return { referenceComparisons: report.referenceComparisons };
  if (scope === "plant") return { devices: report.devices, streams: report.streams, processSteps: report.processSteps, referenceComparisons: report.referenceComparisons, plantIntelligence: report.plantIntelligence };
  if (scope === "data-package") return report.dataPackage;
  if (scope === "operation-notes") return report.operationExplanations;
  if (scope === "exports") return report;
  return report;
}

function toCsv(data) {
  const rows = [["path", "value"]];
  flattenExportRows(data, "", rows);
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function flattenExportRows(value, prefix, rows) {
  if (value === null || value === undefined) {
    rows.push([prefix, ""]);
    return;
  }
  if (typeof value !== "object") {
    rows.push([prefix, value]);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenExportRows(item, `${prefix}[${index}]`, rows));
    return;
  }
  Object.entries(value).forEach(([key, item]) => {
    flattenExportRows(item, prefix ? `${prefix}.${key}` : key, rows);
  });
}

function toMarkdown(scope = "full") {
  const sim = simulation || simulate();
  const data = dataForExport(scope);
  if (data.equipment) return equipmentMarkdown(data);
  if (data.stream) return streamMarkdown(data);
  if (data.processStep) return stepMarkdown(data.processStep, data);
  if (data.stage) {
    return [
      `# ${modelName} Stage Report`,
      "",
      `Scenario: ${data.scenarioTitle}`,
      `Scope: ${data.scope}`,
      "",
      "```json",
      JSON.stringify(data.stage, null, 2),
      "```",
      "",
      `<small>${modelAttribution}</small>`,
    ].join("\n");
  }
  const steps = processStepCatalog(sim);
  return [
    `# ${modelName} Process Report`,
    "",
    `Scenario: ${presetConfig[currentPreset].title}`,
    `Final volume: ${fmt(sim.params.finalVolumeL)} L`,
    `Peak VCD: ${scientific(sim.params.peakVcd)} cells/mL`,
    `Packaged product: ${fmtKg(sim.downstream.packagedKg)}`,
    `Total energy estimate: ${fmt(sim.energy.totalEnergyKwh, 1)} kWh`,
    `Time balance: ${fmt(sim.timing.mediaPrepH, 2)} h media + ${fmt(sim.timing.seedTrainH, 2)} h seed + ${fmt(sim.timing.productionH, 2)} h production + ${fmt(sim.timing.downstreamH, 2)} h downstream + ${fmt(sim.timing.closeoutH, 2)} h closeout = ${fmt(sim.timing.sumH, 2)} h`,
    "",
    "## Equations",
    ...allEquationEntries(sim).map((item) => `- ${item.title}: ${item.expression}`),
    "",
    "## Process step equations",
    ...steps.flatMap((step) => [
      `### ${step.badge} ${step.title}`,
      ...step.equations.map((equation) => `- ${equation}`),
      `- Inputs: ${JSON.stringify(step.inputs)}`,
      `- Outputs: ${JSON.stringify(step.outputs)}`,
    ]),
    "",
    "## Stage outputs",
    ...sim.stages.map((stage) => `- ${stage.id}: ${scientific(stage.endCells)} cells, ${fmt(stage.agitationKwh, 1)} kWh agitation`),
    "",
    "## Export scope data",
    "```json",
    JSON.stringify(data, null, 2),
    "```",
    "",
    `<small>${modelAttribution}</small>`,
  ].join("\n");
}

function equipmentMarkdown(data) {
  const item = data.equipment;
  return [
    `# ${item.id} ${item.title}`,
    "",
    `Scenario: ${data.scenarioTitle}`,
    `Type: ${item.type}`,
    `Process step: ${item.step?.title || item.stepKey}`,
    `Current value: ${item.value}`,
    "",
    "## Physical properties",
    "```json",
    JSON.stringify(item.properties, null, 2),
    "```",
    "",
    "## Chemical and physical equations",
    ...item.reactions.map((equation) => `- ${equation}`),
    "",
    "## Mass balance",
    "```json",
    JSON.stringify(item.massBalance, null, 2),
    "```",
    "",
    "## Energy and utilities",
    "```json",
    JSON.stringify(item.energy, null, 2),
    "```",
    "",
    "## Connected streams",
    ...data.connectedStreams.map((streamItem) => `- ${streamItem.title}: ${streamItem.from} -> ${streamItem.to}, ${streamItem.value}`),
    "",
    `<small>${modelAttribution}</small>`,
  ].join("\n");
}

function streamMarkdown(data) {
  const item = data.stream;
  return [
    `# ${item.title}`,
    "",
    `Scenario: ${data.scenarioTitle}`,
    `Route: ${item.from} -> ${item.to}`,
    `Category: ${item.category}`,
    `Current value: ${item.value}`,
    "",
    "## Physical properties",
    "```json",
    JSON.stringify(item.properties, null, 2),
    "```",
    "",
    "## Chemical and physical equations",
    ...data.equations.map((equation) => `- ${equation}`),
    "",
    "## Mass balance",
    `- from: ${item.from}`,
    `- to: ${item.to}`,
    `- value: ${item.value}`,
    "",
    "## Connected equipment",
    ...data.connectedEquipment.map((device) => `- ${device.id} ${device.title}: ${device.type}`),
    "",
    `<small>${modelAttribution}</small>`,
  ].join("\n");
}

function stepMarkdown(step, data = {}) {
  return [
    `# ${step.badge} ${step.title}`,
    "",
    `Scenario: ${data.scenarioTitle || presetConfig[currentPreset].title}`,
    `Unit: ${step.unit}`,
    `Current value: ${step.value}`,
    "",
    "## Equations",
    ...step.equations.map((equation) => `- ${equation}`),
    "",
    "## Inputs",
    "```json",
    JSON.stringify(step.inputs, null, 2),
    "```",
    "",
    "## Outputs",
    "```json",
    JSON.stringify(step.outputs, null, 2),
    "```",
    "",
    "## Utilities",
    "```json",
    JSON.stringify(step.utilities, null, 2),
    "```",
    "",
    `<small>${modelAttribution}</small>`,
  ].join("\n");
}

function reportPrintStyles() {
  return `
    :root{color-scheme:light}
    *{box-sizing:border-box}
    body{font-family:${canvasFontFamily};margin:40px;line-height:1.45;color:${ciPalette.text};background:${ciPalette.page};-webkit-font-smoothing:antialiased}
    main{max-width:1080px;margin:auto}
    section{background:${ciPalette.surface};border:1px solid ${ciPalette.line};border-radius:8px;padding:18px;margin:16px 0;box-shadow:0 12px 34px rgba(31,42,55,0.06)}
    h1{font-size:34px;letter-spacing:0;margin:0 0 4px} h2{font-size:20px;margin:0 0 10px} h3{font-size:12px;color:${ciPalette.muted};letter-spacing:0;text-transform:uppercase}
    p{color:${ciPalette.muted}} code,pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f8fafc;border:1px solid #e8eef5;border-radius:6px;padding:8px;color:${ciPalette.graphite}}
    table{width:100%;border-collapse:collapse;background:${ciPalette.surface};border:1px solid ${ciPalette.line};border-radius:8px;overflow:hidden}td,th{border-bottom:1px solid ${ciPalette.line};padding:8px;text-align:left;vertical-align:top}th{color:${ciPalette.muted};font-size:12px;text-transform:uppercase}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric{background:${ciPalette.surface};border:1px solid ${ciPalette.line};border-radius:8px;padding:14px}.metric span{display:block;color:${ciPalette.muted};font-size:12px}.metric strong{font-size:22px;color:${ciPalette.graphite}}
    .report-attribution{margin-top:28px;text-align:right;color:${ciPalette.muted};font-size:10px;line-height:1.2;opacity:.68}
  `;
}

function completeHtmlReport() {
  const sim = simulation || simulate();
  const report = dataForExport("full");
  const dataPack = report.dataPackage;
  const steps = processStepCatalog(sim);
  const devices = deviceCatalog(sim);
  const streams = streamCatalog(sim);
  const equationsHtml = allEquationEntries(sim)
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br><code>${escapeHtml(item.expression)}</code></li>`)
    .join("");
  const referencesHtml = referenceAssets
    .map((asset) => `<li><a href="${escapeHtml(asset)}">${escapeHtml(asset)}</a></li>`)
    .join("");
  const referenceHtml = referenceComparisons(sim)
    .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(formatValue(item.live))} ${escapeHtml(item.unit)}</td><td>${escapeHtml(formatValue(item.paperReference))} ${escapeHtml(item.unit)}</td><td>Δ ${escapeHtml(formatDelta(item))}</td></tr>`)
    .join("");
  const energyHtml = dataPack.energyTable
    .map((item) => `<tr><td>${escapeHtml(item.key)}</td><td>${escapeHtml(formatValue(item.value_kwh))} kWh</td></tr>`)
    .join("");
  const timingHtml = dataPack.timingTable
    .map((item) => `<tr><td>${escapeHtml(item.step)}</td><td>${escapeHtml(formatValue(item.duration_h))} h</td><td>${item.matches_displayed_total === undefined ? "" : escapeHtml(String(item.matches_displayed_total))}</td></tr>`)
    .join("");
  const utilityHtml = dataPack.utilityTable
    .map((item) => `<tr><td>${escapeHtml(item.key)}</td><td>${escapeHtml(formatValue(item.value))}</td></tr>`)
    .join("");
  const timelineHtml = dataPack.timelineTable
    .map((item) => `<tr><td>${escapeHtml(formatValue(item.time_h))}</td><td>${escapeHtml(item.stage)}</td><td>${escapeHtml(formatValue(item.cells))}</td><td>${escapeHtml(formatValue(item.biomass_kg))}</td><td>${escapeHtml(formatValue(item.cumulative_energy_kwh))}</td><td>${escapeHtml(formatValue(item.prepared_medium_kg))}</td><td>${escapeHtml(formatValue(item.cumulative_oxygen_kg))}</td><td>${escapeHtml(formatValue(item.cumulative_co2_kg))}</td><td>${escapeHtml(formatValue(item.cumulative_utility_water_kg))}</td></tr>`)
    .join("");
  const equipmentHtml = devices
    .map((device) => `
      <section>
        <h2>${escapeHtml(device.id)} · ${escapeHtml(device.title)}</h2>
        <p>${escapeHtml(device.type)} · ${escapeHtml(device.value)}</p>
        <h3>Physical properties</h3>
        <pre>${escapeHtml(JSON.stringify(device.properties, null, 2))}</pre>
        <h3>Chemical and physical equations</h3>
        <ul>${device.reactions.map((equation) => `<li><code>${escapeHtml(equation)}</code></li>`).join("")}</ul>
        <h3>Mass balance</h3>
        <pre>${escapeHtml(JSON.stringify(device.massBalance, null, 2))}</pre>
        <h3>Energy and utilities</h3>
        <pre>${escapeHtml(JSON.stringify(device.energy, null, 2))}</pre>
      </section>
    `)
    .join("");
  const streamHtml = streams
    .map((streamItem) => `
      <tr>
        <td>${escapeHtml(streamItem.title)}</td>
        <td>${escapeHtml(streamItem.from)}</td>
        <td>${escapeHtml(streamItem.to)}</td>
        <td>${escapeHtml(streamItem.category)}</td>
        <td>${escapeHtml(streamItem.value)}</td>
        <td>${streamEquations(streamItem).map((equation) => `<code>${escapeHtml(equation)}</code>`).join("<br>")}</td>
      </tr>
    `)
    .join("");
  const stepHtml = steps
    .map((step) => `
      <section>
        <h2>${escapeHtml(step.badge)} · ${escapeHtml(step.title)}</h2>
        <p>${escapeHtml(step.unit)}</p>
        <p>${escapeHtml(step.detail)}</p>
        <h3>Equations</h3>
        <ul>${step.equations.map((equation) => `<li><code>${escapeHtml(equation)}</code></li>`).join("")}</ul>
        <h3>Inputs</h3>
        <pre>${escapeHtml(JSON.stringify(step.inputs, null, 2))}</pre>
        <h3>Outputs</h3>
        <pre>${escapeHtml(JSON.stringify(step.outputs, null, 2))}</pre>
        <h3>Utilities</h3>
        <pre>${escapeHtml(JSON.stringify(step.utilities, null, 2))}</pre>
      </section>
    `)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(modelName)} Process Export</title>
  <style>
    ${reportPrintStyles()}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(modelName)} Process Export</h1>
    <p>${escapeHtml(presetConfig[currentPreset].title)} · generated ${escapeHtml(report.generatedAt)}</p>
    <div class="grid">
      <div class="metric"><span>Packaged mass</span><strong>${escapeHtml(fmtKg(sim.downstream.packagedKg))}</strong></div>
      <div class="metric"><span>Biomass</span><strong>${escapeHtml(fmtKg(sim.reaction.biomassKg))}</strong></div>
      <div class="metric"><span>Energy</span><strong>${escapeHtml(fmt(sim.energy.totalEnergyKwh, 0))} kWh</strong></div>
      <div class="metric"><span>Process time</span><strong>${escapeHtml(fmt(sim.totalTimeH, 1))} h</strong></div>
    </div>
    <section>
      <h2>Global equations</h2>
      <ul>${equationsHtml}</ul>
    </section>
    <section>
      <h2>Factory streams</h2>
      <table>
        <thead><tr><th>Stream</th><th>From</th><th>To</th><th>Type</th><th>Value</th><th>Equations</th></tr></thead>
        <tbody>${streamHtml}</tbody>
      </table>
    </section>
    <section>
      <h2>Energy table</h2>
      <table><thead><tr><th>Item</th><th>kWh</th></tr></thead><tbody>${energyHtml}</tbody></table>
    </section>
    <section>
      <h2>Time balance</h2>
      <table><thead><tr><th>Segment</th><th>Duration</th><th>Check</th></tr></thead><tbody>${timingHtml}</tbody></table>
    </section>
    <section>
      <h2>Utility table</h2>
      <table><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>${utilityHtml}</tbody></table>
    </section>
    <section>
      <h2>Timeline table</h2>
      <table><thead><tr><th>Time h</th><th>Stage</th><th>Cells</th><th>Biomass kg</th><th>Cumulative kWh</th><th>Medium kg</th><th>O2 kg</th><th>CO2 kg</th><th>Utility water kg</th></tr></thead><tbody>${timelineHtml}</tbody></table>
    </section>
    <section>
      <h2>Paper reference values</h2>
      <table><thead><tr><th>Value</th><th>Live app</th><th>Paper reference</th><th>Delta</th></tr></thead><tbody>${referenceHtml}</tbody></table>
    </section>
    <section>
      <h2>Factory equipment</h2>
      <p>Each listed unit matches a clickable object on the first page of the web app.</p>
    </section>
    ${equipmentHtml}
    ${stepHtml}
    <section>
      <h2>Reference assets from uploaded ZIPs</h2>
      <ul>${referencesHtml}</ul>
    </section>
    <section>
      <h2>Full JSON payload</h2>
      <pre>${escapeHtml(JSON.stringify(report, null, 2))}</pre>
    </section>
    <p class="report-attribution">${escapeHtml(modelAttribution)}</p>
  </main>
</body>
</html>`;
}

function detailHtmlReport(scope) {
  const data = dataForExport(scope);
  const title = data.equipment ? `${data.equipment.id} ${data.equipment.title}` : data.stream ? data.stream.title : "Factory detail";
  const properties = data.equipment ? data.equipment.properties : data.stream?.properties;
  const equations = data.equipment ? data.equipment.reactions : data.equations || [];
  const balance = data.equipment
    ? data.equipment.massBalance
    : { from: data.stream?.from, to: data.stream?.to, value: data.stream?.value };
  const utilities = data.equipment ? data.equipment.energy : { category: data.stream?.category };
  const connected = data.equipment
    ? data.connectedStreams.map((item) => `${item.title}: ${item.from} -> ${item.to}, ${item.value}`)
    : data.connectedEquipment.map((item) => `${item.id} ${item.title}: ${item.type}`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} Export</title>
  <style>
    ${reportPrintStyles()}
    main{max-width:900px}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(data.scenarioTitle)} · generated ${escapeHtml(data.generatedAt)}</p>
    <section>
      <h2>Physical properties</h2>
      <pre>${escapeHtml(JSON.stringify(properties, null, 2))}</pre>
    </section>
    <section>
      <h2>Chemical, physical, mass and energy equations</h2>
      <ul>${equations.map((equation) => `<li><code>${escapeHtml(equation)}</code></li>`).join("")}</ul>
    </section>
    <section>
      <h2>Mass balance</h2>
      <pre>${escapeHtml(JSON.stringify(balance, null, 2))}</pre>
    </section>
    <section>
      <h2>Energy and utilities</h2>
      <pre>${escapeHtml(JSON.stringify(utilities, null, 2))}</pre>
    </section>
    <section>
      <h2>Connected objects</h2>
      <ul>${connected.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <h2>JSON payload</h2>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </section>
    <p class="report-attribution">${escapeHtml(modelAttribution)}</p>
  </main>
</body>
</html>`;
}

function stepHtmlReport(stepKey) {
  const data = dataForExport(`node-${stepKey}`);
  const step = data.processStep;
  if (!step) return completeHtmlReport();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(step.title)} Export</title>
  <style>
    ${reportPrintStyles()}
    main{max-width:900px}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(step.badge)} · ${escapeHtml(step.title)}</h1>
    <p>${escapeHtml(data.scenarioTitle)} · generated ${escapeHtml(data.generatedAt)}</p>
    <section>
      <h2>Unit and result</h2>
      <p>${escapeHtml(step.unit)}</p>
      <p>${escapeHtml(step.detail)}</p>
      <p><strong>${escapeHtml(step.value)}</strong></p>
    </section>
    <section>
      <h2>Chemical, mass and energy equations</h2>
      <ul>${step.equations.map((equation) => `<li><code>${escapeHtml(equation)}</code></li>`).join("")}</ul>
    </section>
    <section>
      <h2>Inputs</h2>
      <pre>${escapeHtml(JSON.stringify(step.inputs, null, 2))}</pre>
    </section>
    <section>
      <h2>Outputs</h2>
      <pre>${escapeHtml(JSON.stringify(step.outputs, null, 2))}</pre>
    </section>
    <section>
      <h2>Utilities</h2>
      <pre>${escapeHtml(JSON.stringify(step.utilities, null, 2))}</pre>
    </section>
    <section>
      <h2>JSON payload</h2>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </section>
    <p class="report-attribution">${escapeHtml(modelAttribution)}</p>
  </main>
</body>
</html>`;
}

function download(filename, type, content) {
  const blob = new Blob([content], { type });
  if (lastDownloadUrl) URL.revokeObjectURL(lastDownloadUrl);
  const url = URL.createObjectURL(blob);
  lastDownloadUrl = url;
  const shelf = document.getElementById("downloadShelf");
  if (shelf) {
    shelf.hidden = false;
    shelf.innerHTML = `
      <div>
        <span>Export ready</span>
        <strong>${escapeHtml(filename)}</strong>
      </div>
      <a class="secondary-button" href="${url}" target="_blank" rel="noreferrer">Open</a>
      <a class="primary-button" href="${url}" download="${escapeHtml(filename)}" data-generated-download>Download</a>
      <button class="secondary-button shelf-close" type="button" data-dismiss-download aria-label="Hide export link">x</button>
    `;
    requestAnimationFrame(() => {
      shelf.querySelector("[data-generated-download]")?.click();
    });
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function safeFilename(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function showToast(message) {
  const toast = document.getElementById("exportToast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function showContextMenu(x, y, scope) {
  exportScope = scope || "full";
  contextMenu.hidden = false;
  const menuRect = contextMenu.getBoundingClientRect();
  contextMenu.style.left = `${Math.min(x, window.innerWidth - menuRect.width - 8)}px`;
  contextMenu.style.top = `${Math.min(y, window.innerHeight - menuRect.height - 8)}px`;
}

function hideContextMenu() {
  contextMenu.hidden = true;
}

function showHoverTooltip(target, x, y) {
  if (!hoverTooltip || !target?.dataset.tooltipTitle) return;
  hoverTooltip.hidden = false;
  hoverTooltip.innerHTML = `
    <strong>${escapeHtml(target.dataset.tooltipTitle)}</strong>
    <span>${escapeHtml(target.dataset.tooltipBody || "")}</span>
    ${target.dataset.tooltipMeta ? `<small>${escapeHtml(target.dataset.tooltipMeta)}</small>` : ""}
  `;
  const margin = 14;
  const rect = hoverTooltip.getBoundingClientRect();
  const left = Math.min(x + margin, window.innerWidth - rect.width - margin);
  const top = Math.min(y + margin, window.innerHeight - rect.height - margin);
  hoverTooltip.style.left = `${Math.max(margin, left)}px`;
  hoverTooltip.style.top = `${Math.max(margin, top)}px`;
}

function hideHoverTooltip() {
  if (!hoverTooltip) return;
  hoverTooltip.hidden = true;
}

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const target = event.target.closest("[data-export-scope]");
  showContextMenu(event.clientX, event.clientY, target ? target.dataset.exportScope : "full");
});

document.addEventListener("pointermove", (event) => {
  const target = event.target.closest("[data-tooltip-title]");
  if (!target) {
    hideHoverTooltip();
    return;
  }
  showHoverTooltip(target, event.clientX, event.clientY);
});

document.addEventListener("pointerout", (event) => {
  if (!event.relatedTarget || !event.relatedTarget.closest?.("[data-tooltip-title]")) hideHoverTooltip();
});

document.addEventListener("focusin", (event) => {
  const target = event.target.closest("[data-tooltip-title]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showHoverTooltip(target, rect.left + rect.width / 2, rect.top + rect.height / 2);
});

document.addEventListener("focusout", hideHoverTooltip);

document.addEventListener("click", (event) => {
  if (!event.target.closest("#contextMenu")) hideContextMenu();
});

document.getElementById("downloadShelf")?.addEventListener("click", (event) => {
  const dismiss = event.target.closest("[data-dismiss-download]");
  if (!dismiss) return;
  document.getElementById("downloadShelf").hidden = true;
});

contextMenu.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  if (action === "json") {
    download(`${exportFilePrefix}-${exportScope}-${stamp}.json`, "application/json", JSON.stringify(dataForExport(exportScope), null, 2));
    showToast(`Downloaded ${exportScope} JSON`);
  }
  if (action === "csv") {
    download(`${exportFilePrefix}-${exportScope}-${stamp}.csv`, "text/csv", toCsv(dataForExport(exportScope)));
    showToast(`Downloaded ${exportScope} CSV`);
  }
  if (action === "markdown") {
    download(`${exportFilePrefix}-${exportScope}-report-${stamp}.md`, "text/markdown", toMarkdown(exportScope));
    showToast(`Downloaded ${exportScope} report`);
  }
  if (action === "copy-equations") {
    const text = allEquationEntries(simulation || simulate()).map((item) => `${item.title}: ${item.expression}`).join("\n");
    await navigator.clipboard.writeText(text);
    showToast("Equations copied");
  }
  hideContextMenu();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step-export]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  const stepKey = button.dataset.stepExport;
  const step = processStepCatalog(simulation || simulate()).find((item) => item.key === stepKey);
  download(`${exportFilePrefix}-step-${safeFilename(stepKey)}-${stamp}.html`, "text/html", stepHtmlReport(stepKey));
  showToast(`Downloaded ${step ? step.title : stepKey} step report`);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-detail-export]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  const scope = button.dataset.detailExport;
  download(`${exportFilePrefix}-factory-${safeFilename(scope)}-${stamp}.html`, "text/html", detailHtmlReport(scope));
  showToast("Factory detail report downloaded");
});

factoryMap?.addEventListener("click", (event) => {
  const stream = event.target.closest("[data-select-stream]");
  const device = event.target.closest("[data-select-device]");
  if (stream) {
    selectedDetail = { type: "stream", key: stream.dataset.selectStream };
  } else if (device) {
    selectedDetail = { type: "device", key: device.dataset.selectDevice };
  } else {
    return;
  }
  render();
  requestAnimationFrame(() => {
    unitInspector?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

unitInspector?.addEventListener("click", (event) => {
  const equationsButton = event.target.closest("[data-show-equations]");
  const relatedDevice = event.target.closest("[data-select-related-device]");
  if (equationsButton) {
    selectedStepKey = equationsButton.dataset.showEquations;
    setActiveView("equations");
    render();
  }
  if (relatedDevice && relatedDevice.dataset.selectRelatedDevice) {
    selectedDetail = { type: "device", key: relatedDevice.dataset.selectRelatedDevice };
    render();
  }
});

processDiagram.addEventListener("click", (event) => {
  const node = event.target.closest(".process-node");
  if (!node || !node.dataset.exportScope) return;
  const key = node.dataset.exportScope.replace("node-", "");
  if (key) selectedStepKey = key;
  renderUnitInspector(simulation || simulate());
});

document.getElementById("downloadButton").addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-complete-process-${stamp}.html`, "text/html", completeHtmlReport());
  showToast("Complete process report downloaded");
});

document.querySelectorAll(".view-tab").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
    render();
  });
});

document.getElementById("exportHtmlButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-complete-process-${stamp}.html`, "text/html", completeHtmlReport());
  showToast("Complete HTML report downloaded");
});

document.getElementById("exportJsonButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-full-${stamp}.json`, "application/json", JSON.stringify(dataForExport("full"), null, 2));
  showToast("Full JSON downloaded");
});

document.getElementById("exportDataPackageButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-data-package-${stamp}.json`, "application/json", JSON.stringify(dataForExport("data-package"), null, 2));
  showToast("Data package JSON downloaded");
});

document.getElementById("exportNotesButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-operation-notes-${stamp}.json`, "application/json", JSON.stringify(dataForExport("operation-notes"), null, 2));
  showToast("Operation notes JSON downloaded");
});

document.getElementById("exportCsvButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-full-${stamp}.csv`, "text/csv", toCsv(dataForExport("full")));
  showToast("Full CSV downloaded");
});

document.getElementById("exportMdButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`${exportFilePrefix}-full-${stamp}.md`, "text/markdown", toMarkdown("full"));
  showToast("Markdown report downloaded");
});

document.getElementById("playButton").addEventListener("click", () => {
  isPlaying = !isPlaying;
  updatePlayButton();
  lastFrame = performance.now();
  if (isPlaying) {
    startPlayTimer();
    tick(lastFrame + 100);
  } else {
    stopPlayTimer();
  }
  render();
});

function updatePlayButton() {
  const playButton = document.getElementById("playButton");
  const icon = playButton.querySelector(".button-icon");
  document.getElementById("playButtonText").textContent = isPlaying ? "Pause" : "Play";
  icon.textContent = isPlaying ? "II" : "▶";
  playButton.setAttribute("aria-label", isPlaying ? "Pause process animation" : "Play process animation");
}

function startPlayTimer() {
  stopPlayTimer();
  playTimer = window.setInterval(() => tick(performance.now()), 100);
}

function stopPlayTimer() {
  if (!playTimer) return;
  window.clearInterval(playTimer);
  playTimer = null;
}

function applyPreset(presetKey, resetTime = true) {
  if (!presetConfig[presetKey]) return;
  currentPreset = presetKey;
  Object.entries(presetConfig[currentPreset].values).forEach(([id, value]) => {
    if (controls[id]) controls[id].value = String(value);
  });
  document.querySelectorAll(".preset-button").forEach((item) => {
    item.classList.toggle("active", item.dataset.preset === presetKey);
  });
  if (downloadScenarioSelect) downloadScenarioSelect.value = presetKey;
  if (resetTime) controls.timeSlider.value = "0";
  render();
}

document.querySelectorAll(".preset-button").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

timelineMetricControls?.addEventListener("change", render);

downloadScenarioSelect?.addEventListener("change", () => {
  applyPreset(downloadScenarioSelect.value);
});

function tick(now) {
  if (!isPlaying) {
    stopPlayTimer();
    return;
  }
  const delta = (now - lastFrame) / 1000;
  lastFrame = now;
  const max = n(controls.timeSlider.max);
  let next = n(controls.timeSlider.value) + delta * playSpeedHoursPerSecond;
  if (next >= max) {
    controls.timeSlider.value = String(max);
    isPlaying = false;
    stopPlayTimer();
    updatePlayButton();
    render();
    return;
  }
  controls.timeSlider.value = String(next);
  render();
}

Object.values(controls).forEach((control) => {
  control.addEventListener("input", render);
});

window.addEventListener("resize", render);

render();
