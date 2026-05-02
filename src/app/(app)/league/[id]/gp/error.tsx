'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function GpListError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('GP List error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="text-6xl">🏎️💥</div>
      <h2 className="text-xl font-black text-white">Errore pagina GP</h2>
      <p className="text-f1-gray text-sm text-center max-w-md">
        {error.message || 'Errore inaspettato'}
      </p>
      {error.digest && (
        <p className="text-f1-gray-dark text-xs">Digest: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="primary">Riprova</Button>
        <Button onClick={() => window.history.back()} variant="secondary">Torna indietro</Button>
      </div>
    </div>
  )
}
