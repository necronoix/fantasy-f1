'use client'

import { setCaptainAndPredictions } from '@/app/actions/gp'
import { Button } from '@/components/ui/Button'
import { DriverCard } from '@/components/f1/DriverCard'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { Star, Target, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  leagueId: string
  gpId: string
  roster: Record<string, unknown>[]
  selection: Record<string, unknown> | null
  allDrivers: Record<string, unknown>[]
  hasSprintRace?: boolean
}

export function GpSelectionForm({ leagueId, gpId, roster, selection, allDrivers }: Props) {
  const predictions = (selection?.predictions_json ?? {}) as Record<string, unknown>
  const [captain, setCaptain] = useState<string>(String(selection?.captain_driver_id ?? ''))
  const [bench, setBench] = useState<string>(String(selection?.bench_driver_id ?? ''))
  const [pole, setPole] = useState<string>(String(predictions.pole_driver_id ?? ''))
  const [winner, setWinner] = useState<string>(String(predictions.winner_driver_id ?? ''))
  const [fastestLap, setFastestLap] = useState<string>(String(predictions.fastest_lap_driver_id ?? ''))
  const [safetyCar, setSafetyCar] = useState<boolean>(Boolean(predictions.safety_car))
  const [podium, setPodium] = useState<string[]>((predictions.podium_driver_ids as string[]) ?? ['', '', ''])
  const [pending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!captain) return toast.error('Scegli un capitano!')
    if (captain === bench) return toast.error('Il capitano non può essere in panchina!')

    const podiumDriverIds = podium.filter(Boolean)

    startTransition(async () => {
      const result = await setCaptainAndPredictions(leagueId, gpId, captain, {
        pole_driver_id: pole || undefined,
        winner_driver_id: winner || undefined,
        fastest_lap_driver_id: fastestLap || undefined,
        safety_car: safetyCar,
        podium_driver_ids: podiumDriverIds.length > 0 ? podiumDriverIds : undefined,
      }, bench || undefined)
      if (result?.error) toast.error(result.error)
      else toast.success('Selezione salvata!')
    })
  }

  const driverSelect = (value: string, onChange: (v: string) => void, label: string, bonus: string, isPrediction: boolean = false) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider flex items-center justify-between">
        <span>{label}</span>
        <span className="text-green-400 font-bold normal-case">{bonus}</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red transition-all duration-300',
          isPrediction
            ? 'bg-f1-gray-dark/60 border-f1-red/40 hover:border-f1-red/60'
            : 'bg-f1-gray-dark border-f1-gray-mid'
        )}
      >
        <option value="">— Scegli pilota —</option>
        {allDrivers.map((d) => {
          const teamName = (d as any)?.team?.name || (d as any)?.team?.short_name || ''
          return (
            <option key={String(d.id)} value={String(d.id)}>
              {String(d.short_name)} — {String(d.name)}{teamName ? ` (${teamName})` : ''}
            </option>
          )
        })}
      </select>
    </div>
  )

  // Filter out team entries (roster entries without a driver) — only pilots can be benched/captained
  const driverRoster = roster.filter(r => (r.driver as Record<string, unknown> | null) != null)

  const starterCount = bench ? driverRoster.filter(r => String((r.driver as Record<string, unknown>)?.id ?? '') !== bench).length : driverRoster.length

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Bench selection — choose who sits out */}
      {driverRoster.length >= 4 && (
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-xl p-4 backdrop-blur-sm">
          <label className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UserMinus className="w-3.5 h-3.5 text-orange-400" />
            Panchina (1 pilota di riserva)
          </label>
          <p className="text-f1-gray text-xs mb-3">
            Scegli chi mettere in panchina. Se un titolare ha DNC, il panchinaro lo sostituisce ed eredita il ruolo di capitano.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {driverRoster.map((r) => {
              const driver = r.driver as Record<string, unknown>
              const team = driver.team as Record<string, unknown>
              const teamColor = String(team?.color ?? '#888')
              const driverId = String(driver.id)
              const isBench = bench === driverId

              return (
                <DriverCard
                  key={driverId}
                  driverId={driverId}
                  driverName={String(driver.name ?? '')}
                  driverShortName={String(driver.short_name ?? '')}
                  driverNumber={String(driver.number ?? '')}
                  teamName={String(team?.short_name ?? '')}
                  teamColor={teamColor}
                  size="sm"
                  selected={isBench}
                  badge={isBench ? 'PANCHINA' : undefined}
                  badgeColor={isBench ? '#f97316' : undefined}
                  onClick={() => setBench(isBench ? '' : driverId)}
                />
              )
            })}
          </div>
          <p className="text-f1-gray text-xs mt-3 text-center font-medium">
            Titolari: <span className="text-white font-bold">{starterCount}</span>/3
            {bench && <span className="text-orange-400 ml-2 font-semibold">· 1 in panchina</span>}
          </p>
        </div>
      )}

      {/* Captain selection */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm">
        <label className="text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          Capitano (×2 punti) — solo tra i titolari
        </label>
        <div className="grid grid-cols-2 gap-3">
          {driverRoster.map((r) => {
            const driver = r.driver as Record<string, unknown>
            const team = driver.team as Record<string, unknown>
            const teamColor = String(team?.color ?? '#888')
            const driverId = String(driver.id)
            const isSelected = captain === driverId
            const isBenched = bench === driverId
            return (
              <DriverCard
                key={driverId}
                driverId={driverId}
                driverName={String(driver.name ?? '')}
                driverShortName={String(driver.short_name ?? '')}
                driverNumber={String(driver.number ?? '')}
                teamName={String(team?.short_name ?? '')}
                teamColor={teamColor}
                size="md"
                selected={isSelected}
                selectedColor="#facc15"
                badge={isSelected ? 'CAPITANO' : undefined}
                badgeColor={isSelected ? '#facc15' : undefined}
                onClick={() => !isBenched && setCaptain(driverId)}
                className={isBenched ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
              />
            )
          })}
        </div>
      </div>

      {/* Predictions - separate glassmorphism panel with red accent */}
      <div className="bg-gradient-to-br from-f1-red/10 to-f1-red/5 border-2 border-f1-red/40 rounded-xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5 pb-2 border-b border-f1-red/30">
          <Target className="w-4 h-4 text-f1-red" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">Scommesse</p>
          <span className="text-f1-gray text-xs">(punti bonus se indovini)</span>
        </div>

        {driverSelect(pole, setPole, 'Pole Position', '+5 pt', true)}
        {driverSelect(winner, setWinner, 'Vincitore Gara', '+5 pt', true)}
        {driverSelect(fastestLap, setFastestLap, 'Giro Veloce', '+3 pt', true)}

        {/* Podium selection */}
        <div className="flex flex-col gap-2">
          <div className="border-t border-f1-red/30 pt-3">
            <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider flex items-center justify-between">
              <span>Podio (2°, 3° e 4° posto)</span>
              <span className="text-green-400 font-bold normal-case">+2 pt cad.</span>
            </label>
            <p className="text-f1-gray text-[10px] mt-1">Il 1° posto è già coperto dal pronostico vincitore</p>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <select
                key={i}
                value={podium[i] ?? ''}
                onChange={(e) => {
                  const newPodium = [...podium]
                  newPodium[i] = e.target.value
                  setPodium(newPodium)
                }}
                className="w-full bg-f1-gray-dark/70 border border-f1-red/40 hover:border-f1-red/60 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red transition-all duration-300"
              >
                <option value="">— {i + 2}° posto —</option>
                {allDrivers.map((d) => {
                  const teamName = (d as any)?.team?.name || (d as any)?.team?.short_name || ''
                  return (
                    <option key={String(d.id)} value={String(d.id)}>
                      {String(d.short_name)} — {String(d.name)}{teamName ? ` (${teamName})` : ''}
                    </option>
                  )
                })}
              </select>
            ))}
          </div>
        </div>

        {/* Safety car */}
        <div className="flex items-center gap-3 py-2 border-t border-f1-red/30 pt-3">
          <input
            type="checkbox"
            id="safety_car"
            checked={safetyCar}
            onChange={(e) => setSafetyCar(e.target.checked)}
            className="w-4 h-4 accent-f1-red rounded"
          />
          <label htmlFor="safety_car" className="text-sm text-f1-gray-light cursor-pointer flex-1 font-medium">
            Safety Car durante la gara
          </label>
          <span className="text-green-400 text-xs font-bold">+3 pt</span>
        </div>
      </div>

      <Button
        type="submit"
        loading={pending}
        className="w-full bg-gradient-to-r from-f1-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold shadow-lg hover:shadow-[0_0_20px_rgba(232,0,45,0.4)] transition-all duration-300"
      >
        Salva selezione
      </Button>
    </form>
  )
}
