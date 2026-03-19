'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Star, Shield, Target } from 'lucide-react'

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

interface Props {
  playerName: string
  totalPoints: number
  gpScores: GpScoreEntry[]
  isOpen: boolean
  onToggle: () => void
}

export function ScoreBreakdownPanel({ playerName, totalPoints, gpScores, isOpen, onToggle }: Props) {
  const [expandedGp, setExpandedGp] = useState<string | null>(null)

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-white/5 hover:bg-white/8 rounded-lg transition-all text-xs text-f1-gray-light"
      >
        <span className="font-semibold uppercase tracking-wider">Dettaglio punteggi</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {gpScores.length === 0 ? (
            <p className="text-f1-gray text-xs px-3 py-2">Nessun punteggio disponibile</p>
          ) : (
            gpScores.map((gp) => {
              const isExpanded = expandedGp === gp.gp_id
              const bd = gp.breakdown

              return (
                <div key={gp.gp_id} className="border border-white/10 rounded-lg overflow-hidden">
                  {/* GP Header - always visible */}
                  <button
                    onClick={() => setExpandedGp(isExpanded ? null : gp.gp_id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-f1-gray-dark/50 hover:bg-f1-gray-dark/70 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-f1-red font-black text-sm">R{gp.gp_round}</span>
                      <span className="text-white font-semibold text-xs">{gp.gp_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-sm">{gp.total_points} pts</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-f1-gray" /> : <ChevronDown className="w-3.5 h-3.5 text-f1-gray" />}
                    </div>
                  </button>

                  {/* Expanded breakdown */}
                  {isExpanded && bd && (
                    <div className="px-3 py-3 bg-f1-black-light/50 space-y-3 text-xs">
                      {/* Drivers */}
                      {bd.drivers.map((d) => (
                        <div key={d.driver_id} className={`rounded-lg p-2.5 ${d.is_captain ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5 border border-white/10'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {d.is_captain && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                              {d.is_bench_sub && <Shield className="w-3.5 h-3.5 text-purple-400" />}
                              <span className="font-bold text-white">{d.driver_name || d.driver_id}</span>
                              {d.is_captain && <span className="text-yellow-400 text-[10px] font-bold">(CAPITANO x2)</span>}
                              {d.is_bench_sub && <span className="text-purple-400 text-[10px] font-bold">(PANCHINA)</span>}
                            </div>
                            <span className={`font-black text-sm ${d.subtotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {d.subtotal > 0 ? '+' : ''}{d.subtotal}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
                            <div className="bg-f1-gray-dark/60 rounded px-2 py-1">
                              <span className="text-f1-gray block">Qualifica</span>
                              <span className="text-white font-bold">{d.qualifying_pts > 0 ? '+' : ''}{d.qualifying_pts}</span>
                            </div>
                            <div className="bg-f1-gray-dark/60 rounded px-2 py-1">
                              <span className="text-f1-gray block">Gara</span>
                              <span className={`font-bold ${d.race_pts >= 0 ? 'text-white' : 'text-red-400'}`}>{d.race_pts > 0 ? '+' : ''}{d.race_pts}</span>
                            </div>
                            {d.fastest_lap_pts > 0 && (
                              <div className="bg-purple-500/20 rounded px-2 py-1">
                                <span className="text-purple-300 block">G. Veloce</span>
                                <span className="text-purple-200 font-bold">+{d.fastest_lap_pts}</span>
                              </div>
                            )}
                            {(d.positions_gained_pts ?? 0) > 0 && (
                              <div className="bg-green-500/20 rounded px-2 py-1">
                                <span className="text-green-300 block">Pos. guad.</span>
                                <span className="text-green-200 font-bold">+{d.positions_gained_pts}</span>
                              </div>
                            )}
                            {d.penalty_pts < 0 && (
                              <div className="bg-red-500/20 rounded px-2 py-1">
                                <span className="text-red-300 block">Penalità</span>
                                <span className="text-red-200 font-bold">{d.penalty_pts}</span>
                              </div>
                            )}
                            {d.sprint_pts > 0 && (
                              <div className="bg-cyan-500/20 rounded px-2 py-1">
                                <span className="text-cyan-300 block">Sprint</span>
                                <span className="text-cyan-200 font-bold">+{d.sprint_pts}</span>
                              </div>
                            )}
                          </div>
                          {d.is_captain && (
                            <p className="text-yellow-400/70 text-[10px] mt-1">
                              Raw: {d.subtotal / 2} × 2 = {d.subtotal}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Team score */}
                      {bd.team_pts !== undefined && bd.team_pts !== 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-blue-400" />
                              <span className="font-bold text-white">Scuderia {bd.team_name ?? ''}</span>
                            </div>
                            <span className={`font-black text-sm ${bd.team_pts >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                              {bd.team_pts > 0 ? '+' : ''}{bd.team_pts}
                            </span>
                          </div>
                          <p className="text-blue-300/60 text-[10px] mt-1">Somma punti dei 2 piloti della scuderia (senza x2 capitano)</p>
                        </div>
                      )}

                      {/* Predictions */}
                      {bd.predictions_pts > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-bold text-white">Pronostici</span>
                            </div>
                            <span className="font-black text-sm text-emerald-300">+{bd.predictions_pts}</span>
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-f1-gray font-bold uppercase tracking-wider text-[11px]">Totale GP</span>
                        <span className="text-white font-black text-lg">{bd.total}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
