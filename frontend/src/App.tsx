import { useState } from 'react'
import type { AppPage } from './types/factory'
import { useFactory } from './hooks/useFactory'
import { useImpact, downloadExport } from './hooks/useImpact'
import { useProcessGuide } from './hooks/useProcessGuide'
import { FactoryFlow } from './components/FactoryFlow'
import { ImpactPage } from './components/ImpactPage'
import { ProcessGuidePage } from './components/ProcessGuidePage'
import { BottomNav } from './components/BottomNav'

export default function App() {
  const { data, error, loading } = useFactory()
  const { data: impact, loading: impactLoading } = useImpact()
  const { data: guide, loading: guideLoading } = useProcessGuide()
  const [page, setPage] = useState<AppPage>('factory')
  const [theme, setTheme] = useState<'light' | 'deep'>('light')
  const [exporting, setExporting] = useState(false)

  const toggleTheme = () => {
    const next = theme === 'light' ? 'deep' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next === 'deep' ? 'deep' : '')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadExport()
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <span className="loading__dot" /><span className="loading__dot" /><span className="loading__dot" />
        Loading factory model…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="loading">
        {error ? `Connection error: ${error}` : 'No data'}
        <p style={{ fontSize: 12, marginTop: 8 }}>Start API: python -m uvicorn cm_process_model.api:app --reload</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <div className="header__logo">CM</div>
          <div>
            <div className="header__title">Digital Factory</div>
            <div className="header__subtitle">
              Brenner et al. 2026 · {data.batch?.product_kg?.toLocaleString('en-US')} kg/batch
            </div>
          </div>
        </div>
        <div className="header__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleExport} disabled={exporting}>
            {exporting ? '…' : 'Export'}
          </button>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <main className="main">
        {page === 'factory' && (
          <div className="canvas-wrap">
            <FactoryFlow model={data} />
          </div>
        )}

        {page === 'impact' && (
          impactLoading || !impact
            ? <div className="loading">Loading impact data…</div>
            : <ImpactPage data={impact} />
        )}

        {page === 'guide' && (
          guideLoading || !guide
            ? <div className="loading">Loading knowledge base…</div>
            : <ProcessGuidePage data={guide} />
        )}
      </main>

      <BottomNav page={page} onNavigate={setPage} />
    </div>
  )
}
