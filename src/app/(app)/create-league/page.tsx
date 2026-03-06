'use client'

import { createLeague } from '@/app/actions/league'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateLeaguePage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createLeague(fd)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="max-w-md mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-f1-gray hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>
      <h1 className="text-2xl font-black mb-6">Crea una lega</h1>
      <div className="bg-f1-black-light border border-f1-gray-dark rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            name="name"
            label="Nome della lega"
            placeholder="es. Scuderia degli Amici"
            required
            minLength={3}
            maxLength={50}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">
              Max giocatori
            </label>
            <select
              name="max_players"
              className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
              defaultValue="5"
            >
              {[2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} giocatori</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">
              Fuso orario
            </label>
            <select
              name="timezone"
              className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
              defaultValue="Europe/Rome"
            >
              <option value="Europe/Rome">Europa/Roma (CET/CEST)</option>
              <option value="Europe/London">Europa/Londra (GMT/BST)</option>
              <option value="America/New_York">America/New York (ET)</option>
              <option value="America/Los_Angeles">America/Los Angeles (PT)</option>
            </select>
          </div>

          <div className="bg-f1-gray-dark rounded-lg p-3 text-xs text-f1-gray space-y-1">
            <p>✓ Budget asta: <span className="text-white font-semibold">200 crediti</span></p>
            <p>✓ Piloti per rosa: <span className="text-white font-semibold">4</span></p>
            <p>✓ Mercato: <span className="text-white font-semibold">Mini-asta</span></p>
            <p>✓ Scambi: <span className="text-white font-semibold">1 al mese</span></p>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={pending}>
            Crea lega
          </Button>
        </form>
      </div>
    </div>
  )
}
