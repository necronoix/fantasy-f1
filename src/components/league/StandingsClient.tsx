'use client'

import { useState } from 'react'
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel'
import { GpScoreModal } from './GpScoreModal'
import { DriverHelmet } from '@/components/f1/DriverHelmet'
import { Trophy } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

interface DriverBreakdown {
  driver_id: string
  driver_name: string
  qualifying_pts: number
  race_pts: number
  sprint_pts: number
  fastest_lap_pts: number
  penalty_pts: number
  positions_gained_pts?: number
  is_captain: boolean
  captain_multiplier_applied: boolean
  is_bench_sub?: boolean
  subtotal: number
}

interface Breakdown {
  drivers: DriverBreakdown[]
  predictions_pts: number
  team_pts?: number
  team_name?: string
  total: number
}

interface GpScoreEntry {
  gp_id: string
  gp_name: string
  gp_round: number
  total_points: number
  breakdown: Breakdown | null
}

interface PlayerData {
  uid: string
  name: string
  total: number
  gps: number
  gpScores: GpScoreEntry[]
}

interface DriverInfo {
  short_name: string
  helmet_url?: string | null
  team?: { color: string } | null
}

interface Props {
  ranked: PlayerData[]
  currentUserId: string
  rostersByUser: Record<string, DriverInfo[]>
  completedGps: { id: string; name: string; round: number }[]
  scoreByUserGp: Record<string, Record<string, number>>
}

export function StandingsClient({ ranked, currentUserId, rostersByUser, completedGps, scoreByUserGp }: Props) {
  const [openPlayer, setOpenPlayer] = useState<string | null>(null)
  const [modal, setModal] = useState<{ playerName: string; gpName: string; gpRound: number; totalPoints: number; breakdown: Breakdown } | null>(null)

  // Build a lookup: uid -> gpId -> breakdown
  const breakdownLookup: Record<string, Record<string, { gpName: string; gpRound: number; totalPoints: number; breakdown: Breakdown }>> = {}
  for (const entry of ranked) {
    breakdownLookup[entry.uid] = {}
    for (const gs of entry.gpScores) {
      if (gs.breakdown) {
        breakdownLookup[entry.uid]![gs.gp_id] = {
          gpName: gs.gp_name,
          gpRound: gs.gp_round,
          totalPoints: gs.total_points,
          breakdown: gs.breakdown,
        }
      }
    }
  }

  const handleCellClick = (uid: string, gpId: string, playerName: string) => {
    const data = breakdownLookup[uid]?.[gpId]
    if (data) {
      setModal({ playerName, ...data })
    }
  }

  return (
    <>
      {/* Modal */}
      {modal && (
        <GpScoreModal
          playerName={modal.playerName}
          gpName={modal.gpName}
          gpRound={modal.gpRound}
          totalPoints={modal.totalPoints}
          breakdown={modal.breakdown}
          onClose={() => setModal(null)}
        />
      )}

      {/* Total standings */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]" />
            <span className="text-xl">Classifica generale</span>
          </CardTitle>
        </CardHeader>
        {ranked.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-8">Nessun risultato ancora. Completa il primo GP!</p>
        ) : (
          <div className="space-y-2 mt-4 px-4 pb-4">
            {ranked.map((entry, i) => {
              const isMe = entry.uid === currentUserId
              const myDrivers = rostersByUser[entry.uid] ?? []
              const isOpen = openPlayer === entry.uid

              let rowBg = 'bg-f1-gray-dark/40 border border-f1-gray-dark/60'
              let positionBg = 'bg-f1-gray-dark'
              let positionColor = 'text-f1-gray-light'

              if (i === 0) {
                rowBg = 'bg-gradient-to-r from-yellow-600/40 via-yellow-500/20 to-yellow-600/10 border border-yellow-500/50'
                positionBg = 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                positionColor = 'text-white'
              } else if (i === 1) {
                rowBg = 'bg-gradient-to-r from-gray-400/30 via-gray-300/15 to-gray-400/10 border border-gray-400/40'
                positionBg = 'bg-gradient-to-br from-gray-400 to-gray-500'
                positionColor = 'text-white'
              } else if (i === 2) {
                rowBg = 'bg-gradient-to-r from-amber-700/30 via-amber-600/15 to-amber-700/10 border border-amber-600/40'
                positionBg = 'bg-gradient-to-br from-amber-600 to-amber-700'
                positionColor = 'text-white'
              }

              return (
                <div key={entry.uid}>
                  <div
                    onClick={() => setOpenPlayer(isOpen ? null : entry.uid)}
                    className={`relative flex items-stretch rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${isMe ? 'ring-2 ring-red-500/40' : ''} ${rowBg}`}
                  >
                    {/* Position badge */}
                    <div className={`flex items-center justify-center flex-shrink-0 w-20 ${positionBg} ${positionColor} font-black text-3xl`}>
                      {i + 1}
                    </div>
                    <div className="w-px bg-white/10" />

                    {/* Center section */}
                    <div className="flex-1 flex items-center gap-4 px-6 py-4">
                      {myDrivers.length > 0 && (
                        <div className="flex gap-1 flex-shrink-0">
                          {myDrivers.slice(0, 3).map((d, di) => (
                            <div key={di} className="flex items-center justify-center">
                              <DriverHelmet driverId={d.short_name} size={24} />
                            </div>
                          ))}
                          {myDrivers.length > 3 && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-f1-gray-dark text-white text-xs font-bold flex-shrink-0">
                              +{myDrivers.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white text-lg leading-tight uppercase tracking-wider">
                          {entry.name}
                          {isMe && <span className="text-f1-red text-xs ml-2 font-bold">YOU</span>}
                        </p>
                        <p className="text-f1-gray text-xs uppercase tracking-widest font-semibold mt-0.5">
                          {entry.gps} GP · {entry.gps > 0 ? (entry.total / entry.gps).toFixed(1) : '0'} ppg · click per dettagli
                        </p>
                      </div>
                    </div>

                    <div className="w-px bg-white/10" />

                    {/* Points */}
                    <div className="flex flex-col items-center justify-center flex-shrink-0 px-6 py-4 min-w-24">
                      <p className="text-white font-black text-2xl leading-tight">{entry.total}</p>
                      <p className="text-f1-gray text-xs uppercase tracking-wider font-bold mt-0.5">Points</p>
                    </div>
                  </div>

                  {/* Score breakdown panel */}
                  <ScoreBreakdownPanel
                    playerName={entry.name}
                    totalPoints={entry.total}
                    gpScores={entry.gpScores}
                    isOpen={isOpen}
                    onToggle={() => setOpenPlayer(isOpen ? null : entry.uid)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* GP-by-GP table */}
      {completedGps.length > 0 && (
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">📊</span>
              <span>Storico per GP</span>
            </CardTitle>
            <p className="text-f1-gray text-xs mt-1">Clicca su un punteggio per vedere il dettaglio</p>
          </CardHeader>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-f1-red/60 scrollbar-track-f1-black mt-4">
            <table className="f1-table w-full">
              <thead>
                <tr className="border-b-2 border-f1-red/50 bg-f1-black-light/60">
                  <th className="text-left py-4 pr-4 text-f1-red font-black uppercase tracking-widest text-[11px] drop-shadow-sm">Giocatore</th>
                  {completedGps.map((gp) => (
                    <th key={gp.id} className="text-center py-4 px-2 text-f1-gray-light font-bold uppercase tracking-widest text-[10px] whitespace-nowrap group hover:text-f1-red transition-colors">
                      <span className="inline-block group-hover:animate-pulse font-black">R{gp.round}</span>
                    </th>
                  ))}
                  <th className="text-right py-4 pl-4 text-f1-red font-black uppercase tracking-widest text-[11px] drop-shadow-sm">Tot</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry, idx) => (
                  <tr
                    key={entry.uid}
                    className={`border-b transition-all duration-200 hover:bg-white/5 ${
                      idx % 2 === 0 ? 'bg-white/2' : 'bg-transparent'
                    } ${entry.uid === currentUserId ? 'border-f1-red/50' : 'border-f1-gray-dark/30'}`}
                  >
                    <td className="py-4 pr-4 font-bold text-white whitespace-nowrap flex items-center gap-3">
                      <span className="text-xs font-black text-f1-red w-6 text-center">{idx + 1}</span>
                      <span className="truncate">{entry.name}</span>
                      {entry.uid === currentUserId && (
                        <span className="text-f1-red text-lg drop-shadow-[0_0_4px_rgba(232,0,45,0.5)]">●</span>
                      )}
                    </td>
                    {completedGps.map((gp) => {
                      const pts = scoreByUserGp[entry.uid]?.[gp.id]
                      const hasBreakdown = !!breakdownLookup[entry.uid]?.[gp.id]
                      return (
                        <td key={gp.id} className="text-center py-4 px-2">
                          {pts !== undefined ? (
                            <button
                              onClick={() => handleCellClick(entry.uid, gp.id, entry.name)}
                              disabled={!hasBreakdown}
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-f1-red/30 to-f1-red/10 border border-f1-red/50 text-white font-bold text-sm drop-shadow-md shadow-[0_0_10px_rgba(232,0,45,0.2)] transition-all duration-200 ${
                                hasBreakdown
                                  ? 'cursor-pointer hover:scale-110 hover:from-f1-red/50 hover:to-f1-red/25 hover:border-f1-red hover:shadow-[0_0_20px_rgba(232,0,45,0.4)] active:scale-95'
                                  : ''
                              }`}
                            >
                              {pts}
                            </button>
                          ) : (
                            <span className="text-f1-gray text-lg">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-right py-4 pl-4 font-black text-xl">
                      <span className="text-f1-red drop-shadow-[0_0_12px_rgba(232,0,45,0.5)]">{entry.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
