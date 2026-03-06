'use client'

import { setCaptainAndPredictions } from '@/app/actions/gp'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { Star, Target } from 'lucide-react'

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
  const [podium, setPodium] = useState<string[]>((predictions.podium_driver_ids as string[]) ?? ['', '', ''])
  const [pending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!captain) return toast.error('Scegli un capitano!')

    const podiumDriverIds = podium.filter(Boolean)

    startTransition(async () => {
      const result = await setCaptainAndPredictions(leagueId, gpId, captain, {
        pole_driver_id: pole || undefined,
        winner_driver_id: winner || undefined,
        fastest_lap_driver_id: fastestLap || undefined,
        safety_car: safetyCar,
        podium_driver_ids: podiumDriverIds.length > 0 ? podiumDriverIds : undefined,
      })
      if (result?.error) toast.error(result.error)
      else toast.success('Selezione salvata!')
    })
  }

  const driverSelect = (value: string, onChange: (v: string) => void, label: string, bonus: string) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider flex items-center justify-between">
        <span>{label}</span>
        <span className="text-green-400 font-bold normal-case">{bonus}</span>
      </label>
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
      {/* Captain selection - grid of driver cards */}
      <div>
        <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider mb-3 block">
          <Star className="w-3 h-3 inline mr-1 text-yellow-400" />
          Capitano (×2 punti)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {roster.map((r) => {
            const driver = r.driver as Record<string, unknown>
            if (!driver) return null
            const team = driver.team as Record<string, unknown>
            const teamColor = String(team?.color ?? '#888')
            const helmetUrl = String(driver.helmet_url ?? '')
            const photoUrl = String(driver.photo_url ?? '')
            const isSelected = captain === String(driver.id)
            return (
              <button
                key={String(driver.id)}
                type="button"
                onClick={() => setCaptain(String(driver.id))}
                className={`relative flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left overflow-hidden ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-f1-gray-dark bg-f1-gray-dark hover:border-f1-gray-mid'
                }`}
              >
                {/* Team color bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: teamColor }} />
                {/* Helmet */}
                <div className="ml-1 w-10 h-10 rounded-lg overflow-hidden bg-f1-black-light flex-shrink-0 flex items-center justify-center">
                  {helmetUrl ? (
                    <img src={helmetUrl} alt={String(driver.short_name ?? '')} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full rounded-lg" style={{ backgroundColor: teamColor + '44' }} />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-xs leading-tight truncate">{String(driver.short_name ?? '')}</p>
                  <p className="text-f1-gray text-[10px] truncate">{String(team?.short_name ?? '')}</p>
                </div>
                {/* Photo */}
                {photoUrl && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 opacity-80">
                    <img src={photoUrl} alt="" className="w-full h-full object-cover object-top" />
                  </div>
                )}
                {isSelected && (
                  <Star className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Predictions / Scommesse */}
      <div className="bg-f1-black-light border border-f1-gray-dark rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-f1-red" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">Scommesse</p>
          <span className="text-f1-gray text-xs">(punti bonus se indovini)</span>
        </div>

        {driverSelect(pole, setPole, 'Pole Position', '+5 pt')}
        {driverSelect(winner, setWinner, 'Vincitore Gara', '+5 pt')}
        {driverSelect(fastestLap, setFastestLap, 'Giro Veloce', '+3 pt')}

        {/* Podium selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider flex items-center justify-between">
            <span>Podio (scegli fino a 3)</span>
            <span className="text-green-400 font-bold normal-case">+2 pt cad.</span>
          </label>
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <select
                key={i}
                value={podium[i] ?? ''}
                onChange={(e) => {
                  const newPodium = [...podium]
                  newPodium[i] = e.target.value
                  setPodium(newPodium)
                }}
                className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
              >
                <option value="">— {i + 1}° posto —</option>
                {allDrivers.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {String(d.short_name)} — {String(d.name)}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        {/* Safety car */}
        <div className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            id="safety_car"
            checked={safetyCar}
            onChange={(e) => setSafetyCar(e.target.checked)}
            className="w-4 h-4 accent-f1-red"
          />
          <label htmlFor="safety_car" className="text-sm text-f1-gray-light cursor-pointer flex-1">
            Safety Car durante la gara
          </label>
          <span className="text-green-400 text-xs font-bold">+2 pt</span>
        </div>
      </div>

      <Button type="submit" loading={pending} className="w-full">
        Salva selezione
      </Button>
    </form>
  )
}
