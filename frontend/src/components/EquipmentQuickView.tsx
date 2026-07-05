import type { Equipment, FactoryModel } from '../types/factory'
import { equipmentTypeLabel } from '../utils/format'

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
  const isProduction = equipment.tag === 'BR-102'
  const phenomena = model.phenomena.filter((ph) => ph.equipment_tag === equipment.tag)
  const operations = equipment.operations ?? []

  return (
    <aside className="side-panel">
      <header className="panel-header">
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        <div className="panel-tag">{equipment.tag}</div>
        <h2 className="panel-title">{equipment.name}</h2>
        <p className="panel-subtitle">{equipmentTypeLabel(equipment.equipment_type)}</p>
      </header>

      <div className="panel-body">
        {isProduction ? (
          <>
            <p className="panel-subtitle" style={{ marginBottom: 8 }}>
              {String(p.working_volume_L?.toLocaleString())} L · {String(p.culture_time_h)} h · Brenner Table 2
            </p>
            <div className="quick-stats">
              <div className="quick-stat">
                <div className="quick-stat__value">{p.total_power_kW} kW</div>
                <div className="quick-stat__label">Agitation</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat__value">{String(p.coolant_kg_h)}</div>
                <div className="quick-stat__label">Coolant kg/h</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat__value">5×10⁷</div>
                <div className="quick-stat__label">cells/mL max</div>
              </div>
            </div>
          </>
        ) : null}

        <section className="panel-section">
          <h3 className="panel-section__title">Properties</h3>
          <div className="prop-grid">
            {Object.entries(p).filter(([, v]) => v != null).map(([key, val]) => (
              <div key={key} className="prop-row">
                <span className="prop-row__key">{key.replace(/_/g, ' ')}</span>
                <span className="prop-row__val">{String(val)}</span>
              </div>
            ))}
          </div>
        </section>

        {operations.length > 0 && (
          <section className="panel-section">
            <h3 className="panel-section__title">Operations</h3>
            <div className="phenomena-grid">
              {operations.map((op) => (
                <span key={op} className="phenomenon-chip" style={{ cursor: 'default' }}>{op}</span>
              ))}
            </div>
          </section>
        )}

        {phenomena.length > 0 && (
          <section className="panel-section">
            <h3 className="panel-section__title">Phenomena</h3>
            <div className="phenomena-grid">
              {phenomena.map((ph) => (
                <button key={ph.id} type="button" className="phenomenon-chip" onClick={() => onPhenomenon(ph.id)}>
                  {ph.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </section>
        )}

        {isProduction && (
          <button type="button" className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={onExplore}>
            Explore Process
          </button>
        )}
        {model.mass_balances[equipment.tag] && (
          <button type="button" className="btn btn--ghost" style={{ width: '100%', marginTop: 8 }} onClick={onBalance}>
            Mass & Energy Balance
          </button>
        )}
      </div>
    </aside>
  )
}
