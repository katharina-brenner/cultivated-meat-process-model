import { useCallback, useMemo, useState } from 'react'
import type { NavState } from './types/factory'
import { useFactory } from './hooks/useFactory'
import { buildBreadcrumbs } from './hooks/navigation'
import { Breadcrumbs } from './components/Breadcrumbs'
import { FactoryCanvas } from './components/FactoryCanvas'
import { StreamPanel } from './components/StreamPanel'
import { EquipmentQuickView } from './components/EquipmentQuickView'
import { EquipmentWorld } from './components/EquipmentWorld'
import { PhenomenonView } from './components/PhenomenonView'
import { MassBalanceView } from './components/MassBalanceView'

type PanelMode = 'stream' | 'equipment' | 'balance' | null

export default function App() {
  const { data, error, loading } = useFactory()
  const [theme, setTheme] = useState<'light' | 'deep'>('light')
  const [nav, setNav] = useState<NavState>({ level: 'factory' })
  const [panel, setPanel] = useState<PanelMode>(null)
  const [showBalance, setShowBalance] = useState(false)

  const toggleTheme = () => {
    const next = theme === 'light' ? 'deep' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next === 'deep' ? 'deep' : '')
  }

  const goFactory = useCallback(() => {
    setNav({ level: 'factory' })
    setPanel(null)
    setShowBalance(false)
  }, [])

  const goArea = useCallback((areaId: string) => {
    setNav({ level: 'area', areaId })
    setPanel(null)
    setShowBalance(false)
  }, [])

  const goEquipment = useCallback((tag: string) => {
    const eq = data?.equipment.find((e) => e.tag === tag)
    setNav({ level: 'equipment', areaId: eq?.area_id, equipmentTag: tag })
    setPanel('equipment')
    setShowBalance(false)
  }, [data])

  const goPhenomenon = useCallback((id: string) => {
    const ph = data?.phenomena.find((p) => p.id === id)
    setNav({
      level: 'phenomenon',
      areaId: data?.equipment.find((e) => e.tag === ph?.equipment_tag)?.area_id,
      equipmentTag: ph?.equipment_tag,
      phenomenonId: id,
    })
    setPanel(null)
    setShowBalance(false)
  }, [data])

  const selectStream = useCallback((tag: string) => {
    setNav({ level: 'factory', streamTag: tag })
    setPanel('stream')
    setShowBalance(false)
  }, [])

  const closePanel = useCallback(() => {
    setPanel(null)
    setNav((n) => ({ ...n, streamTag: undefined }))
  }, [])

  const exploreProcess = useCallback(() => {
    setNav((n) => ({ ...n, level: 'equipment' }))
    setPanel(null)
  }, [])

  const openBalance = useCallback(() => {
    setShowBalance(true)
    setPanel(null)
  }, [])

  const crumbs = useMemo(() => {
    if (!data) return [{ label: 'Factory' }]
    return buildBreadcrumbs(nav, data, { goFactory, goArea, goEquipment, goPhenomenon, selectStream, closePanel })
  }, [data, nav, goFactory, goArea, goEquipment, goPhenomenon, selectStream, closePanel])

  if (loading) {
    return (
      <div className="loading">
        <span className="loading__dot" />
        <span className="loading__dot" />
        <span className="loading__dot" />
        Loading factory model
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="loading">
        {error ? `Connection error: ${error}` : 'No data'}
        <p style={{ fontSize: 12, marginTop: 8 }}>Start API: uvicorn cm_process_model.api:app --reload</p>
      </div>
    )
  }

  const selectedStream = nav.streamTag ? data.streams.find((s) => s.tag === nav.streamTag) : undefined
  const selectedEquipment = nav.equipmentTag ? data.equipment.find((e) => e.tag === nav.equipmentTag) : undefined
  const selectedPhenomenon = nav.phenomenonId ? data.phenomena.find((p) => p.id === nav.phenomenonId) : undefined
  const balance = nav.equipmentTag ? data.mass_balances[nav.equipmentTag] : undefined

  const showWorld = nav.level === 'equipment' && selectedEquipment?.tag === 'BR-201' && !showBalance && !panel
  const showPhenomenon = nav.level === 'phenomenon' && selectedPhenomenon

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <div className="header__logo">CM</div>
          <div>
            <div className="header__title">Digital Factory</div>
            <div className="header__subtitle">
              {String(data.plant.name)} · {data.daily_product_kg.toLocaleString('de-DE', { maximumFractionDigits: 0 })} kg/d
            </div>
          </div>
        </div>
        <div className="header__actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? 'Deep Space' : 'Light Mode'}
          </button>
        </div>
      </header>

      <Breadcrumbs crumbs={crumbs} />

      <main className="main">
        {!showPhenomenon && !showBalance && (
          <div className="canvas-wrap">
            <FactoryCanvas
              model={data}
              selectedEquipment={nav.equipmentTag}
              selectedStream={nav.streamTag}
              highlightArea={nav.areaId}
              onEquipmentClick={goEquipment}
              onStreamClick={selectStream}
              onAreaClick={goArea}
            />
            <div className="zoom-hint">
              {nav.level === 'factory' && 'Zoom 1 · Factory View — click any unit or stream'}
              {nav.level === 'area' && `Zoom 2 · ${data.areas.find((a) => a.id === nav.areaId)?.name}`}
              {showWorld && 'Zoom 3 · Equipment Detail — select a phenomenon'}
            </div>
          </div>
        )}

        {showWorld && selectedEquipment && (
          <EquipmentWorld
            equipment={selectedEquipment}
            model={data}
            onPhenomenon={goPhenomenon}
          />
        )}

        {showPhenomenon && selectedPhenomenon && (
          <PhenomenonView phenomenon={selectedPhenomenon} />
        )}

        {showBalance && balance && nav.equipmentTag && (
          <MassBalanceView balance={balance} equipmentTag={nav.equipmentTag} />
        )}

        {panel === 'stream' && selectedStream && (
          <StreamPanel stream={selectedStream} onClose={closePanel} />
        )}

        {panel === 'equipment' && selectedEquipment && (
          <EquipmentQuickView
            equipment={selectedEquipment}
            model={data}
            onClose={closePanel}
            onExplore={exploreProcess}
            onPhenomenon={goPhenomenon}
            onBalance={openBalance}
          />
        )}
      </main>
    </div>
  )
}
