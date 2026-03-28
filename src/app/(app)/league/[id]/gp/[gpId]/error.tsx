'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function GpError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('GP Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="text-6xl">🏎️💥</div>
      <h2 className="text-xl font-black text-white">Errore nel caricamento del GP</h2>
      <p className="text-f1-gray text-sm text-center max-w-md">
        Si è verificato un errore nel caricamento della pagina.
        {error.digest && (
          <span className="block text-f1-gray-dark text-xs mt-1">Digest: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="primary">
          Riprova
        </Button>
        <Button onClick={() => window.history.back()} variant="secondary">
          Torna indietro
        </Button>
      </div>
    </div>
  )
}
