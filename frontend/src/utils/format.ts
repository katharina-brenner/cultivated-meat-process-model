const PROPERTY_LABELS: Record<string, string> = {
  mass_flow_kg_h: 'Mass flow',
  volumetric_flow_L_h: 'Volumetric flow',
  temperature_C: 'Temperature',
  pressure_bar: 'Pressure',
  density_kg_m3: 'Density',
  viscosity_mPa_s: 'Viscosity',
  pH: 'pH',
  osmolality_mOsm_kg: 'Osmolality',
  pack_units_per_h: 'Pack units / h',
}

const PROPERTY_SUFFIX: Record<string, string> = {
  mass_flow_kg_h: ' kg/h',
  volumetric_flow_L_h: ' L/h',
  temperature_C: ' °C',
  pressure_bar: ' bar',
  density_kg_m3: ' kg/m³',
  viscosity_mPa_s: ' mPa·s',
  osmolality_mOsm_kg: ' mOsm/kg',
  pack_units_per_h: ' /h',
}

export function propertyLabel(key: string): string {
  return PROPERTY_LABELS[key] ?? key.replace(/_/g, ' ')
}

export function formatPropertyValue(key: string, value: number): string {
  const suffix = PROPERTY_SUFFIX[key] ?? ''
  if (key === 'density_kg_m3') return value.toLocaleString('de-DE') + suffix
  if (key === 'pH') return value.toFixed(2)
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + suffix
}

export function formatProperty(key: string, value: number): string {
  return `${propertyLabel(key)}: ${formatPropertyValue(key, value)}`
}

export function formatNumber(value: number, decimals = 1): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + ' × 10⁶'
  if (value >= 1e3) return value.toLocaleString('de-DE', { maximumFractionDigits: decimals })
  return value.toFixed(decimals)
}

export function equipmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tank: 'Storage Tank',
    mixer: 'Agitated Mixer',
    filter: 'Sterile Filter',
    bioreactor: 'Bioreactor',
    centrifuge: 'Centrifuge',
    column: 'Chromatography Column',
    formulator: 'Formulation Unit',
  }
  return labels[type] ?? type
}
