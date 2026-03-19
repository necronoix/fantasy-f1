'use client'

import { startInitialAuction, startMiniAuction } from '@/app/actions/auction'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { DriverHelmet } from '@/components/f1/DriverHelmet'
import { DRIVER_TEAMS, TEAM_COLORS } from '@/components/f1/f1-data'

interface Props {
  leagueId: string
  allDrivers: Record<string, unknown>[]
  takenIds: string[]
}

export function AdminDriverPicker({ leagueId, allDrivers, takenIds }: Props) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<string>('')
  const [search, setSearch] = useState('')

  const freeDrivers = allDrivers.filter(d => !takenIds.includes(String(d.id)))
  const filtered = freeDrivers.filter(d =>
    String(d.name).toLowerCase().includes(search.toLowerCase()) ||
    String(d.short_name).toLowerCase().includes(search.toLowerCase())
  )

  // Group by team
  const byTeam: Record<string, typeof filtered> = {}
  for (const d of filtered) {
    const teamId = String((d.team as Record<string, unknown>)?.id ?? '')
    if (!byTeam[teamId]) byTeam[teamId] = []
    byTeam[teamId]!.push(d)
  }

  function handleStart() {
    if (!selected) return toast.error('Seleziona un pilota')
    startTransition(async () => {
      const result = await startInitialAuction(leagueId, selected)
      if (result?.error) toast.error(result.error)
      else toast.success('Asta avviata!')
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-f1-gray text-sm mb-3">
          {takenIds.length}/22 piloti assegnati · {freeDrivers.length} disponibili
        </p>
        <input
          type="text"
          placeholder="Cerca pilota..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red mb-3"
        />
        <div className="max-h-72 overflow-y-auto space-y-3">
          {Object.entries(byTeam).map(([teamId, drivers]) => {
            const color = TEAM_COLORS[teamId] ?? '#888'
            const teamName = String((drivers[0]?.team as Record<string, unknown>)?.name ?? teamId)
            return (
              <div key={teamId}>
                {/* Team header with colored background */}
                <div 
                  className="flex items-center gap-3 mb-2 px-3 py-2 rounded-md"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <div 
                    className="w-1.5 h-6 rounded flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-white flex-1">{teamName}</span>
                  <span className="text-xs text-f1-gray-light">{drivers.length} piloti</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pl-2">
                  {drivers.map(d => {
                    const driverShortName = String(d.short_name ?? '')
                    return (
                      <button
                        key={String(d.id)}
                        type="button"
                        onClick={() => setSelected(selected === String(d.id) ? '' : String(d.id))}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-sm ${
                          selected === String(d.id)
                            ? 'border-f1-red bg-f1-red/10 text-white'
                            : 'border-f1-gray-dark hover:border-f1-gray-mid text-f1-gray-light'
                        }`}
                      >
                        {/* Driver helmet avatar */}
                        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden border border-f1-gray-dark">
                          <DriverHelmet 
                            driverId={driverShortName}
                            size={32}
                          />
                        </div>

                        {/* Driver info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span 
                              className="font-black text-xs flex-shrink-0" 
                              style={{ color }}
                            >
                              {String(d.number ?? '')}
                            </span>
                            <span className="font-semibold truncate">{String(d.name ?? '')}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {selected && (
        <Button onClick={handleStart} loading={pending} size="lg" className="w-full">
          Avvia asta per {String(allDrivers.find(d => String(d.id) === selected)?.name ?? selected)}
        </Button>
      )}
    </div>
  )
}
