import type { Phenomenon } from '../types/factory'

interface Props {
  phenomenon: Phenomenon
}

export function PhenomenonView({ phenomenon }: Props) {
  const isReactions = phenomenon.id === 'reactions'

  return (
    <div className="phenomenon-view">
      <div className="phenomenon-layout">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>{phenomenon.name}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            {phenomenon.description}
          </p>

          <div className="equation-block">{phenomenon.equation}</div>

          {isReactions && (
            <>
              <div style={{ marginTop: 16, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 2 }}>
                <div>Glucose + O₂ → Biomass + CO₂ + H₂O + Heat</div>
                <div>Glucose → Lactate</div>
                <div>Glutamine → Glutamate + NH₃</div>
              </div>
              <pre className="carbon-balance">{`100 % Carbon Input
        │
        ├──── ${phenomenon.live_values.carbon_biomass_percent} % Biomass
        ├──── ${phenomenon.live_values.carbon_CO2_percent} % CO₂
        ├──── ${phenomenon.live_values.carbon_lactate_percent} % Lactate
        ├──── ${phenomenon.live_values.carbon_other_percent} % Other metabolites
        └──── ${phenomenon.live_values.carbon_residual_percent} % Balance residual`}</pre>
            </>
          )}

          {Object.keys(phenomenon.parameters).length > 0 && (
            <section style={{ marginTop: 24 }}>
              <h3 className="panel-section__title">Reaction model</h3>
              <div className="prop-grid">
                {Object.entries(phenomenon.parameters).map(([k, v]) => (
                  <div key={k} className="prop-row">
                    <span className="prop-row__key">{k.replace(/_/g, ' ')}</span>
                    <span className="prop-row__val">{String(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <h3 className="panel-section__title">Live values</h3>
          <div className="prop-grid" style={{ marginBottom: 24 }}>
            {Object.entries(phenomenon.live_values).map(([k, v]) => (
              <div key={k} className="prop-row">
                <span className="prop-row__key">{k.replace(/_/g, ' ')}</span>
                <span className="prop-row__val">{typeof v === 'number' ? v.toLocaleString('de-DE') : v}</span>
              </div>
            ))}
          </div>

          {phenomenon.diagram.length > 0 && (
            <>
              <h3 className="panel-section__title">Transfer pathway</h3>
              <pre className="diagram-block">{phenomenon.diagram.join('\n')}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
