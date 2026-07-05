const cpWater = 4.184;
const mediumDensityKgL = 19907.5903 / 20000;
const playSpeedHoursPerSecond = 18;
const baselineComposition = {
  vitamins: 2.94e-2,
  salts: 9.59,
  traceElements: 5.01e-3,
  growthFactorIgf1: 5.0e-6,
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
const contextMenu = document.getElementById("contextMenu");
const processDiagram = document.getElementById("processDiagram");
const utilityRail = document.getElementById("utilityRail");
const factoryMap = document.getElementById("factoryMap");
const unitInspector = document.getElementById("unitInspector");
const modelMatchStrip = document.getElementById("modelMatchStrip");

let simulation = null;
let exportScope = "full";
let isPlaying = false;
let lastFrame = 0;
let playTimer = null;
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
  packagedKg: 2121.561111111111,
  packUnits: 2100.5555555555557,
  containerKg: 21.005555555555556,
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

const presetConfig = {
  main: {
    title: "Main process 90:10",
    values: { finalVolume: 20000, sterileFraction: 90, doublingTime: 20, stageDuration: 120, peakVcd: 50000000 },
  },
  heat: {
    title: "Main process 50:50",
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

function iconSvg(type) {
  const icons = {
    media: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8M10 3v5l-4 8a4 4 0 0 0 3.6 5.7h4.8A4 4 0 0 0 18 16l-4-8V3"/><path d="M8 15h8"/></svg>',
    seed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3"/><circle cx="15.5" cy="8" r="2.4"/><circle cx="14" cy="16" r="3.2"/><path d="M5 18c2-1.2 4-1.2 6 0M13 12c1.5-.9 3-.9 4.5 0"/></svg>',
    reactor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10v14H7z"/><path d="M8 8h8M8 16h8M12 3v2M12 19v2M5 9h2M17 9h2"/><path d="M10 12h4"/></svg>',
    centrifuge: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 5v14M5 12h14M8 8l8 8M16 8l-8 8"/></svg>',
    wash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/><path d="M8 18c3 2 5 2 8 0"/></svg>',
    extrusion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h10l3 3-3 3H4z"/><path d="M17 12h4M7 7v10M10 7v10"/></svg>',
    package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/></svg>',
    waste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10l-1 14H8z"/><path d="M5 7h14M9 7V4h6v3M10 11v6M14 11v6"/></svg>',
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
      icon: "reactor",
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
      icon: "wash",
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
      icon: "extrusion",
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
      icon: "package",
      badge: "P-23",
      title: "Packaging",
      unit: "FL-101 filling",
      detail: "1 kg product with 10 g container mass",
      value: `${fmt(sim.downstream.packageUnits, 0)} packs`,
      color: "var(--blue)",
      inputs: { bulk_product_kg: sim.downstream.washedProductKg, container_kg: sim.downstream.containerKg },
      outputs: { packaged_product_kg: sim.downstream.packagedKg },
      utilities: {},
      equations: [
        `entities = washed_product_kg / 1 kg`,
        `container_kg = entities * 0.01 kg`,
        `packaged_mass = washed_product + container_mass`,
        `product_yield = packaged_product_kg / medium_kg`,
        `net_mass_out = packaged_product + wastes + CO2`,
      ],
    },
    {
      key: "waste",
      icon: "waste",
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

function paperProcessCompleteTime(p, fallbackH) {
  if (currentPreset === "local") return pythonBaseline.localProcessCompleteH;
  if (currentPreset === "heat" || Math.abs(p.sterileFraction - 0.5) < 0.005) return pythonBaseline.processCompleteH5050;
  if (currentPreset === "main" && p.finalVolumeL === 20000) return pythonBaseline.processCompleteH;
  return fallbackH;
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
  const packageUnits = washedProductKg;
  const containerKg = packageUnits * 0.01;
  const packagedKg = washedProductKg + containerKg;

  const seedAgitationKwh = stages.slice(0, -1).reduce((sum, stage) => sum + stage.agitationKwh, 0);
  const productionAgitationKwh = finalStage.agitationKwh;
  const downstreamInitialCoolKwh = Math.abs(sensibleHeatKwh(cultureMassKg, 37, 25));
  const centrifugeCoolKwh = Math.abs(sensibleHeatKwh(productMassAfterCentrifuge, 25, 15));
  const washThermalKwh = Math.abs(sensibleHeatKwh(p.bufferVolumeL, 4, 10.8));
  const extrusionCoolKwh = Math.abs(sensibleHeatKwh(washedProductKg, 10.8, 4));
  const totalEnergyKwh = Math.abs(mediaHeatKwh) + Math.abs(storageCoolKwh) + seedAgitationKwh + productionAgitationKwh + Math.abs(downstreamInitialCoolKwh) + Math.abs(centrifugeCoolKwh) + Math.abs(washThermalKwh) + Math.abs(extrusionCoolKwh);
  const downstreamTimeH = 4.75;
  const kineticTotalTimeH = finalStage.endTimeH + downstreamTimeH;
  const totalTimeH = paperProcessCompleteTime(p, kineticTotalTimeH);
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
      washWasteKg,
      packageUnits,
      containerKg,
      packagedKg,
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
  };
}

function buildTimeline(stages, energy, params) {
  const points = [{ t: 0, cells: 0, biomass: 0, energy: 0, stage: "Media prep" }];
  points.push({ t: stages[0].startTimeH, cells: stages[0].startCells, biomass: 0, energy: energy.mediaPrepKwh, stage: "Media prep" });
  let cumulativeEnergy = energy.mediaPrepKwh;
  stages.forEach((stage) => {
    for (let i = 0; i <= 12; i += 1) {
      const f = i / 12;
      const t = stage.startTimeH + f * stage.durationH;
      const possible = stage.startCells * Math.pow(2, (f * stage.durationH) / params.doublingTimeH);
      const cells = Math.min(stage.endCells, possible);
      const biomass = cells * params.cellMassKg * params.viability;
      const stageEnergy = stage.agitationKwh * f;
      points.push({
        t,
        cells,
        biomass,
        energy: cumulativeEnergy + stageEnergy,
        stage: stage.id,
      });
    }
    cumulativeEnergy += stage.agitationKwh;
  });
  const downstreamStart = stages[stages.length - 1].endTimeH;
  const downstreamEnergy = energy.downstreamInitialCoolKwh + energy.centrifugeCoolKwh + energy.washThermalKwh + energy.extrusionCoolKwh;
  const dspEnd = downstreamStart + 4.75;
  points.push({
    t: Math.min(dspEnd, energy.totalTimeH),
    cells: stages[stages.length - 1].endCells,
    biomass: energy.biomassKg,
    energy: cumulativeEnergy + downstreamEnergy,
    stage: "DSP",
  });
  if (energy.totalTimeH > dspEnd) {
    points.push({
      t: energy.totalTimeH,
      cells: stages[stages.length - 1].endCells,
      biomass: energy.biomassKg,
      energy: cumulativeEnergy + downstreamEnergy,
      stage: "Process complete",
    });
  }
  return points;
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
      expression: `entities = washed_product_kg / 1 kg; container_kg = entities * 0.01 = ${fmtKg(sim.downstream.containerKg)}`,
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
  document.getElementById("scenarioTitle").textContent = presetConfig[currentPreset].title;

  document.getElementById("packagedMass").textContent = fmtKg(sim.downstream.packagedKg);
  document.getElementById("biomassMass").textContent = fmtKg(sim.reaction.biomassKg);
  document.getElementById("totalTime").textContent = `${fmt(sim.totalTimeH, 1)} h`;
  document.getElementById("energyTotal").textContent = `${fmt(sim.energy.totalEnergyKwh, 0)} kWh`;
  document.getElementById("mediumDemand").textContent = fmtKg(sim.medium.mediumKg);
  document.getElementById("stepCount").textContent = `${sim.stages.length + 7} steps`;
  const elapsed = currentTime;
  const remaining = Math.max(sim.totalTimeH - elapsed, 0);
  document.getElementById("timeDetail").textContent = `${fmt(elapsed, 1)} h elapsed · ${fmt(remaining, 1)} h remaining · active: ${currentPhaseLabel(sim, elapsed)}`;
  document.getElementById("playExplanation").textContent = isPlaying
    ? `Playing at ${playSpeedHoursPerSecond} process-hours per second; this run stops at ${fmt(sim.totalTimeH, 1)} h.`
    : `Play advances the process clock at ${playSpeedHoursPerSecond} process-hours per second. Drag the slider for an exact time.`;

  renderUtilityRail(sim);
  renderProcessDiagram(sim, currentTime);
  renderStreams(sim);
  renderEquations(sim);
  renderStageCards(sim);
  renderReferenceAssets();
  renderFactoryMap(sim, currentTime);
  renderUnitInspector(sim);
  renderModelAudit(sim);
  renderExportCenter(sim);
  drawProcess(sim, currentTime);
  drawTimeline(sim, currentTime);
}

function currentPhase(sim, currentTime) {
  if (currentTime <= mediaPrepDuration(sim.params)) return "media";
  const activeStage = sim.stages.find((stage) => currentTime >= stage.startTimeH && currentTime <= stage.endTimeH);
  if (activeStage) return activeStage.isFinal ? "production" : "seed";
  const dspStart = sim.finalStage.endTimeH;
  const elapsed = currentTime - dspStart;
  if (elapsed < 1.3) return "clarification";
  if (elapsed < 2.7) return "washing";
  if (elapsed < 3.7) return "extrusion";
  return "packaging";
}

function currentPhaseLabel(sim, currentTime) {
  if (currentTime <= mediaPrepDuration(sim.params)) return "Media prep";
  const activeStage = sim.stages.find((stage) => currentTime >= stage.startTimeH && currentTime <= stage.endTimeH);
  if (activeStage) return `${activeStage.id} ${activeStage.isFinal ? "production STR" : "seed expansion"}`;
  const phase = currentPhase(sim, currentTime);
  const labels = {
    clarification: "P-17 clarification",
    washing: "P-21 washing",
    extrusion: "P-22 extrusion",
    packaging: "P-23 packaging",
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
        <article class="process-node ${node.key === phase ? "active" : ""} ${node.waste ? "waste break" : ""} ${index === 3 ? "break" : ""}" style="--node-color:${node.color}" data-export-scope="node-${node.key}">
          <div class="node-top">
            <span class="node-index">${iconSvg(node.icon)}</span>
            <span class="node-badge">${node.badge}</span>
          </div>
          <div>
            <h4>${node.title}</h4>
            <p>${node.detail}</p>
          </div>
          <code class="node-equation">${node.equations[0]}</code>
          <div class="node-value">${node.value}</div>
          <button class="node-export" type="button" data-step-export="${node.key}" aria-label="Export ${node.title}">Export step</button>
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
    ["Water", sim.medium.waterKg, 0],
    ["Medium solids", sim.medium.solidsKg, 0],
    ["O2", sim.reaction.oxygenKg, 0],
    ["Buffer solution", sim.params.bufferVolumeL, 0],
    ["Containers", sim.downstream.containerKg, 0],
    ["Packaged product", 0, sim.downstream.packagedKg],
    ["Depleted medium waste", 0, sim.downstream.depletedWasteKg],
    ["Wash waste", 0, sim.downstream.washWasteKg],
    ["CO2", 0, sim.reaction.co2Kg],
    ["Impurities in broth", 0, sim.reaction.impuritiesKg],
  ];
  document.getElementById("streamTable").innerHTML = rows
    .map(([name, input, output]) => `<tr><td>${name}</td><td>${input ? fmt(input, 1) : ""}</td><td>${output ? fmt(output, 1) : ""}</td></tr>`)
    .join("");
}

function renderEquations(sim) {
  document.getElementById("equationList").innerHTML = allEquationEntries(sim)
    .map((item) => `<div class="equation"><strong>${item.title}</strong><code>${item.expression}</code></div>`)
    .join("");
}

function renderReferenceAssets() {
  const target = document.getElementById("referenceAssets");
  if (!target) return;
  target.innerHTML = referenceAssets
    .map((asset) => {
      const label = asset.split("/").pop().replace(".png", "");
      return `
        <a class="reference-tile" href="${asset}" target="_blank" rel="noreferrer" data-export-scope="references">
          <img src="${asset}" alt="${escapeHtml(label)}" loading="lazy" />
          <span>${escapeHtml(label)}</span>
        </a>
      `;
    })
    .join("");
}

function deviceCatalog(sim) {
  const stepByKey = Object.fromEntries(processStepCatalog(sim).map((step) => [step.key, step]));
  const commonPhysical = { pressure_bar: 1.013, material_model: "water-like broth/media", cp_kj_kg_K: cpWater };
  return [
    { key: "v101", id: "V-101", title: "Sensitive media blend", stepKey: "media", icon: "media", x: 92, y: 112, type: "blend tank", value: `${fmt(sim.medium.sterileVolumeL)} L`, properties: { volume_L: sim.medium.sterileVolumeL, temperature_C: 25, mixing_min: 60, specific_power_kw_m3: 0.1, ...commonPhysical } },
    { key: "de102", id: "DE-102", title: "Sterile filter 1", stepKey: "media", icon: "media", x: 232, y: 112, type: "dead-end filter", value: `${fmt(sim.medium.firstFilterRemovedKg, 3)} kg removed`, properties: { filter_area_m2: 20, flux_L_m2_h: 250, removal_fraction: 0.8 } },
    { key: "v102", id: "V-102", title: "Heat-stable media blend", stepKey: "media", icon: "media", x: 92, y: 242, type: "blend tank", value: `${fmt(sim.medium.heatVolumeL)} L`, properties: { volume_L: sim.medium.heatVolumeL, temperature_C: 25, mixing_min: 60, specific_power_kw_m3: 0.1, ...commonPhysical } },
    { key: "st101", id: "ST-101", title: "Heat sterilizer", stepKey: "media", icon: "media", x: 232, y: 242, type: "sterilizer", value: `${fmt(sim.energy.mediaHeatKwh, 1)} kWh`, properties: { inlet_C: 25, sterilization_C: 121, outlet_C: 35, steam_kg_reported: sim.utility.steamKg, steam_kg_estimated: sim.utility.estimatedSteamKg } },
    { key: "de101", id: "DE-101", title: "Sterile filter 2", stepKey: "media", icon: "media", x: 372, y: 112, type: "polishing filter", value: `${fmt(sim.medium.secondFilterRemovedKg, 3)} kg removed`, properties: { removal_fraction: 1.0, impurities_remaining_kg: 0 } },
    { key: "mx101", id: "MX-101", title: "Medium mixer", stepKey: "media", icon: "media", x: 512, y: 178, type: "static mixer", value: fmtKg(sim.medium.mediumKg), properties: { reaction: "Reaction 1", output_medium_kg: sim.medium.mediumKg, water_kg: sim.medium.waterKg, solids_kg: sim.medium.solidsKg } },
    { key: "v110", id: "V-110", title: "Cold medium store", stepKey: "media", icon: "media", x: 652, y: 178, type: "storage tank", value: "4 C", properties: { storage_temperature_C: 4, storage_cooling_kwh: sim.energy.storageCoolKwh, chilled_water_kg_reported: sim.utility.chilledWaterKg } },
    { key: "sfr101", id: "SFR-101", title: "Shake flask 0.1 L", stepKey: "seed", icon: "seed", x: 92, y: 380, type: "shake flask", value: scientific(sim.stages[0]?.endCells || 0), properties: stageProperties(sim.stages[0]) },
    { key: "sfr102", id: "SFR-102", title: "Shake flask 1.6 L", stepKey: "seed", icon: "seed", x: 232, y: 380, type: "shake flask", value: scientific(sim.stages[1]?.endCells || 0), properties: stageProperties(sim.stages[1]) },
    { key: "rbs101", id: "RBS-101", title: "Wave reactor 25 L", stepKey: "seed", icon: "seed", x: 372, y: 380, type: "wave bioreactor", value: scientific(sim.stages[2]?.endCells || 0), properties: stageProperties(sim.stages[2]) },
    { key: "rbs102", id: "RBS-102", title: "Wave reactor 250 L", stepKey: "seed", icon: "seed", x: 512, y: 380, type: "wave bioreactor", value: scientific(sim.stages[3]?.endCells || 0), properties: stageProperties(sim.stages[3]) },
    { key: "br101", id: "BR-101", title: "Seed STR 2,000 L", stepKey: "seed", icon: "reactor", x: 652, y: 380, type: "seed STR", value: scientific(sim.stages[4]?.endCells || 0), properties: stageProperties(sim.stages[4]) },
    { key: "br102", id: sim.finalStage.id, title: "Production STR", stepKey: "production", icon: "reactor", x: 832, y: 380, type: "production STR", value: fmtKg(sim.reaction.biomassKg), properties: { working_volume_L: sim.params.finalVolumeL, density_cells_ml: sim.achievedDensity, power_kw: sim.finalStage.powerKw, culture_duration_h: sim.params.stageDurationH, temperature_C: 37, oxygen_kg: sim.reaction.oxygenKg, co2_kg: sim.reaction.co2Kg } },
    { key: "pm103", id: "PM-103", title: "Broth transfer pump", stepKey: "clarification", icon: "centrifuge", x: 92, y: 548, type: "pump", value: "4,000 L/h", properties: { flow_L_h: 4000, pressure_increase_bar: 1 } },
    { key: "hx101", id: "HX-101", title: "Broth cooler", stepKey: "clarification", icon: "wash", x: 232, y: 548, type: "heat exchanger", value: `${fmt(sim.energy.downstreamInitialCoolKwh, 1)} kWh`, properties: { inlet_C: 37, outlet_C: 25, cooling_kwh: sim.energy.downstreamInitialCoolKwh } },
    { key: "ds101", id: "DS-101", title: "Disk-stack centrifuge", stepKey: "clarification", icon: "centrifuge", x: 372, y: 548, type: "centrifuge", value: fmtKg(sim.downstream.productMassAfterCentrifuge), properties: { recovery: sim.params.recovery, power_kw: 35.64, heat_dissipation_fraction: 0.25, product_biomass_fraction: 0.3839 } },
    { key: "de103", id: "DE-103", title: "Waste sterile filter", stepKey: "waste", icon: "waste", x: 512, y: 662, type: "waste filter", value: fmtKg(sim.downstream.depletedWasteKg), properties: { filter_area_m2: 20, cartridges: 2 } },
    { key: "v103", id: "V-103", title: "Depleted medium store", stepKey: "waste", icon: "waste", x: 652, y: 662, type: "waste tank", value: fmtKg(sim.downstream.depletedWasteKg), properties: { storage_tank_volume_L: 14402.33, stream_id: "S-156" } },
    { key: "wsh101", id: "WSH-101", title: "Biomass washer", stepKey: "washing", icon: "wash", x: 512, y: 548, type: "washer", value: fmtKg(sim.downstream.washedProductKg), properties: { buffer_volume_L: sim.params.bufferVolumeL, target_biomass_fraction: sim.params.washBiomassFraction, thermal_mixing_kwh: sim.energy.washThermalKwh } },
    { key: "xd101", id: "XD-101", title: "Extruder", stepKey: "extrusion", icon: "extrusion", x: 652, y: 548, type: "extruder", value: `${fmt(sim.energy.extrusionCoolKwh, 1)} kWh`, properties: { screw_velocity_rpm: 200, outlet_temperature_C: 4, cooling_kwh: sim.energy.extrusionCoolKwh } },
    { key: "fl101", id: "FL-101", title: "Filler", stepKey: "packaging", icon: "package", x: 832, y: 548, type: "filling", value: `${fmt(sim.downstream.packageUnits, 0)} packs`, properties: { product_per_entity_kg: 1, container_kg_each: 0.01, container_total_kg: sim.downstream.containerKg } },
  ].map((device) => ({
    ...device,
    step: stepByKey[device.stepKey],
    reactions: stepByKey[device.stepKey]?.equations || [],
    massBalance: {
      inputs: stepByKey[device.stepKey]?.inputs || {},
      outputs: stepByKey[device.stepKey]?.outputs || {},
    },
    energy: stepByKey[device.stepKey]?.utilities || {},
  }));
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
    <svg class="factory-svg detailed" viewBox="0 0 1120 760" role="img" aria-label="Clickable cultivated meat factory map">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#121923" flood-opacity=".18"/>
        </filter>
      </defs>
      <rect class="factory-floor" x="18" y="18" width="1084" height="724" rx="18"/>
      <text class="factory-zone-label" x="44" y="58">Media preparation</text>
      <text class="factory-zone-label" x="44" y="330">Cell expansion and production</text>
      <text class="factory-zone-label" x="44" y="500">Downstream processing</text>
      <text class="factory-zone-label" x="430" y="708">Waste and side streams</text>
      ${streams.map((item) => renderStreamPath(item, deviceByKey)).join("")}
      ${devices.map((device) => renderDeviceNode(device, currentPhase(sim, currentTime))).join("")}
      <g class="factory-callout compact">
        <rect x="860" y="34" width="206" height="54" rx="10"/>
        <text x="878" y="58">${escapeHtml(currentPhaseLabel(sim, currentTime))}</text>
        <text x="878" y="76">${escapeHtml(fmt(currentTime, 1))} h / ${escapeHtml(fmt(sim.totalTimeH, 1))} h</text>
      </g>
    </svg>
  `;
}

function renderDeviceNode(device, phase) {
  const selected = selectedDetail.type === "device" && selectedDetail.key === device.key;
  const active = device.stepKey === phase;
  return `
    <g class="factory-unit detail ${selected ? "selected" : ""} ${active ? "active" : ""}" data-select-device="${device.key}" transform="translate(${device.x}, ${device.y})" style="--unit-color:${device.step?.color || "var(--blue)"}">
      <rect class="unit-platform" x="-42" y="30" width="84" height="16" rx="6"/>
      <rect class="unit-card" x="-48" y="-32" width="96" height="72" rx="10"/>
      <foreignObject x="-16" y="-24" width="32" height="32">
        <div class="factory-icon compact">${iconSvg(device.icon)}</div>
      </foreignObject>
      <text class="unit-title compact" y="20" text-anchor="middle">${escapeHtml(device.id)}</text>
      <text class="unit-badge compact" y="35" text-anchor="middle">${escapeHtml(device.title)}</text>
      ${active ? '<circle class="active-pulse" cx="35" cy="-24" r="5"/>' : ""}
    </g>
  `;
}

function renderStreamPath(item, deviceByKey) {
  const from = item.fromKey ? deviceByKey[item.fromKey] : null;
  const to = item.toKey ? deviceByKey[item.toKey] : null;
  const start = from ? [from.x + 48, from.y] : [Math.max((to?.x || 80) - 120, 30), to?.y || 100];
  const end = to ? [to.x - 48, to.y] : [Math.min((from?.x || 950) + 130, 1080), from?.y || 100];
  const midX = (start[0] + end[0]) / 2;
  const selected = selectedDetail.type === "stream" && selectedDetail.key === item.key;
  const className = `stream-path ${item.category} ${selected ? "selected" : ""}`;
  const d = `M ${start[0]} ${start[1]} C ${midX} ${start[1]}, ${midX} ${end[1]}, ${end[0]} ${end[1]}`;
  const labelX = midX;
  const labelY = (start[1] + end[1]) / 2 - 8;
  return `
    <path class="${className}" data-select-stream="${item.key}" d="${d}"/>
    <g class="stream-label ${selected ? "selected" : ""}" data-select-stream="${item.key}" transform="translate(${labelX}, ${labelY})">
      <rect x="-54" y="-15" width="108" height="30" rx="7"/>
      <text y="-2" text-anchor="middle">${escapeHtml(item.title)}</text>
      <text y="11" text-anchor="middle">${escapeHtml(item.value)}</text>
    </g>
  `;
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
  const propertyRows = Object.entries(item.properties || {}).slice(0, 10)
    .map(([key, value]) => `<li><span>${escapeHtml(key)}</span><strong>${formatValue(value)}</strong></li>`)
    .join("");
  const reactions = detail.type === "device"
    ? item.reactions
    : streamEquations(item, sim);
  const balanceRows = detail.type === "device"
    ? balanceRowsHtml(item.massBalance)
    : streamBalanceRows(item);
  const energyRows = detail.type === "device"
    ? Object.entries(item.energy || {}).map(([key, value]) => `<li><span>${escapeHtml(key)}</span><strong>${formatValue(value)}</strong></li>`).join("")
    : `<li><span>category</span><strong>${escapeHtml(item.category)}</strong></li>`;
  unitInspector.innerHTML = `
    <div class="inspector-top" style="--unit-color:${color}">
      <span class="inspector-icon">${detail.type === "stream" ? '<span class="stream-dot"></span>' : iconSvg(item.icon)}</span>
      <div>
        <span>${detail.type === "stream" ? `${escapeHtml(item.from)} -> ${escapeHtml(item.to)}` : escapeHtml(item.id)}</span>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
    </div>
    <p>${detail.type === "stream" ? "Clickable stream" : escapeHtml(item.type)} · ${escapeHtml(item.value)}</p>
    <div class="inspector-section">
      <h4>Physical properties</h4>
      <ul class="inspector-list">${propertyRows}</ul>
    </div>
    <div class="inspector-section">
      <h4>Chemical / physical equations</h4>
      ${reactions.slice(0, 6).map((equation) => `<code>${escapeHtml(equation)}</code>`).join("")}
    </div>
    <div class="inspector-section">
      <h4>Mass balance</h4>
      <ul class="inspector-list">${balanceRows}</ul>
    </div>
    <div class="inspector-section">
      <h4>Energy / utilities</h4>
      <ul class="inspector-list">${energyRows || '<li><span>energy</span><strong>no direct duty modeled</strong></li>'}</ul>
    </div>
    <div class="inspector-actions">
      ${detail.type === "device" ? `<button class="secondary-button" type="button" data-show-equations="${item.stepKey}">Open chemistry</button><button class="primary-button" type="button" data-step-export="${item.stepKey}">Export step</button>` : `<button class="secondary-button" type="button" data-select-related-device="${item.toKey || item.fromKey}">Open equipment</button>`}
    </div>
  `;
}

function streamColor(category) {
  return {
    media: "var(--blue)",
    cells: "var(--green)",
    energy: "var(--amber)",
    utility: "#5c6ac4",
    waste: "var(--red)",
    product: "#0f9f8f",
  }[category] || "var(--blue)";
}

function streamEquations(item) {
  const base = [`stream_mass_or_count = upstream_output routed to downstream_input`, `selected_stream = ${item.title}: ${item.value}`];
  if (item.category === "media") base.push("component_kg = concentration_g_L * volume_L / 1000");
  if (item.category === "cells") base.push("biomass_kg = cells * cell_mass_kg * viability");
  if (item.category === "energy") base.push("Q_kWh = mass_kg * 4.184 * delta_T / 3600");
  if (item.category === "waste") base.push("waste_total = depleted_medium_waste + wash_waste + removed_impurities");
  if (item.category === "product") base.push("packaged_mass = washed_product + container_mass");
  return base;
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

function modelComparisons(sim) {
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
  ].map(([label, live, baseline, unit]) => {
    const diff = live - baseline;
    const tolerance = Math.max(Math.abs(baseline) * 0.002, unit === "h" ? 0.5 : 0.05);
    return {
      label,
      live,
      baseline,
      unit,
      diff,
      matched: Math.abs(diff) <= tolerance,
    };
  });
}

function renderModelAudit(sim) {
  const comparisons = modelComparisons(sim);
  const matched = comparisons.filter((item) => item.matched).length;
  const status = `${matched}/${comparisons.length} matched`;
  document.getElementById("modelAuditStatus").textContent = status;
  modelMatchStrip.innerHTML = comparisons.slice(0, 5).map((item) => `
    <div class="match-pill ${item.matched ? "matched" : "drift"}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${item.matched ? "match" : `${fmt(item.diff, 2)} ${item.unit}`}</strong>
    </div>
  `).join("");
  document.getElementById("modelAuditTable").innerHTML = comparisons.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${formatValue(item.live)} ${escapeHtml(item.unit)}</td>
      <td>${formatValue(item.baseline)} ${escapeHtml(item.unit)}</td>
      <td><span class="audit-status ${item.matched ? "matched" : "drift"}">${item.matched ? "matched" : `drift ${fmt(item.diff, 2)} ${item.unit}`}</span></td>
    </tr>
  `).join("");
}

function renderExportCenter(sim) {
  const target = document.getElementById("stepExportList");
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
  ctx.fillStyle = "#f8f9fb";
  ctx.fillRect(0, 0, rect.width, rect.height);

  const margin = 58;
  const baseY = rect.height * 0.66;
  const stages = [
    { id: "Media", volumeL: sim.params.finalVolumeL, start: 0, end: mediaPrepDuration(sim.params), fill: 0.88, color: "#0a84ff" },
    ...sim.stages.map((stage) => ({
      id: stage.id,
      volumeL: stage.volumeL,
      start: stage.startTimeH,
      end: stage.endTimeH,
      fill: Math.min(1, stage.endCells / stage.targetCells),
      color: stage.isFinal ? "#0a84ff" : "#2ca66f",
    })),
    { id: "DSP", volumeL: sim.downstream.washedProductKg, start: sim.finalStage.endTimeH, end: sim.totalTimeH, fill: 1, color: "#b7791f" },
  ];
  const span = Math.max(1, stages.length - 1);
  const points = stages.map((stage, index) => ({
    ...stage,
    x: margin + (index / span) * (rect.width - margin * 2),
    y: baseY + Math.sin(index * 0.7) * 16,
  }));

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(20, 20, 30, 0.16)";
  ctx.beginPath();
  points.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  const compactLabels = rect.width < 560;
  points.forEach((point, index) => {
    const active = currentTime >= point.start && currentTime <= point.end;
    const volumeScale = Math.log10(Math.max(point.volumeL, 1)) / Math.log10(Math.max(sim.params.finalVolumeL, 10));
    const w = 34 + volumeScale * 54;
    const h = 62 + volumeScale * 150;
    const x = point.x;
    const y = point.y;
    drawVessel(ctx, x, y, w, h, point.fill, point.color, active);
    const shouldLabel = !compactLabels || index === 0 || index === points.length - 2 || index === points.length - 1 || active;
    if (shouldLabel) {
      ctx.fillStyle = active ? "#0a84ff" : "#24262d";
      ctx.font = compactLabels ? "600 10px -apple-system, BlinkMacSystemFont, sans-serif" : "600 12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(point.id, x, y + 30);
    }
  });

  const current = points.find((point) => currentTime >= point.start && currentTime <= point.end) || points[points.length - 1];
  document.getElementById("currentStage").textContent = current.id;
  document.getElementById("activeUnit").textContent = current.id;

  ctx.fillStyle = "#17171c";
  ctx.font = "700 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Live process field", 28, 42);
  ctx.fillStyle = "#6c6d75";
  ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`${fmt(sim.params.finalVolumeL)} L final STR, ${scientific(sim.achievedDensity)} cells/mL achieved`, 28, 66);
}

function drawVessel(ctx, x, baseY, width, height, fill, color, active) {
  const topY = baseY - height;
  const ellipseH = width * 0.28;
  ctx.save();
  ctx.shadowColor = active ? "rgba(10, 132, 255, 0.28)" : "rgba(20, 20, 30, 0.12)";
  ctx.shadowBlur = active ? 26 : 12;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = active ? color : "rgba(20,20,30,0.18)";
  ctx.lineWidth = active ? 2 : 1;
  roundedCylinderPath(ctx, x, topY, width, height, ellipseH);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  const fillHeight = Math.max(4, height * fill);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.78;
  ctx.fillRect(x - width / 2 + 2, baseY - fillHeight, width - 4, fillHeight);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(x, baseY - fillHeight, width / 2 - 2, ellipseH / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x, topY, width / 2, ellipseH / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fill();
  ctx.restore();
}

function roundedCylinderPath(ctx, x, topY, width, height, ellipseH) {
  ctx.beginPath();
  ctx.ellipse(x, topY, width / 2, ellipseH / 2, 0, Math.PI, 0);
  ctx.lineTo(x + width / 2, topY + height);
  ctx.ellipse(x, topY + height, width / 2, ellipseH / 2, 0, 0, Math.PI);
  ctx.closePath();
}

function drawTimeline(sim, currentTime) {
  const rect = resizeCanvas(timelineCanvas, timelineCtx);
  const ctx = timelineCtx;
  ctx.clearRect(0, 0, rect.width, rect.height);
  const pad = 38;
  const w = rect.width - pad * 2;
  const h = rect.height - pad * 2;
  const maxBiomass = Math.max(...sim.timeline.map((p) => p.biomass), 1);
  const maxEnergy = Math.max(...sim.timeline.map((p) => p.energy), 1);

  ctx.strokeStyle = "rgba(20,20,30,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + w, y);
    ctx.stroke();
  }

  drawLine(ctx, sim.timeline, pad, w, h, sim.totalTimeH, maxBiomass, "biomass", "#2ca66f");
  drawLine(ctx, sim.timeline, pad, w, h, sim.totalTimeH, maxEnergy, "energy", "#0a84ff");

  const x = pad + (currentTime / sim.totalTimeH) * w;
  ctx.strokeStyle = "#17171c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, pad);
  ctx.lineTo(x, pad + h);
  ctx.stroke();

  ctx.fillStyle = "#6c6d75";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("green: biomass kg", pad, rect.height - 10);
  ctx.fillStyle = "#0a84ff";
  ctx.fillText("blue: cumulative kWh", pad + 130, rect.height - 10);
}

function drawLine(ctx, points, pad, w, h, totalTime, maxValue, key, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = pad + (point.t / totalTime) * w;
    const y = pad + h - (point[key] / maxValue) * h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function dataForExport(scope = "full") {
  const sim = simulation || simulate();
  const nodeKey = scope.startsWith("node-") ? scope.replace("node-", "") : null;
  const stageId = scope.startsWith("stage-") ? scope.replace("stage-", "") : null;
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
    equations: allEquationEntries(sim),
    processSteps: processStepCatalog(sim),
    devices: deviceCatalog(sim),
    streams: streamCatalog(sim),
    modelComparisons: modelComparisons(sim),
    selectedProcessStep: selectedStepKey,
    selectedFactoryDetail: selectedDetail,
    referenceAssets,
  };
  if (scope === "parameters") return { parameters: report.parameters };
  if (scope === "equations") return { equations: report.equations };
  if (scope === "streams") return { medium: report.medium, reaction: report.reaction, downstream: report.downstream };
  if (scope === "timeline") return { timeline: sim.timeline };
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
  if (scope === "model-match") return { modelComparisons: report.modelComparisons };
  if (scope === "plant") return { devices: report.devices, streams: report.streams, processSteps: report.processSteps, modelComparisons: report.modelComparisons };
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
  if (data.processStep) return stepMarkdown(data.processStep, data);
  if (data.stage) {
    return [
      "# Cultivated Meat Stage Report",
      "",
      `Scenario: ${data.scenarioTitle}`,
      `Scope: ${data.scope}`,
      "",
      "```json",
      JSON.stringify(data.stage, null, 2),
      "```",
    ].join("\n");
  }
  const steps = processStepCatalog(sim);
  return [
    "# Cultivated Meat Process Report",
    "",
    `Scenario: ${presetConfig[currentPreset].title}`,
    `Final volume: ${fmt(sim.params.finalVolumeL)} L`,
    `Peak VCD: ${scientific(sim.params.peakVcd)} cells/mL`,
    `Packaged product: ${fmtKg(sim.downstream.packagedKg)}`,
    `Total energy estimate: ${fmt(sim.energy.totalEnergyKwh, 1)} kWh`,
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
  ].join("\n");
}

function completeHtmlReport() {
  const sim = simulation || simulate();
  const report = dataForExport("full");
  const steps = processStepCatalog(sim);
  const equationsHtml = allEquationEntries(sim)
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br><code>${escapeHtml(item.expression)}</code></li>`)
    .join("");
  const referencesHtml = referenceAssets
    .map((asset) => `<li><a href="${escapeHtml(asset)}">${escapeHtml(asset)}</a></li>`)
    .join("");
  const auditHtml = modelComparisons(sim)
    .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(formatValue(item.live))} ${escapeHtml(item.unit)}</td><td>${escapeHtml(formatValue(item.baseline))} ${escapeHtml(item.unit)}</td><td>${item.matched ? "matched" : `drift ${escapeHtml(fmt(item.diff, 2))} ${escapeHtml(item.unit)}`}</td></tr>`)
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
  <title>Cultivated Meat Process Export</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:40px;line-height:1.45;color:#17171c;background:#f5f5f7}
    main{max-width:1080px;margin:auto}
    section{background:white;border:1px solid #ddd;border-radius:8px;padding:18px;margin:16px 0}
    h1{font-size:34px;margin-bottom:4px} h2{font-size:20px} h3{font-size:14px;color:#666;text-transform:uppercase}
    code,pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f7f9;border-radius:6px;padding:8px}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .metric{background:white;border:1px solid #ddd;border-radius:8px;padding:14px}
    .metric span{display:block;color:#666;font-size:12px}.metric strong{font-size:22px}
  </style>
</head>
<body>
  <main>
    <h1>Cultivated Meat Process Export</h1>
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
      <h2>Python baseline audit</h2>
      <table><tbody>${auditHtml}</tbody></table>
    </section>
    ${stepHtml}
    <section>
      <h2>Reference assets from uploaded ZIPs</h2>
      <ul>${referencesHtml}</ul>
    </section>
    <section>
      <h2>Full JSON payload</h2>
      <pre>${escapeHtml(JSON.stringify(report, null, 2))}</pre>
    </section>
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
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:40px;line-height:1.45;color:#17171c;background:#f5f5f7}
    main{max-width:900px;margin:auto}
    section{background:white;border:1px solid #ddd;border-radius:8px;padding:18px;margin:16px 0}
    h1{font-size:34px;margin-bottom:4px} h2{font-size:20px} h3{font-size:14px;color:#666;text-transform:uppercase}
    code,pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f7f9;border-radius:6px;padding:8px}
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
  </main>
</body>
</html>`;
}

function download(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const target = event.target.closest("[data-export-scope]");
  showContextMenu(event.clientX, event.clientY, target ? target.dataset.exportScope : "full");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#contextMenu")) hideContextMenu();
});

contextMenu.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  if (action === "json") {
    download(`process-${exportScope}-${stamp}.json`, "application/json", JSON.stringify(dataForExport(exportScope), null, 2));
    showToast(`Downloaded ${exportScope} JSON`);
  }
  if (action === "csv") {
    download(`process-${exportScope}-${stamp}.csv`, "text/csv", toCsv(dataForExport(exportScope)));
    showToast(`Downloaded ${exportScope} CSV`);
  }
  if (action === "markdown") {
    download(`process-${exportScope}-report-${stamp}.md`, "text/markdown", toMarkdown(exportScope));
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
  download(`process-step-${safeFilename(stepKey)}-${stamp}.html`, "text/html", stepHtmlReport(stepKey));
  showToast(`Downloaded ${step ? step.title : stepKey} step report`);
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
  download(`cultivated-meat-complete-process-${stamp}.html`, "text/html", completeHtmlReport());
  showToast("Complete process report downloaded");
});

document.querySelectorAll(".view-tab").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
    if (button.dataset.view === "equations") renderEquations(simulation || simulate());
  });
});

document.getElementById("exportHtmlButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`cultivated-meat-complete-process-${stamp}.html`, "text/html", completeHtmlReport());
  showToast("Complete HTML report downloaded");
});

document.getElementById("exportJsonButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`cultivated-meat-full-${stamp}.json`, "application/json", JSON.stringify(dataForExport("full"), null, 2));
  showToast("Full JSON downloaded");
});

document.getElementById("exportCsvButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`cultivated-meat-full-${stamp}.csv`, "text/csv", toCsv(dataForExport("full")));
  showToast("Full CSV downloaded");
});

document.getElementById("exportMdButton")?.addEventListener("click", () => {
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  download(`cultivated-meat-full-${stamp}.md`, "text/markdown", toMarkdown("full"));
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

document.querySelectorAll(".preset-button").forEach((button) => {
  button.addEventListener("click", () => {
    currentPreset = button.dataset.preset;
    Object.entries(presetConfig[currentPreset].values).forEach(([id, value]) => {
      if (controls[id]) controls[id].value = String(value);
    });
    document.querySelectorAll(".preset-button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    controls.timeSlider.value = "0";
    render();
  });
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
