import { useEffect, useState } from 'react'
import type { FactoryModel } from '../types/factory'

export function useFactory() {
  const [data, setData] = useState<FactoryModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/factory')
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, error, loading }
}
