'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { setGpDeadline, adminSetSelection } from '@/app/actions/gp'
import { Clock, Users, Star, UserMinus, Target, CheckCircle, XCircle, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

/* ── Types ── */
interface PlayerStatus {
  user_id: string
  display_name: string
  has_captain: boolean
  captain_driver_id: string | null
  has_bench: boolean
  bench_driver_id: string | null
  has_predictions: boolean
  predictions: Record<string, unknown>
  drivers: Array<{ driver_id: string; name: string; short_name: string }>
}

interface GpDeadlineInfo {
  id: string
  name: string
  round: number
  date: string
  deadline: string | null
}

/* ══════════════════════════════════════════════════
   DEADLINE PICKER — admin sets deadline per GP
   ══════════════════════════════════════════════════ */
interface DeadlinePickerProps {
  leagueId: string
  gps: GpDeadlineInfo[]
}

export function DeadlinePicker({ leagueId, gps }: DeadlinePickerProps) {
  const [selectedGp, setSelectedGp] = useState<string>('')
  const [dateVal, setDateVal] = useState('')
  const [timeVal, setTimeVal] = useState('')
  const [pending, startTransition] = useTransition()

  // Pre-fill when selecting a GP that already has a deadline
  useEffect(() => {
    if (!selectedGp) return
    const gp = gps.find(g => g.id === selectedGp)
    if (gp?.deadline) {
      const d = new Date(gp.deadline)
      setDateVal(d.toISOString().slice(0, 10))
      setTimeVal(d.toTimeString().slice(0, 5))
    } else {
      setDateVal('')
      setTimeVal('')
    }
  }, [selectedGp, gps])

  function handleSet() {
    if (!selectedGp || !dateVal || !timeVal) return toast.error('Seleziona GP, data e orario')
    const deadline = new Date(`${dateVal}T${timeVal}:00`).toISOString()
    startTransition(async () => {
      const res = await setGpDeadline(leagueId, selectedGp, deadline)
      if (res?.error) toast.error(res.error)
      else toast.success('⏰ Scadenza impostata!')
    })
  }

  function handleRemove() {
    if (!selectedGp) return
    startTransition(async () => {
      const res = await setGpDeadline(leagueId, selectedGp, null)
      if (res?.error) toast.error(res.error)
      else {
        toast.success('Scadenza rimossa')
        setDateVal('')
        setTimeVal('')
      }
    })
  }

  const selectedGpInfo = gps.find(g => g.id === selectedGp)

  return (
    <div className="space-y-4">
      {/* GP selector */}
      <select
        value={selectedGp}
        onChange={(e) => setSelectedGp(e.target.value)}
        className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
      >
        <option value="">— Seleziona GP —</option>
        {gps.map(gp => (
          <option key={gp.id} value={gp.id}>
            R{gp.round} — {gp.name} {gp.deadline ? '⏰' : ''}
          </option>
        ))}
      </select>

      {selectedGp && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider mb-1.5 block">
                Data scadenza
              </label>
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider mb-1.5 block">
                Orario scadenza
              </label>
              <input
                type="time"
                value={timeVal}
                onChange={(e) => setTimeVal(e.target.value)}
                className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
              />
            </div>
          </div>

          {selectedGpInfo?.deadline && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-xs text-yellow-300">
                Scadenza attuale: {new Date(selectedGpInfo.deadline).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSet}
              disabled={pending || !dateVal || !timeVal}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-f1-red hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-40"
            >
              <Calendar className="w-4 h-4" />
              {pending ? '...' : 'Imposta scadenza'}
            </button>
            {selectedGpInfo?.deadline && (
              <button
                onClick={handleRemove}
                disabled={pending}
                className="px-4 py-2.5 rounded-lg border border-f1-gray-mid hover:border-red-500/50 text-f1-gray hover:text-red-400 text-sm font-bold transition-all disabled:opacity-40"
              >
                {pending ? '...' : 'Rimuovi'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Show all active deadlines */}
      {gps.some(gp => gp.deadline) && (
        <div className="space-y-1.5 pt-3 border-t border-f1-gray-dark">
          <p className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider mb-2">Scadenze attive</p>
          {gps.filter(gp => gp.deadline).map(gp => {
            const isPast = new Date(gp.deadline!) < new Date()
            return (
              <div key={gp.id} className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border',
                isPast
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-yellow-500/30 bg-yellow-500/10'
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-f1-red font-black text-xs w-5">{gp.round}</span>
                  <span className="text-white text-xs font-semibold">{gp.name}</span>
                </div>
                <span className={cn('text-xs font-semibold', isPast ? 'text-red-400' : 'text-yellow-300')}>
                  {isPast ? '⛔ Scaduto' : ''} {new Date(gp.deadline!).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PLAYER SELECTION STATUS — shows who set what
   ══════════════════════════════════════════════════ */
interface PlayerSelectionStatusProps {
  leagueId: string
  gpId: string
  gpName: string
  players: PlayerStatus[]
  allDrivers: Array<{ id: string; name: string; short_name: string }>
}

export function PlayerSelectionStatus({ leagueId, gpId, gpName, players, allDrivers }: PlayerSelectionStatusProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {players.map(player => {
        const isExpanded = expandedPlayer === player.user_id
        const allSet = player.has_captain && player.has_bench && player.has_predictions
        const nothingSet = !player.has_captain && !player.has_bench && !player.has_predictions

        return (
          <div key={player.user_id} className="rounded-lg border border-f1-gray-dark overflow-hidden">
            {/* Summary row */}
            <button
              onClick={() => setExpandedPlayer(isExpanded ? null : player.user_id)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-all text-left"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-white text-sm font-bold truncate">{player.display_name}</span>
                <div className="flex items-center gap-1.5">
                  {/* Captain status */}
                  <span title="Capitano" className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                    player.has_captain ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    <Star className="w-3.5 h-3.5" />
                  </span>
                  {/* Bench status */}
                  <span title="Panchina" className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                    player.has_bench ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    <UserMinus className="w-3.5 h-3.5" />
                  </span>
                  {/* Predictions status */}
                  <span title="Scommesse" className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                    player.has_predictions ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    <Target className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {allSet && (
                  <span className="text-xs text-green-400 font-bold px-2 py-0.5 rounded bg-green-500/15 border border-green-500/30">
                    Completo
                  </span>
                )}
                {nothingSet && (
                  <span className="text-xs text-red-400 font-bold px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Manca tutto
                  </span>
                )}
                {!allSet && !nothingSet && (
                  <span className="text-xs text-yellow-400 font-bold px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30">
                    Parziale
                  </span>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-f1-gray" /> : <ChevronDown className="w-4 h-4 text-f1-gray" />}
              </div>
            </button>

            {/* Expanded: detail + admin edit */}
            {isExpanded && (
              <AdminSetSelectionPanel
                leagueId={leagueId}
                gpId={gpId}
                player={player}
                allDrivers={allDrivers}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Admin quick-set panel for a single player ── */
interface AdminSetSelectionPanelProps {
  leagueId: string
  gpId: string
  player: PlayerStatus
  allDrivers: Array<{ id: string; name: string; short_name: string }>
}

function AdminSetSelectionPanel({ leagueId, gpId, player, allDrivers }: AdminSetSelectionPanelProps) {
  const [captain, setCaptain] = useState(player.captain_driver_id ?? '')
  const [bench, setBench] = useState(player.bench_driver_id ?? '')
  const [pole, setPole] = useState(String(player.predictions.pole_driver_id ?? ''))
  const [winner, setWinner] = useState(String(player.predictions.winner_driver_id ?? ''))
  const [fastestLap, setFastestLap] = useState(String(player.predictions.fastest_lap_driver_id ?? ''))
  const [safetyCar, setSafetyCar] = useState(Boolean(player.predictions.safety_car))
  const [pending, startTransition] = useTransition()

  const rosterDrivers = player.drivers

  function handleSave() {
    if (!captain) return toast.error('Scegli un capitano!')
    if (captain === bench) return toast.error('Capitano e panchina non possono coincidere!')

    startTransition(async () => {
      const res = await adminSetSelection(leagueId, gpId, player.user_id, captain, {
        pole_driver_id: pole || undefined,
        winner_driver_id: winner || undefined,
        fastest_lap_driver_id: fastestLap || undefined,
        safety_car: safetyCar,
      }, bench || undefined)
      if (res?.error) toast.error(res.error)
      else toast.success(`Selezione impostata per ${player.display_name}`)
    })
  }

  const driverLabel = (driverId: string) => {
    const d = rosterDrivers.find(d => d.driver_id === driverId)
    return d ? d.short_name : driverId
  }

  return (
    <div className="px-3 pb-3 space-y-3 border-t border-f1-gray-dark">
      {/* Current status */}
      <div className="grid grid-cols-3 gap-2 pt-3">
        <div className={cn('p-2 rounded-lg text-center text-xs', player.has_captain ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30')}>
          <Star className="w-3.5 h-3.5 mx-auto mb-1 text-yellow-400" />
          <p className="font-bold text-white">{player.captain_driver_id ? driverLabel(player.captain_driver_id) : '—'}</p>
          <p className="text-f1-gray text-[10px]">Capitano</p>
        </div>
        <div className={cn('p-2 rounded-lg text-center text-xs', player.has_bench ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30')}>
          <UserMinus className="w-3.5 h-3.5 mx-auto mb-1 text-orange-400" />
          <p className="font-bold text-white">{player.bench_driver_id ? driverLabel(player.bench_driver_id) : '—'}</p>
          <p className="text-f1-gray text-[10px]">Panchina</p>
        </div>
        <div className={cn('p-2 rounded-lg text-center text-xs', player.has_predictions ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30')}>
          <Target className="w-3.5 h-3.5 mx-auto mb-1 text-f1-red" />
          <p className="font-bold text-white">{player.has_predictions ? 'Sì' : '—'}</p>
          <p className="text-f1-gray text-[10px]">Scommesse</p>
        </div>
      </div>

      {/* Admin quick-set form */}
      <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-3 space-y-3">
        <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>👑</span> Imposta per {player.display_name}
        </p>

        {/* Captain from roster */}
        <div>
          <label className="text-xs text-f1-gray-light font-semibold mb-1 block">Capitano (dal suo roster)</label>
          <select
            value={captain}
            onChange={(e) => setCaptain(e.target.value)}
            className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-f1-red focus:outline-none"
          >
            <option value="">— Scegli —</option>
            {rosterDrivers.map(d => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.short_name} — {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bench from roster */}
        {rosterDrivers.length >= 4 && (
          <div>
            <label className="text-xs text-f1-gray-light font-semibold mb-1 block">Panchina</label>
            <select
              value={bench}
              onChange={(e) => setBench(e.target.value)}
              className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-f1-red focus:outline-none"
            >
              <option value="">— Nessuno —</option>
              {rosterDrivers.filter(d => d.driver_id !== captain).map(d => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.short_name} — {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Predictions */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-f1-gray font-semibold mb-0.5 block">Pole</label>
            <select value={pole} onChange={(e) => setPole(e.target.value)}
              className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded px-2 py-1.5 text-white text-xs focus:ring-1 focus:ring-f1-red focus:outline-none">
              <option value="">—</option>
              {allDrivers.map(d => <option key={d.id} value={d.id}>{d.short_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-f1-gray font-semibold mb-0.5 block">Vincitore</label>
            <select value={winner} onChange={(e) => setWinner(e.target.value)}
              className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded px-2 py-1.5 text-white text-xs focus:ring-1 focus:ring-f1-red focus:outline-none">
              <option value="">—</option>
              {allDrivers.map(d => <option key={d.id} value={d.id}>{d.short_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-f1-gray font-semibold mb-0.5 block">Giro veloce</label>
            <select value={fastestLap} onChange={(e) => setFastestLap(e.target.value)}
              className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded px-2 py-1.5 text-white text-xs focus:ring-1 focus:ring-f1-red focus:outline-none">
              <option value="">—</option>
              {allDrivers.map(d => <option key={d.id} value={d.id}>{d.short_name}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={safetyCar} onChange={(e) => setSafetyCar(e.target.checked)}
                className="w-4 h-4 accent-f1-red rounded" />
              <span className="text-xs text-f1-gray-light font-semibold">Safety Car</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={pending || !captain}
          className="w-full py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold transition-all disabled:opacity-40"
        >
          {pending ? '...' : `Salva per ${player.display_name}`}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   LIVE COUNTDOWN — for GP page
   ══════════════════════════════════════════════════ */
interface LiveCountdownProps {
  deadline: string
}

export function LiveCountdown({ deadline }: LiveCountdownProps) {
  const calcTimeLeft = useCallback(() => {
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return null
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, minutes, seconds, total: diff }
  }, [deadline])

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft)

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calcTimeLeft()
      setTimeLeft(tl)
      if (!tl) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [calcTimeLeft])

  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/40">
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-red-300 text-sm font-bold">Tempo scaduto!</p>
          <p className="text-red-400/70 text-xs">Le selezioni sono bloccate</p>
        </div>
      </div>
    )
  }

  const isUrgent = timeLeft.total < 1000 * 60 * 60 // < 1 hour
  const isWarning = timeLeft.total < 1000 * 60 * 60 * 3 // < 3 hours

  return (
    <div className={cn(
      'p-4 rounded-xl border backdrop-blur-sm',
      isUrgent
        ? 'bg-red-500/15 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse'
        : isWarning
        ? 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
        : 'bg-f1-gray-dark/50 border-f1-gray-mid'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className={cn('w-4 h-4', isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-f1-gray-light')} />
        <span className={cn('text-xs font-bold uppercase tracking-wider', isUrgent ? 'text-red-300' : isWarning ? 'text-yellow-300' : 'text-f1-gray-light')}>
          Tempo rimasto per le selezioni
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { val: timeLeft.days, label: 'Giorni' },
          { val: timeLeft.hours, label: 'Ore' },
          { val: timeLeft.minutes, label: 'Min' },
          { val: timeLeft.seconds, label: 'Sec' },
        ].map(({ val, label }) => (
          <div key={label} className={cn(
            'rounded-lg py-2 px-1',
            isUrgent ? 'bg-red-500/20' : isWarning ? 'bg-yellow-500/10' : 'bg-white/5'
          )}>
            <p className={cn(
              'text-2xl font-black tabular-nums',
              isUrgent ? 'text-red-300' : isWarning ? 'text-yellow-300' : 'text-white'
            )}>
              {String(val).padStart(2, '0')}
            </p>
            <p className="text-[10px] text-f1-gray uppercase tracking-wider font-bold">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-f1-gray text-xs mt-2">
        Scadenza: {new Date(deadline).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
