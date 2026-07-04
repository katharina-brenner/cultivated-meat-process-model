export interface ProcessArea {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  equipment_tags: string[]
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
  properties: Record<string, string | number>
  phenomena: string[]
}

export interface ProcessStream {
  tag: string
  name: string
  from_tag: string
  to_tag: string
  area_id: string
  properties: Record<string, number>
  composition: Record<string, number>
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
  areas: ProcessArea[]
  equipment: Equipment[]
  streams: ProcessStream[]
  phenomena: Phenomenon[]
  mass_balances: Record<string, MassBalance>
}

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
