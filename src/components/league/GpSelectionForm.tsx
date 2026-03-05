'use client'

import { setCaptainAndPredictions } from '@/app/actions/gp'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { Star } from 'lucide-react'

interface Props {
  leagueId: string
  gpId: string
  roster: Record<string, unknown>[]
  selection: Record<string, unknown> | null
  allDrivers: Record<string, unknown>[]
  hasSprintRace: boolean
}

export function GpSelectionForm({ leagueId, gpId, roster, selection, allDrivers }: Props) {
  const predictions = (selection?.predictions_json ?? {}) as Record<string, unknown>
  const [captain, setCaptain] = useState<string>(String(selection?.captain_driver_id ?? ''))
  const [pole, setPole] = useState<string>(String(predictions.pole_driver_id ?? ''))
  const [winner, setWinner] = useState<string>(String(predictions.winner_driver_id ?? ''))
  const [fastestLap, setFastestLap] = useState<string>(String(predictions.fastest_lap_driver_id ?? ''))
  const [safetyCar, setSafetyCar] = useState<boolean>(Boolean(predictions.safety_car))
  const [pending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!captain) return toast.error('Scegli un capitano!')

    startTransition(async () => {
      const result = await setCaptainAndPredictions(leagueId, gpId, captain, {
        pole_driver_id: pole || undefined,
        winner_driver_id: winner || undefined,
        fastest_lap_driver_id: fastestLap || undefined,
        safety_car: safetyCar,
      })
      if (result?.error) toast.error(result.error)
      else toast.success('Selezione salvata!')
    })
  }

  const driverSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
      >
        <option value="">— Scegli pilota —</option>
        {allDrivers.map((d) => (
          <option key={String(d.id)} value={String(d.id)}>
            {String(d.short_name)} — {String(d.name)}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Captain selection */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-3">
          <Star className="w-3.5 h-3.5 inline mr-1 text-yellow-400" />
          Capitano <span className="text-f1-gray font-normal">(punti x2)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {roster.map((entry) => {
            const driver = entry.driver as Record<string, unknown>
            const isSel = captain === String(driver?.id ?? '')
            return (
              <button
                key={String(driver?.id ?? '')}
                type="button"
                onClick={() => setCaptain(String(driver?.id ?? ''))}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                  isSel
                    ? 'border-f1-red bg-f1-red/10 text-white'
                    : 'border-f1-gray-dark hover:border-f1-gray-mid text-f1-gray-light'
                }`}
              >
                {isSel && <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{String(driver?.name ?? '')}</p>
                  <p className="text-xs opacity-70">{String((driver?.team as Record<string, unknown>)?.short_name ?? '')}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Predictions */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-3">Pronostici extra (bonus punti)</p>
        <div className="grid grid-cols-1 gap-3">
          {driverSelect(pole, setPole, 'Pole position')}
          {driverSelect(winner, setWinner, 'Vincitore gara')}
          {driverSelect(fastestLap, setFastestLap, 'Giro veloce')}
          <div className="flex items-center justify-between p-3 bg-f1-gray-dark rounded-lg">
            <label className="text-sm font-semibold text-white">Safety Car durante la gara?</label>
            <button
              type="button"
              onClick={() => setSafetyCar(!safetyCar)}
              className={`relative w-12 h-6 rounded-full transition-colors ${safetyCar ? 'bg-f1-red' : 'bg-f1-gray-mid'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${safetyCar ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <Button type="submit" loading={pending} className="w-full" size="lg">
        Salva selezione
      </Button>
    </form>
  )
}
