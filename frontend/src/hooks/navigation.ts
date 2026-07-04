import type { Breadcrumb, FactoryModel, NavState } from '../types/factory'

interface NavActions {
  goFactory: () => void
  goArea: (areaId: string) => void
  goEquipment: (tag: string) => void
  goPhenomenon: (id: string) => void
  selectStream: (tag: string) => void
  closePanel: () => void
}

export function buildBreadcrumbs(
  nav: NavState,
  model: FactoryModel,
  actions: NavActions,
): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: 'Factory', action: actions.goFactory }]

  if (nav.areaId) {
    const area = model.areas.find((a) => a.id === nav.areaId)
    if (area) crumbs.push({ label: area.name, action: () => actions.goArea(area.id) })
  }

  if (nav.equipmentTag) {
    const eq = model.equipment.find((e) => e.tag === nav.equipmentTag)
    if (eq) crumbs.push({ label: eq.tag, action: () => actions.goEquipment(eq.tag) })
  }

  if (nav.phenomenonId) {
    const ph = model.phenomena.find((p) => p.id === nav.phenomenonId)
    if (ph) crumbs.push({ label: ph.name })
  }

  if (nav.streamTag && !nav.equipmentTag) {
    crumbs.push({ label: nav.streamTag })
  }

  return crumbs
}

export function getAreaEquipment(model: FactoryModel, areaId: string) {
  return model.equipment.filter((e) => e.area_id === areaId)
}

export function getAreaStreams(model: FactoryModel, areaId: string) {
  return model.streams.filter((s) => s.area_id === areaId)
}

export function findEquipmentPos(model: FactoryModel, tag: string) {
  const eq = model.equipment.find((e) => e.tag === tag)
  if (eq) return { x: eq.x + eq.width / 2, y: eq.y + eq.height / 2 }
  const area = model.areas.find((a) => a.id === tag)
  if (area) return { x: area.x + area.width / 2, y: area.y + area.height / 2 }
  return { x: 0, y: 0 }
}
