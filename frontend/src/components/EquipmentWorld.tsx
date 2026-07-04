import type { Equipment, FactoryModel } from '../types/factory'

interface Props {
  equipment: Equipment
  model: FactoryModel
  onPhenomenon: (id: string) => void
}

const REACTOR_DIAGRAM = `                 GAS PHASE
        O₂   CO₂   N₂   H₂O
              ↑ ↑ ↑
        ─────────────────

             ↻      ↺
          turbulent flow

        Cells + Medium

           O₂ transfer
               ↓
       O₂(g) → O₂(l) → Cell

        Glucose → Cells
                   ↓
              Biomass
              Lactate
              NH₃
              CO₂

             ↻      ↺

        ─────────────────
           ATF / Retention`

export function EquipmentWorld({ equipment, model, onPhenomenon }: Props) {
  const phenomena = model.phenomena.filter((p) => p.equipment_tag === equipment.tag)

  return (
    <div className="equipment-world">
      <div className="reactor-diagram">
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, textAlign: 'center' }}>
          {equipment.tag} · {equipment.name}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
          Interactive cross-section · click a phenomenon below
        </p>
        <pre className="reactor-cross-section">{REACTOR_DIAGRAM}</pre>

        <div className="phenomena-grid" style={{ justifyContent: 'center', marginTop: 24 }}>
          {phenomena.map((ph) => (
            <button
              key={ph.id}
              type="button"
              className="phenomenon-chip"
              onClick={() => onPhenomenon(ph.id)}
            >
              {ph.id === 'mass_transfer' ? 'Mass Transfer'
                : ph.id === 'cell_growth' ? 'Cell Growth'
                : ph.id === 'gas_transfer' ? 'Gas Transfer'
                : ph.id === 'heat_transfer' ? 'Heat Transfer'
                : ph.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
