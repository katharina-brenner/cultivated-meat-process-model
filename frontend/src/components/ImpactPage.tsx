import type { ImpactSummary } from '../types/factory'

interface Props {
  data: ImpactSummary
}

function fmt(n: number, dec = 1) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}

export function ImpactPage({ data }: Props) {
  const { energy, materials, co2, by_stage, batch } = data

  return (
    <div className="impact-page">
      <header className="impact-page__intro">
        <h1 className="impact-title">Resource & Impact Analysis</h1>
        <p className="impact-subtitle">
          {data.scenario} · Brenner et al. (2026){' '}
          <a href={`https://doi.org/${data.doi}`} target="_blank" rel="noreferrer">doi:{data.doi}</a>
        </p>
      </header>

      <div className="impact-kpis">
        <KpiCard label="Batch duration" value={`${batch.duration_days} d`} sub={`${fmt(batch.duration_h, 0)} h`} />
        <KpiCard label="Product / batch" value={`${fmt(batch.product_kg, 0)} kg`} sub="DS-102 packaged" />
        <KpiCard label="Electricity" value={`${fmt(energy.electricity_kWh_per_batch, 0)} kWh`} sub={`${fmt(energy.electricity_kWh_per_kg_product, 2)} kWh/kg`} />
        <KpiCard label="CO₂ footprint" value={`${fmt(co2.total_kg_per_batch, 0)} kg`} sub={`${fmt(co2.total_kg_per_kg_product, 3)} kg CO₂/kg`} accent />
        <KpiCard label="Media + water" value={`${fmt(materials.water_consumptive_kg_per_batch / 1000, 1)} t`} sub="consumptive / batch" />
      </div>

      <div className="impact-grid">
        <section className="impact-card">
          <h2 className="impact-card__title">Energy consumption</h2>
          <div className="bar-chart">
            <Bar label="Media prep (V-110 cooling)" value={energy.media_prep_kWh} max={energy.electricity_kWh_per_batch} unit="kWh" />
            <Bar label="Cell expansion (6 vessels)" value={energy.cell_expansion_kWh} max={energy.electricity_kWh_per_batch} unit="kWh" />
            <Bar label="Downstream processing" value={energy.dsp_kWh} max={energy.electricity_kWh_per_batch} unit="kWh" />
          </div>
          <p className="impact-note">
            Cell expansion: 1,720 kWh/batch (Energy Report, Scenario 1). Media storage cooling: 113 kWh/batch.
          </p>
        </section>

        <section className="impact-card">
          <h2 className="impact-card__title">CO₂ breakdown</h2>
          <div className="prop-grid">
            <div className="prop-row"><span className="prop-row__key">Electricity (grid)</span><span className="prop-row__val">{fmt(co2.electricity_kg)} kg</span></div>
            <div className="prop-row"><span className="prop-row__key">Steam</span><span className="prop-row__val">{fmt(co2.steam_kg)} kg</span></div>
            <div className="prop-row"><span className="prop-row__key">Synthetic Air CO₂ supply</span><span className="prop-row__val">{fmt(co2.aeration_supply_kg)} kg</span></div>
            <div className="prop-row"><span className="prop-row__key">Metabolic (est.)</span><span className="prop-row__val">{fmt(co2.metabolic_est_kg)} kg</span></div>
            <div className="prop-row"><span className="prop-row__key">Total</span><span className="prop-row__val">{fmt(co2.total_kg_per_batch)} kg/batch</span></div>
          </div>
        </section>

        <section className="impact-card impact-card--wide">
          <h2 className="impact-card__title">Material consumption per batch</h2>
          <table className="impact-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Concentration</th>
                <th>Mass / batch</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              {materials.raw_materials.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.concentration_g_L ? `${fmt(m.concentration_g_L, 4)} g/L` : '—'}</td>
                  <td className="mono">{m.mass_kg_per_batch < 1 ? m.mass_kg_per_batch.toExponential(2) : fmt(m.mass_kg_per_batch, 2)} kg</td>
                  <td>{m.route || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="impact-card">
          <h2 className="impact-card__title">CIP utilities (Table 8)</h2>
          <div className="prop-grid">
            {Object.entries(materials.cip_per_batch).map(([k, v]) => (
              <div key={k} className="prop-row">
                <span className="prop-row__key">{k.replace(/_/g, ' ').toUpperCase()}</span>
                <span className="prop-row__val">{fmt(v as number, 0)} kg</span>
              </div>
            ))}
          </div>
        </section>

        <section className="impact-card impact-card--wide">
          <h2 className="impact-card__title">By process stage</h2>
          <table className="impact-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Electricity kWh</th>
                <th>Water kg</th>
                <th>Materials kg</th>
                <th>CO₂ kg</th>
              </tr>
            </thead>
            <tbody>
              {by_stage.map((row) => (
                <tr key={String(row.stage)}>
                  <td>{row.stage}</td>
                  <td className="mono">{row.electricity_kWh ? fmt(row.electricity_kWh as number, 0) : '—'}</td>
                  <td className="mono">{row.water_kg ? fmt(row.water_kg as number, 0) : '—'}</td>
                  <td className="mono">{row.materials_kg ? fmt(row.materials_kg as number, 0) : '—'}</td>
                  <td className="mono">{row.co2_kg ? fmt(row.co2_kg as number, 0) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`impact-kpi${accent ? ' impact-kpi--accent' : ''}`}>
      <div className="impact-kpi__label">{label}</div>
      <div className="impact-kpi__value">{value}</div>
      <div className="impact-kpi__sub">{sub}</div>
    </div>
  )
}

function Bar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="bar-item">
      <div className="bar-item__head">
        <span>{label}</span>
        <span className="mono">{value.toLocaleString('en-US', { maximumFractionDigits: 0 })} {unit}</span>
      </div>
      <div className="bar-item__track">
        <div className="bar-item__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
