'use client'

import { startInitialAuction } from '@/app/actions/auction'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'

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
    const teamName = String((d.team as Record<string, unknown>)?.name ?? 'Unknown')
    if (!byTeam[teamName]) byTeam[teamName] = []
    byTeam[teamName]!.push(d)
  }

  function handleStart() {
    if (!selected) return toast.error('Seleziona un pilota')
    startTransition(async () => {
      const result = await startInitialAuction(leagueId, selected)
      if (result?.error) toast.error(result.error)
      else toast.success('Asta avviata!')
    })
  }

  const selectedDriver = allDrivers.find(d => String(d.id) === selected)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-f1-gray text-sm mb-3">
          {takenIds.length}/22 piloti assegnati · <span className="text-white font-bold">{freeDrivers.length}</span> disponibili
        </p>
        <input
          type="text"
          placeholder="🔍 Cerca pilota..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red mb-3"
        />
        <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
          {Object.entries(byTeam).map(([teamName, drivers]) => {
            const teamData = drivers[0]?.team as Record<string, unknown>
            const color = String(teamData?.color ?? '#888')
            return (
              <div key={teamName}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{teamName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-3">
                  {drivers.map(d => {
                    const helmetUrl = String(d.helmet_url ?? '')
                    const isSelected = selected === String(d.id)
                    return (
                      <button
                        key={String(d.id)}
                        type="button"
                        onClick={() => setSelected(isSelected ? '' : String(d.id))}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-f1-red bg-f1-red/10 text-white'
                            : 'border-f1-gray-dark hover:border-opacity-60 text-f1-gray-light'
                        }`}
                        style={isSelected ? {} : { borderColor: `${color}30` }}
                      >
                        {helmetUrl ? (
                          <img
                            src={helmetUrl}
                            alt=""
                            className="w-8 h-8 object-contain flex-shrink-0"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement
                              el.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ backgroundColor: `${color}20`, color }}>
                            {String(d.short_name ?? '').slice(0, 3)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate text-white">{String(d.name ?? '')}</p>
                          <p className="text-[10px] text-f1-gray">#{String(d.number ?? '')}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-f1-gray text-sm text-center py-4">Nessun pilota trovato</p>
          )}
        </div>
      </div>

      {selected && selectedDriver && (
        <div className="border border-f1-red/30 rounded-xl p-3 bg-f1-red/5 flex items-center gap-3">
          {selectedDriver.helmet_url && (
            <img src={String(selectedDriver.helmet_url)} alt="" className="w-10 h-10 object-contain" />
          )}
          <div className="flex-1">
            <p className="text-white font-black">{String(selectedDriver.name ?? '')}</p>
            <p className="text-f1-gray text-xs">{String((selectedDriver.team as Record<string,unknown>)?.name ?? '')}</p>
          </div>
          <Button onClick={handleStart} loading={pending} size="sm">
            Avvia asta →
          </Button>
        </div>
      )}
    </div>
  )
}
