export interface ProcessArea {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  equipment_tags: string[]
  description?: string
}

export interface Equipment {
  tag: string
  name: string
  area_id: string
  equipment_type: string
  x: number
  y: number
  width: number
  height: number
  properties: Record<string, string | number | null>
  phenomena: string[]
  operations?: string[]
}

export interface RawMaterial {
  id: string
  name: string
  mass_kg_per_batch: number
  concentration_g_L: number
  category: string
  sterilization: string
  route: string
  properties: Record<string, string | number>
}

export interface ProcessStream {
  tag: string
  name: string
  from_tag: string
  to_tag: string
  area_id: string
  properties: Record<string, number | string>
  composition: Record<string, number>
  materials?: Record<string, number>
}

export interface Phenomenon {
  id: string
  name: string
  equipment_tag: string
  equation: string
  description: string
  parameters: Record<string, string | number>
  live_values: Record<string, number>
  diagram: string[]
}

export interface MassBalance {
  equipment_tag: string
  inputs: Record<string, number>
  outputs: Record<string, number>
  closure: Record<string, number>
}

export interface FactoryModel {
  plant: Record<string, string | number>
  daily_product_kg: number
  batch?: { duration_h: number; product_kg: number; scenario: string }
  areas: ProcessArea[]
  equipment: Equipment[]
  streams: ProcessStream[]
  raw_materials: RawMaterial[]
  phenomena: Phenomenon[]
  mass_balances: Record<string, MassBalance>
  utilities?: Record<string, unknown>
}

export interface ImpactSummary {
  citation: string
  doi: string
  scenario: string
  batch: { duration_h: number; duration_days: number; product_kg: number }
  energy: {
    electricity_kWh_per_batch: number
    electricity_kWh_per_kg_product: number
    media_prep_kWh: number
    cell_expansion_kWh: number
    dsp_kWh: number
  }
  materials: {
    raw_materials: RawMaterial[]
    total_media_kg_per_batch: number
    cip_per_batch: Record<string, number>
    water_consumptive_kg_per_batch: number
  }
  co2: {
    total_kg_per_batch: number
    total_kg_per_kg_product: number
    electricity_kg: number
    steam_kg: number
    aeration_supply_kg: number
    metabolic_est_kg: number
  }
  by_stage: Array<Record<string, string | number>>
}

export type AppPage = 'factory' | 'impact' | 'guide'

export type ViewLevel = 'factory' | 'area' | 'equipment' | 'phenomenon'

export interface NavState {
  level: ViewLevel
  areaId?: string
  equipmentTag?: string
  phenomenonId?: string
  streamTag?: string
}

export interface Breadcrumb {
  label: string
  action?: () => void
}
