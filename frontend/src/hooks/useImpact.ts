import { useEffect, useState } from 'react'
import type { ImpactSummary } from '../types/factory'

export function useImpact() {
  const [data, setData] = useState<ImpactSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/impact')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

export async function downloadExport() {
  const res = await fetch('/api/export')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cm-factory-export.json'
  a.click()
  URL.revokeObjectURL(url)
}
