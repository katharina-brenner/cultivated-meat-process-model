import type { RawMaterial } from '../types/factory'

interface Props {
  materials: RawMaterial[]
  onClose: () => void
  onMaterialClick?: (id: string) => void
}

export function RawMaterialsPanel({ materials, onClose }: Props) {
  const total = materials.reduce((s, m) => s + m.mass_kg_per_batch, 0)

  return (
    <aside className="side-panel">
      <header className="panel-header">
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        <div className="panel-tag">RAW MATERIALS</div>
        <h2 className="panel-title">Medium Components</h2>
        <p className="panel-subtitle">
          Brenner et al. (2026) Table 3 · {total.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg/batch
        </p>
      </header>
      <div className="panel-body">
        <section className="panel-section">
          <h3 className="panel-section__title">Filtration route → V-101</h3>
          <div className="material-list">
            {materials.filter((m) => m.route === 'V-101').map((m) => (
              <MaterialRow key={m.id} m={m} />
            ))}
          </div>
        </section>
        <section className="panel-section">
          <h3 className="panel-section__title">Heat sterilization → V-102</h3>
          <div className="material-list">
            {materials.filter((m) => m.route === 'V-102').map((m) => (
              <MaterialRow key={m.id} m={m} />
            ))}
          </div>
        </section>
        <section className="panel-section">
          <h3 className="panel-section__title">Water & biological input</h3>
          <div className="material-list">
            {materials.filter((m) => !m.route || m.route === 'direct' || m.id === 'water' || m.id === 'inoculum').map((m) => (
              <MaterialRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}

function MaterialRow({ m }: { m: RawMaterial }) {
  return (
    <div className="material-row">
      <div className="material-row__head">
        <span className="material-row__name">{m.name}</span>
        <span className="material-row__mass">
          {m.mass_kg_per_batch < 1
            ? m.mass_kg_per_batch.toExponential(2)
            : m.mass_kg_per_batch.toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg
        </span>
      </div>
      <div className="material-row__meta">
        {m.concentration_g_L > 0 && (
          <span>{m.concentration_g_L.toLocaleString('de-DE')} g/L</span>
        )}
        <span>{m.category}</span>
        <span>{m.sterilization.replace(/_/g, ' ')}</span>
      </div>
    </div>
  )
}
