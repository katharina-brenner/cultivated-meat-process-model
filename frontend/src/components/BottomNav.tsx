import type { AppPage } from '../types/factory'

interface Props {
  page: AppPage
  onNavigate: (page: AppPage) => void
}

const TABS: { id: AppPage; label: string; icon: string }[] = [
  { id: 'factory', label: 'Factory', icon: '⬡' },
  { id: 'impact', label: 'Impact', icon: '◬' },
  { id: 'guide', label: 'Guide', icon: '?' },
]

export function BottomNav({ page, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item${page === tab.id ? ' bottom-nav__item--active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
