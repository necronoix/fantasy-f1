'use client'

import { useEffect } from 'react'
import { X, Star, Shield, Target, Zap, AlertTriangle, TrendingUp, Flag } from 'lucide-react'

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

interface Props {
  playerName: string
  gpName: string
  gpRound: number
  totalPoints: number
  breakdown: Breakdown
  onClose: () => void
}

export function GpScoreModal({ playerName, gpName, gpRound, totalPoints, breakdown, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const bd = breakdown

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-f1-black-light to-f1-black border border-white/15 shadow-2xl shadow-red-500/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-f1-red/90 to-red-700/90 backdrop-blur-md px-5 py-4 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-white text-lg">
              R{gpRound}
            </div>
            <div>
              <h2 className="text-white font-black text-lg leading-tight">{gpName}</h2>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{playerName}</p>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-white font-black text-3xl">{totalPoints}</span>
            <span className="text-white/60 text-sm font-bold uppercase">punti totali</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Section: Piloti */}
          <div>
            <h3 className="text-f1-gray text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" />
              Piloti
            </h3>
            <div className="space-y-3">
              {bd.drivers.map((d) => (
                <div
                  key={d.driver_id}
                  className={`rounded-xl overflow-hidden border ${
                    d.is_captain
                      ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-transparent'
                      : d.is_bench_sub
                      ? 'border-purple-500/40 bg-gradient-to-r from-purple-500/10 to-transparent'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {/* Driver header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.is_captain && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                      {d.is_bench_sub && <Shield className="w-4 h-4 text-purple-400" />}
                      <span className="font-bold text-white text-sm">{d.driver_name || d.driver_id}</span>
                      {d.is_captain && (
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/15 px-1.5 py-0.5 rounded-full">CAPITANO x2</span>
                      )}
                      {d.is_bench_sub && (
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-400/15 px-1.5 py-0.5 rounded-full">PANCHINA</span>
                      )}
                    </div>
                    <span className={`font-black text-lg ${d.subtotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {d.subtotal > 0 ? '+' : ''}{d.subtotal}
                    </span>
                  </div>

                  {/* Score grid */}
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {/* Qualifica - always show */}
                      <ScoreChip
                        label="Qualifica"
                        value={d.qualifying_pts}
                        icon={<Zap className="w-3 h-3" />}
                        colorClass="text-sky-300"
                        bgClass="bg-sky-500/15"
                      />
                      {/* Gara - always show */}
                      <ScoreChip
                        label="Gara"
                        value={d.race_pts}
                        icon={<Flag className="w-3 h-3" />}
                        colorClass={d.race_pts >= 0 ? 'text-white' : 'text-red-400'}
                        bgClass={d.race_pts >= 0 ? 'bg-white/10' : 'bg-red-500/15'}
                      />
                      {/* Sprint */}
                      {d.sprint_pts !== 0 && (
                        <ScoreChip
                          label="Sprint"
                          value={d.sprint_pts}
                          icon={<Zap className="w-3 h-3" />}
                          colorClass="text-cyan-300"
                          bgClass="bg-cyan-500/15"
                        />
                      )}
                      {/* Giro veloce */}
                      {d.fastest_lap_pts !== 0 && (
                        <ScoreChip
                          label="Giro veloce"
                          value={d.fastest_lap_pts}
                          icon={<Zap className="w-3 h-3" />}
                          colorClass="text-purple-300"
                          bgClass="bg-purple-500/15"
                        />
                      )}
                      {/* Posizioni guadagnate */}
                      {(d.positions_gained_pts ?? 0) !== 0 && (
                        <ScoreChip
                          label="Pos. guadagnate"
                          value={d.positions_gained_pts ?? 0}
                          icon={<TrendingUp className="w-3 h-3" />}
                          colorClass="text-green-300"
                          bgClass="bg-green-500/15"
                        />
                      )}
                      {/* Penalità */}
                      {d.penalty_pts !== 0 && (
                        <ScoreChip
                          label="Penalità"
                          value={d.penalty_pts}
                          icon={<AlertTriangle className="w-3 h-3" />}
                          colorClass="text-red-400"
                          bgClass="bg-red-500/15"
                        />
                      )}
                    </div>

                    {/* Captain calculation explanation */}
                    {d.is_captain && d.captain_multiplier_applied && (
                      <div className="mt-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <p className="text-yellow-400/80 text-[10px] font-semibold">
                          Calcolo: ({d.subtotal / 2} punti base) × 2 = <span className="text-yellow-300 font-black">{d.subtotal}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Scuderia */}
          {bd.team_pts !== undefined && bd.team_pts !== 0 && (
            <div>
              <h3 className="text-f1-gray text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Scuderia
              </h3>
              <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-transparent px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{bd.team_name ?? 'Team'}</p>
                    <p className="text-blue-300/60 text-[10px] mt-0.5">Somma punti dei 2 piloti della scuderia (senza x2 capitano)</p>
                  </div>
                  <span className={`font-black text-lg ${(bd.team_pts ?? 0) >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                    {(bd.team_pts ?? 0) > 0 ? '+' : ''}{bd.team_pts}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Pronostici */}
          {bd.predictions_pts > 0 && (
            <div>
              <h3 className="text-f1-gray text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Pronostici
              </h3>
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-bold text-sm">Bonus pronostici corretti</p>
                  <span className="font-black text-lg text-emerald-300">+{bd.predictions_pts}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totale finale */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-f1-gray font-black uppercase tracking-widest text-xs">Totale GP</span>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-black text-2xl">{bd.total}</span>
                <span className="text-f1-gray text-xs font-bold">pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Helper chip component */
function ScoreChip({ label, value, icon, colorClass, bgClass }: {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
  bgClass: string
}) {
  return (
    <div className={`flex items-center justify-between ${bgClass} rounded-lg px-3 py-2`}>
      <div className={`flex items-center gap-1.5 ${colorClass}`}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <span className={`font-black text-sm ${colorClass}`}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  )
}
