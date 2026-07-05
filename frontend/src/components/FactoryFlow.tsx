import type { Equipment, FactoryModel, MassBalance, Phenomenon, ProcessArea, ProcessStream, RawMaterial } from '../types/factory'
import { propertyLabel, formatPropertyValue } from '../utils/format'

const AREA_ORDER = [
  'raw', 'inoculum', 'media_prep', 'cell_expansion', 'dsp', 'utilities', 'product',
]

function fmtNum(n: number, dec = 2) {
  if (n < 1 && n > 0) return n.toExponential(2)
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}

function PropBlock({ entries }: { entries: [string, string | number | null][] }) {
  const filtered = entries.filter(([, v]) => v != null && v !== '')
  if (filtered.length === 0) return null
  return (
    <div className="prop-grid prop-grid--compact">
      {filtered.map(([key, val]) => (
        <div key={key} className="prop-row">
          <span className="prop-row__key">{key.replace(/_/g, ' ')}</span>
          <span className="prop-row__val">{String(val)}</span>
        </div>
      ))}
    </div>
  )
}

function StreamBlock({ stream }: { stream: ProcessStream }) {
  const comp = Object.entries(stream.composition).sort((a, b) => b[1] - a[1])
  const props = Object.entries(stream.properties)
  const mats = Object.entries(stream.materials ?? {})

  return (
    <div className="detail-block detail-block--stream" id={`stream-${stream.tag}`}>
      <div className="detail-block__head">
        <span className="detail-block__tag">{stream.tag}</span>
        <span className="detail-block__title">{stream.name}</span>
      </div>
      {props.length > 0 && (
        <>
          <h4 className="detail-block__subtitle">Properties</h4>
          <div className="prop-grid prop-grid--compact">
            {props.map(([key, val]) => (
              <div key={key} className="prop-row">
                <span className="prop-row__key">{propertyLabel(key)}</span>
                <span className="prop-row__val">
                  {typeof val === 'number' ? formatPropertyValue(key, val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {comp.length > 0 && (
        <>
          <h4 className="detail-block__subtitle">Composition</h4>
          <div className="composition-list">
            {comp.map(([name, pct]) => (
              <div key={name} className="composition-item">
                <span className="composition-label">{name}</span>
                <div className="composition-bar-wrap">
                  <div className="composition-bar" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
                </div>
                <span className="composition-value">{pct.toFixed(2)} %</span>
              </div>
            ))}
          </div>
        </>
      )}
      {mats.length > 0 && (
        <>
          <h4 className="detail-block__subtitle">Materials</h4>
          <div className="prop-grid prop-grid--compact">
            {mats.map(([k, v]) => (
              <div key={k} className="prop-row">
                <span className="prop-row__key">{k}</span>
                <span className="prop-row__val">{fmtNum(v)} kg</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EquipmentBlock({
  eq,
  phenomena,
  balance,
}: {
  eq: Equipment
  phenomena: Phenomenon[]
  balance?: MassBalance
}) {
  const eqPh = phenomena.filter((p) => p.equipment_tag === eq.tag)
  const ops = eq.operations ?? []

  return (
    <div className="detail-block detail-block--equipment" id={`eq-${eq.tag}`}>
      <div className="detail-block__head">
        <span className="detail-block__tag">{eq.tag}</span>
        <span className="detail-block__title">{eq.name}</span>
      </div>
      <PropBlock entries={Object.entries(eq.properties)} />
      {ops.length > 0 && (
        <>
          <h4 className="detail-block__subtitle">Operations</h4>
          <div className="tag-list">{ops.map((o) => <span key={o} className="tag-pill">{o}</span>)}</div>
        </>
      )}
      {eqPh.map((ph) => (
        <div key={ph.id} className="phenomenon-inline">
          <h4 className="detail-block__subtitle">{ph.name}</h4>
          <p className="phenomenon-inline__eq">{ph.equation}</p>
          <p className="phenomenon-inline__desc">{ph.description}</p>
          <PropBlock entries={Object.entries(ph.live_values)} />
        </div>
      ))}
      {balance && (
        <>
          <h4 className="detail-block__subtitle">Mass balance</h4>
          <div className="balance-inline">
            <div><strong>Inputs:</strong> {Object.entries(balance.inputs).map(([k, v]) => `${k} ${fmtNum(v, 0)} kg`).join(' · ')}</div>
            <div><strong>Outputs:</strong> {Object.entries(balance.outputs).map(([k, v]) => `${k} ${fmtNum(v, 0)} kg`).join(' · ')}</div>
            <div><strong>Closure:</strong> {Object.entries(balance.closure).map(([k, v]) => `${k} ${v}%`).join(' · ')}</div>
          </div>
        </>
      )}
    </div>
  )
}

function RawMaterialsTable({ materials }: { materials: RawMaterial[] }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>g/L</th>
            <th>kg/batch</th>
            <th>Route</th>
            <th>Sterilization</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.concentration_g_L ? fmtNum(m.concentration_g_L, 4) : '—'}</td>
              <td>{fmtNum(m.mass_kg_per_batch)}</td>
              <td>{m.route || '—'}</td>
              <td>{m.sterilization.replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AreaSection({
  area,
  equipment,
  streams,
  rawMaterials,
  phenomena,
  massBalances,
}: {
  area: ProcessArea
  equipment: Equipment[]
  streams: ProcessStream[]
  rawMaterials: RawMaterial[]
  phenomena: Phenomenon[]
  massBalances: Record<string, MassBalance>
}) {
  return (
    <section className="flow-section flow-section--expanded" id={`area-${area.id}`}>
      <header className="flow-section__header-static">
        <span className="flow-section__label">{area.name}</span>
        {area.description && <span className="flow-section__desc">{area.description}</span>}
      </header>

      {area.id === 'raw' && rawMaterials.length > 0 && (
        <RawMaterialsTable materials={rawMaterials} />
      )}

      {equipment.length > 0 && (
        <div className="detail-stack">
          {equipment.map((eq) => (
            <EquipmentBlock
              key={eq.tag}
              eq={eq}
              phenomena={phenomena}
              balance={massBalances[eq.tag]}
            />
          ))}
        </div>
      )}

      {streams.length > 0 && (
        <div className="detail-stack">
          <h3 className="detail-stack__heading">Process streams</h3>
          {streams.map((s) => (
            <StreamBlock key={s.tag} stream={s} />
          ))}
        </div>
      )}

      <div className="flow-arrow" aria-hidden="true">
        <div className="flow-arrow__line" />
        <div className="flow-arrow__dot" />
      </div>
    </section>
  )
}

interface Props {
  model: FactoryModel
}

export function FactoryFlow({ model }: Props) {
  const areas = AREA_ORDER
    .map((id) => model.areas.find((a) => a.id === id))
    .filter(Boolean) as ProcessArea[]

  const equipmentByArea: Record<string, Equipment[]> = {}
  for (const eq of model.equipment) {
    (equipmentByArea[eq.area_id] ??= []).push(eq)
  }

  const streamsByArea: Record<string, ProcessStream[]> = {}
  for (const s of model.streams) {
    (streamsByArea[s.area_id] ??= []).push(s)
  }

  return (
    <div className="factory-flow">
      <div className="batch-banner">
        <div className="batch-banner__item">
          <span className="batch-banner__label">Batch output</span>
          <span className="batch-banner__value">{fmtNum(model.batch?.product_kg ?? 0, 0)} kg</span>
        </div>
        <div className="batch-banner__item">
          <span className="batch-banner__label">Duration</span>
          <span className="batch-banner__value">{model.batch?.duration_h ? `${(model.batch.duration_h / 24).toFixed(1)} d` : '—'}</span>
        </div>
        <div className="batch-banner__item">
          <span className="batch-banner__label">Scenario</span>
          <span className="batch-banner__value">{model.batch?.scenario ?? 'baseline'}</span>
        </div>
        <div className="batch-banner__item">
          <span className="batch-banner__label">Equipment</span>
          <span className="batch-banner__value">{model.equipment.length} units</span>
        </div>
        <div className="batch-banner__item">
          <span className="batch-banner__label">Streams</span>
          <span className="batch-banner__value">{model.streams.length}</span>
        </div>
      </div>

      <div className="factory-flow__inner">
        {areas.map((area) => (
          <AreaSection
            key={area.id}
            area={area}
            equipment={equipmentByArea[area.id] ?? []}
            streams={streamsByArea[area.id] ?? []}
            rawMaterials={area.id === 'raw' ? model.raw_materials : []}
            phenomena={model.phenomena}
            massBalances={model.mass_balances}
          />
        ))}
      </div>
    </div>
  )
}
