import type { Breadcrumb } from '../types/factory'

interface Props {
  crumbs: Breadcrumb[]
}

export function Breadcrumbs({ crumbs }: Props) {
  return (
    <nav className="breadcrumbs" aria-label="Navigation">
      {crumbs.map((crumb, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span className="breadcrumb-sep">→</span>}
          {crumb.action && i < crumbs.length - 1 ? (
            <button type="button" className="breadcrumb" onClick={crumb.action}>
              {crumb.label}
            </button>
          ) : (
            <span className="breadcrumb breadcrumb--active">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
