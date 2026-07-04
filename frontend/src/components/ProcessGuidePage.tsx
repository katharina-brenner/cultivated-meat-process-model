import { useMemo, useState } from 'react'
import type { GuideData } from '../types/guide'

interface Props {
  data: GuideData
}

export function ProcessGuidePage({ data }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.categories
    return data.categories
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.questions.length > 0)
  }, [data.categories, query])

  const visibleCount = filtered.reduce((n, c) => n + c.questions.length, 0)

  return (
    <div className="guide-page">
      <header className="guide-page__intro">
        <h1 className="guide-title">{data.title}</h1>
        <p className="guide-subtitle">{data.subtitle} · {data.total_questions} questions — all answers shown below</p>
      </header>

      <div className="guide-search-wrap">
        <input
          type="search"
          className="guide-search"
          placeholder="Filter e.g. CO₂, bioreactor, sterilization…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <span className="guide-search-count">{visibleCount} matches</span>}
      </div>

      <div className="guide-categories">
        {filtered.map((cat) => (
          <section key={cat.id} className="guide-category">
            <h2 className="guide-category__title">
              <span className="guide-category__icon">{cat.icon}</span>
              {cat.title}
              <span className="guide-category__count">{cat.questions.length}</span>
            </h2>
            <div className="guide-list">
              {cat.questions.map((item, idx) => (
                <article key={`${cat.id}-${idx}`} className="guide-item guide-item--open">
                  <h3 className="guide-item__q">{item.q}</h3>
                  <p className="guide-item__a">{item.a}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="guide-empty">No matches — try a different search term.</p>
        )}
      </div>
    </div>
  )
}
