import { useState } from 'react'
import type { ProcessStream } from '../types/factory'
import { propertyLabel, formatPropertyValue } from '../utils/format'

interface Props {
  stream: ProcessStream
  onClose: () => void
}

type Tab = 'composition' | 'properties' | 'balance'

export function StreamPanel({ stream, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('composition')
  const compEntries = Object.entries(stream.composition).sort((a, b) => b[1] - a[1])
  const propEntries = Object.entries(stream.properties)

  return (
    <aside className="side-panel">
      <header className="panel-header">
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close">×</button>
        <div className="panel-tag">{stream.tag}</div>
        <h2 className="panel-title">{stream.name}</h2>
      </header>

      <div className="panel-body">
        <section className="panel-section">
          <h3 className="panel-section__title">Current state</h3>
          <div className="prop-grid">
            {propEntries.slice(0, 6).map(([key, val]) => (
              <div key={key} className="prop-row">
                <span className="prop-row__key">{propertyLabel(key)}</span>
                <span className="prop-row__val">{formatPropertyValue(key, val)}</span>
              </div>
            ))}
          </div>
        </section>

        <nav className="tabs">
          {(['composition', 'properties', 'balance'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`tab${tab === t ? ' tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'composition' ? 'Composition' : t === 'properties' ? 'Properties' : 'Mass & Energy'}
            </button>
          ))}
        </nav>

        {tab === 'composition' && (
          <div className="composition-list">
            {compEntries.map(([name, pct]) => (
              <div key={name} className="composition-item">
                <span className="composition-label">{name}</span>
                <div className="composition-bar-wrap">
                  <div className="composition-bar" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
                </div>
                <span className="composition-value">{pct.toFixed(2)} %</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'properties' && (
          <div className="prop-grid">
            {propEntries.map(([key, val]) => (
              <div key={key} className="prop-row">
                <span className="prop-row__key">{propertyLabel(key)}</span>
                <span className="prop-row__val">{formatPropertyValue(key, val)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'balance' && (
          <div className="prop-grid">
            <div className="prop-row">
              <span className="prop-row__key">Mass closure</span>
              <span className="prop-row__val">99.97 %</span>
            </div>
            <div className="prop-row">
              <span className="prop-row__key">Energy closure</span>
              <span className="prop-row__val">99.84 %</span>
            </div>
            <div className="prop-row">
              <span className="prop-row__key">Stream phase</span>
              <span className="prop-row__val">Liquid</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
