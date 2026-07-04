import type { Equipment, FactoryModel } from '../types/factory'
import { equipmentTypeLabel, formatNumber } from '../utils/format'

interface Props {
  equipment: Equipment
  model: FactoryModel
  onClose: () => void
  onExplore: () => void
  onPhenomenon: (id: string) => void
  onBalance: () => void
}

export function EquipmentQuickView({
  equipment,
  model,
  onClose,
  onExplore,
  onPhenomenon,
  onBalance,
}: Props) {
  const p = equipment.properties
  const isBioreactor = equipment.equipment_type === 'bioreactor' && equipment.tag === 'BR-201'

  const phenomena = model.phenomena.filter((ph) => ph.equipment_tag === equipment.tag)

  return (
    <aside className="side-panel">
      <header className="panel-header">
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        <div className="panel-tag">{equipment.tag}</div>
        <h2 className="panel-title">{equipment.name}</h2>
        <p className="panel-subtitle">{equipmentTypeLabel(equipment.equipment_type)}</p>
      </header>

      <div className="panel-body">
        {isBioreactor ? (
          <>
            <p className="panel-subtitle" style={{ marginBottom: 8 }}>
              {String(p.working_volume_L?.toLocaleString())} L working volume · {String(p.mode)}
            </p>

            <div className="quick-stats">
              <div className="quick-stat">
                <div className="quick-stat__value">{p.temperature_C} °C</div>
                <div className="quick-stat__label">Temperature</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat__value">{p.pH}</div>
                <div className="quick-stat__label">pH</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat__value">{p.DO_percent} %</div>
                <div className="quick-stat__label">DO</div>
              </div>
            </div>

            <div className="quick-stats">
              <div className="quick-stat">
                <div className="quick-stat__value">{p.pressure_bar} bar</div>
                <div className="quick-stat__label">Pressure</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat__value">{p.agitation_rpm} rpm</div>
                <div className="quick-stat__label">Agitation</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat__value">{p.VVD} VVD</div>
                <div className="quick-stat__label">Perfusion</div>
              </div>
            </div>

            <section className="panel-section">
              <h3 className="panel-section__title">Culture state</h3>
              <div className="prop-grid">
                <div className="prop-row">
                  <span className="prop-row__key">Cell density</span>
                  <span className="prop-row__val">
                    {formatNumber(Number(p.cell_density_cells_mL) / 1e6, 1)} × 10⁶ cells/mL
                  </span>
                </div>
                <div className="prop-row">
                  <span className="prop-row__key">Viability</span>
                  <span className="prop-row__val">{p.viability_percent} %</span>
                </div>
                <div className="prop-row">
                  <span className="prop-row__key">Biomass</span>
                  <span className="prop-row__val">{Number(p.biomass_kg).toLocaleString('de-DE', { maximumFractionDigits: 0 })} kg</span>
                </div>
              </div>
            </section>

            {phenomena.length > 0 && (
              <section className="panel-section">
                <h3 className="panel-section__title">Phenomena</h3>
                <div className="phenomena-grid">
                  {phenomena.map((ph) => (
                    <button
                      key={ph.id}
                      type="button"
                      className="phenomenon-chip"
                      onClick={() => onPhenomenon(ph.id)}
                    >
                      {ph.name.replace(' Network', '').replace('Oxygen ', '')}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <button type="button" className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={onExplore}>
              Explore Process
            </button>
            <button type="button" className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={onBalance}>
              Mass & Energy Balance
            </button>
          </>
        ) : (
          <>
            <section className="panel-section">
              <h3 className="panel-section__title">Properties</h3>
              <div className="prop-grid">
                {Object.entries(p).map(([key, val]) => (
                  <div key={key} className="prop-row">
                    <span className="prop-row__key">{key.replace(/_/g, ' ')}</span>
                    <span className="prop-row__val">{String(val)}</span>
                  </div>
                ))}
              </div>
            </section>
            <button type="button" className="btn btn--ghost" style={{ width: '100%', marginTop: 16 }} onClick={onBalance}>
              View Balance
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
