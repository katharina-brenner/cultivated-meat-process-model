import type { MassBalance } from '../types/factory'

interface Props {
  balance: MassBalance
  equipmentTag: string
}

export function MassBalanceView({ balance, equipmentTag }: Props) {
  const inputBlock = Object.entries(balance.inputs)
    .map(([k, v]) => `     ${k.padEnd(14)} ${v.toLocaleString('de-DE')} kg`)
    .join('\n')
  const outputBlock = Object.entries(balance.outputs)
    .map(([k, v]) => `     ${k.padEnd(14)} ${v.toLocaleString('de-DE')} kg`)
    .join('\n')

  const diagram = `                        INPUT
                          │
        ┌─────────────────┴─────────────────┐
${inputBlock}
        └─────────────────┬─────────────────┘
                          ▼
                    ${equipmentTag}
                          │
        ┌─────────────────┴─────────────────┐
${outputBlock}
        └───────────────────────────────────┘`

  return (
    <div className="balance-view">
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 24, textAlign: 'center' }}>
        {equipmentTag} · Mass Balance
      </h2>
      <div className="balance-layout">
        <pre className="balance-diagram">{diagram}</pre>
        <div className="closure-list">
          {Object.entries(balance.closure).map(([key, val]) => (
            <div key={key} className="closure-item">
              <div className="closure-item__label">{key} closure</div>
              <div className="closure-item__value">{val} %</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
