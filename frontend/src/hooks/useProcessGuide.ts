import { useEffect, useState } from 'react'
import type { GuideData } from '../types/guide'

export function useProcessGuide() {
  const [data, setData] = useState<GuideData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/guide')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
