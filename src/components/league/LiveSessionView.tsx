'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startLiveSession, stopLiveSession, updateLiveQualifying, confirmLiveResults, getLiveSessionWithScores } from '@/app/actions/live-session'
import type { LiveQualifyingEntry, LiveSessionData } from '@/app/actions/live-session'
import { Trophy, Star, Radio, UserMinus, CheckCircle, Clock, RefreshCw, Play, Square, Send, ChevronDown, ChevronUp, Users, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

/* ── Types ── */
interface DriverStanding {
  driver_id: string
  driver_name: string
  short_name: string
  team_id: string | null
  team_name: string | null
  team_short_name: string | null
  team_color: string
  position: number
  qualifying_pts: number
  q1_time?: string
  q2_time?: string
  q3_time?: string
}

interface TeamStanding {
  team_id: string
  name: string
  short_name: string
  color: string
  total_pts: number
  drivers: string[]
}

interface PlayerScore {
  user_id: string
  display_name: string
  total_qualifying_pts: number
  driver_pts: number
  team_pts: number
  team_name?: string
  prediction_pts: number
  pole_correct: boolean
  pole_prediction?: string
  drivers: Array<{
    driver_id: string
    short_name: string
    position: number | null
    qualifying_pts: number
    is_captain: boolean
    is_bench: boolean
  }>
  has_selection: boolean
}

interface Props {
  leagueId: string
  gpId: string
  gpName: string
  gpRound?: number
  isAdmin: boolean
  currentUserId: string
  allDrivers: Array<{ id: string; name: string; short_name: string; team_id: string; team?: { name: string; short_name: string; color: string } }>
  initialSession: LiveSessionData | null
  initialPlayerScores: PlayerScore[]
  initialDriverStandings: DriverStanding[]
  initialTeamStandings: TeamStanding[]
}

export function LiveSessionView({
  leagueId, gpId, gpName, gpRound, isAdmin, currentUserId, allDrivers,
  initialSession, initialPlayerScores, initialDriverStandings, initialTeamStandings,
}: Props) {
  const [session, setSession] = useState(initialSession)
  const [playerScores, setPlayerScores] = useState(initialPlayerScores)
  const [driverStandings, setDriverStandings] = useState(initialDriverStandings)
  const [teamStandings, setTeamStandings] = useState(initialTeamStandings)
  const [pending, startTransition] = useTransition()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(session ? new Date(session.updated_at) : null)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'players' | 'drivers' | 'teams'>('players')

  // ── Admin state ──
  const [positions, setPositions] = useState<Array<{ driver_id: string; position: number }>>(() => {
    if (session?.qualifying_order) {
      return session.qualifying_order.map(e => ({ driver_id: e.driver_id, position: e.position }))
    }
    return []
  })
  const [editMode, setEditMode] = useState(false)

  // ── Auto-refresh every 20 seconds ──
  const refreshData = useCallback(async () => {
    try {
      const data = await getLiveSessionWithScores(leagueId, gpId)
      if (data.session) {
        setSession(data.session)
        setPlayerScores(data.playerScores as PlayerScore[])
        setDriverStandings(data.driverStandings as DriverStanding[])
        setTeamStandings(data.teamStandings as TeamStanding[])
        setLastUpdated(new Date(data.session.updated_at))
        if (!editMode && data.session.qualifying_order.length > 0) {
          setPositions(data.session.qualifying_order.map(e => ({ driver_id: e.driver_id, position: e.position })))
        }
      }
    } catch { /* ignore */ }
  }, [leagueId, gpId, editMode])

  useEffect(() => {
    if (!session?.is_active) return
    const timer = setInterval(refreshData, 20000)
    return () => clearInterval(timer)
  }, [session?.is_active, refreshData])

  // ── Supabase realtime on leagues table ──
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel(`live:${leagueId}:${gpId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'leagues',
        filter: `id=eq.${leagueId}`,
      }, () => {
        // Refresh when league settings change (someone updated live data)
        refreshData()
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [leagueId, gpId, refreshData])

  // ── Admin: start session ──
  function handleStart() {
    startTransition(async () => {
      const res = await startLiveSession(leagueId, gpId, 'qualifying')
      if (res?.error) toast.error(res.error)
      else {
        toast.success('Sessione live avviata!')
        refreshData()
      }
    })
  }

  // ── Admin: stop session ──
  function handleStop() {
    startTransition(async () => {
      const res = await stopLiveSession(leagueId, gpId)
      if (res?.error) toast.error(res.error)
      else {
        toast.success('Sessione live fermata')
        refreshData()
      }
    })
  }

  // ── Admin: save positions ──
  function handleSavePositions() {
    const entries: LiveQualifyingEntry[] = positions
      .filter(p => p.driver_id)
      .map(p => ({ driver_id: p.driver_id, position: p.position }))

    if (entries.length === 0) return toast.error('Inserisci almeno una posizione')

    startTransition(async () => {
      const res = await updateLiveQualifying(leagueId, gpId, entries)
      if (res?.error) toast.error(res.error)
      else {
        toast.success('Posizioni aggiornate!')
        setEditMode(false)
        refreshData()
      }
    })
  }

  // ── Admin: confirm results ──
  function handleConfirm() {
    if (!confirm('Confermare i risultati come definitivi? Verranno salvati nei risultati ufficiali del GP.')) return
    startTransition(async () => {
      const res = await confirmLiveResults(leagueId, gpId)
      if (res?.error) toast.error(res.error)
      else {
        toast.success('Risultati confermati e salvati nei risultati ufficiali!')
        refreshData()
      }
    })
  }

  // ── Admin: import from OpenF1 API ──
  const [apiLoading, setApiLoading] = useState(false)
  async function handleImportFromApi() {
    setApiLoading(true)
    try {
      const apiUrl = `/api/openf1?gpId=${gpId}${gpRound ? `&round=${gpRound}` : ''}`
      const res = await fetch(apiUrl)
      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Errore nel fetch da OpenF1')
        setApiLoading(false)
        return
      }

      if (!data.positions || data.positions.length === 0) {
        toast.error('Nessun dato di posizione disponibile dall\'API')
        setApiLoading(false)
        return
      }

      if (data.race) {
        toast(`Dati: ${data.race.name} (R${data.race.round})`, { icon: '🏎️', duration: 4000 })
      }

      // Map API positions to our format
      const mapped = data.positions
        .filter((p: { mapped: boolean }) => p.mapped)
        .map((p: { driver_id: string; position: number }) => ({
          driver_id: p.driver_id,
          position: p.position,
        }))

      if (mapped.length === 0) {
        toast.error('Nessun pilota mappato trovato')
        setApiLoading(false)
        return
      }

      setPositions(mapped)

      if (data.unmapped_count > 0) {
        const names = data.unmapped_drivers.map((u: { code: string; number: number }) => `${u.code}#${u.number}`).join(', ')
        toast(`${data.unmapped_count} piloti non mappati: ${names}`, { icon: '⚠️' })
      }

      // Auto-save to DB so results appear immediately
      const entries: LiveQualifyingEntry[] = mapped.map((p: { driver_id: string; position: number }) => ({
        driver_id: p.driver_id,
        position: p.position,
      }))

      const saveRes = await updateLiveQualifying(leagueId, gpId, entries)
      if (saveRes?.error) {
        toast.error(`Importati ma errore salvataggio: ${saveRes.error}`)
        setEditMode(true)
      } else {
        toast.success(`${mapped.length} posizioni importate e salvate! I punteggi sono visibili nei tab.`)
        setEditMode(false)
        refreshData()
      }
    } catch (e) {
      toast.error('Errore connessione API')
    }
    setApiLoading(false)
  }

  // ── Admin: add/update position ──
  function setDriverPosition(index: number, driverId: string) {
    setPositions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], driver_id: driverId }
      return next
    })
  }

  function addPosition() {
    setPositions(prev => [...prev, { driver_id: '', position: prev.length + 1 }])
  }

  const driverLookup = new Map(allDrivers.map(d => [d.id, d]))
  const isActive = session?.is_active ?? false
  const isFinal = session?.is_final ?? false
  const hasData = (session?.qualifying_order?.length ?? 0) > 0

  return (
    <div className="space-y-5">

      {/* ── LIVE BADGE + STATUS ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 animate-pulse">
              <Radio className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm font-black uppercase tracking-wider">Live</span>
            </div>
          )}
          {isFinal && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/50">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-bold">Risultati confermati</span>
            </div>
          )}
          {!session && !isActive && (
            <span className="text-f1-gray text-sm">Nessuna sessione live attiva</span>
          )}
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-f1-gray text-xs">
            <Clock className="w-3 h-3" />
            Ultimo agg: {lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>

      {/* ── ADMIN CONTROLS ── */}
      {isAdmin && (
        <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4 space-y-4">
          <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-2">
            <span>👑</span> Controlli Admin
          </p>

          {/* Start/Stop */}
          <div className="flex gap-2">
            {!isActive && !isFinal && (
              <button onClick={handleStart} disabled={pending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all disabled:opacity-40">
                <Play className="w-4 h-4" /> {pending ? '...' : 'Avvia sessione live'}
              </button>
            )}
            {isActive && (
              <button onClick={handleStop} disabled={pending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-40">
                <Square className="w-4 h-4" /> {pending ? '...' : 'Ferma sessione'}
              </button>
            )}
            {hasData && !isFinal && (
              <button onClick={handleConfirm} disabled={pending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all disabled:opacity-40">
                <CheckCircle className="w-4 h-4" /> {pending ? '...' : 'Conferma risultati'}
              </button>
            )}
            <button onClick={() => refreshData()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-f1-gray-mid hover:border-white/30 text-f1-gray hover:text-white text-sm transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Aggiorna
            </button>
            {(isActive || (!isFinal && !isActive)) && (
              <button onClick={handleImportFromApi} disabled={apiLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 hover:border-cyan-400/60 bg-cyan-500/10 text-cyan-300 hover:text-cyan-200 text-sm font-semibold transition-all disabled:opacity-40">
                {apiLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Flag className="w-3.5 h-3.5" />
                )}
                {apiLoading ? 'Caricamento...' : 'Importa da API'}
              </button>
            )}
          </div>

          {/* Position entry form */}
          {(isActive || (!isFinal && hasData)) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-f1-gray-light font-semibold">Posizioni qualifica</p>
                <button onClick={() => setEditMode(!editMode)}
                  className="text-xs text-yellow-300 hover:text-yellow-200 font-semibold">
                  {editMode ? 'Annulla' : 'Modifica posizioni'}
                </button>
              </div>

              {editMode && (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {positions.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-f1-red font-black text-xs w-8 text-center">P{p.position}</span>
                      <select
                        value={p.driver_id}
                        onChange={(e) => setDriverPosition(i, e.target.value)}
                        className="flex-1 bg-f1-gray-dark border border-f1-gray-mid rounded px-2 py-1.5 text-white text-xs focus:ring-1 focus:ring-f1-red focus:outline-none"
                      >
                        <option value="">— Scegli —</option>
                        {allDrivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.short_name} — {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button onClick={addPosition}
                      className="text-xs text-f1-gray hover:text-white border border-f1-gray-dark hover:border-f1-gray-mid rounded px-3 py-1.5 transition-all">
                      + Aggiungi posizione
                    </button>
                    <button onClick={handleSavePositions} disabled={pending}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-f1-red hover:bg-red-600 text-white text-xs font-bold transition-all disabled:opacity-40">
                      <Send className="w-3 h-3" /> {pending ? '...' : 'Salva'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── No data message ── */}
      {!hasData && isActive && (
        <div className="text-center py-8 space-y-3 bg-f1-gray-dark/30 rounded-xl border border-f1-gray-dark">
          <p className="text-f1-gray text-sm">Nessun dato di qualifica inserito ancora.</p>
          {isAdmin && (
            <p className="text-f1-gray-light text-xs">
              Usa <span className="text-cyan-300 font-bold">Importa da API</span> per caricare i risultati automaticamente,
              oppure <span className="text-yellow-300 font-bold">Modifica posizioni</span> per inserirli manualmente.
            </p>
          )}
        </div>
      )}

      {/* ── TAB NAVIGATION ── */}
      {hasData && (
        <div className="flex gap-1 bg-f1-gray-dark/50 rounded-lg p-1">
          {[
            { key: 'players' as const, label: 'Classifica Giocatori', icon: Users },
            { key: 'drivers' as const, label: 'Classifica Piloti', icon: Flag },
            { key: 'teams' as const, label: 'Classifica Scuderie', icon: Trophy },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all',
                activeTab === key
                  ? 'bg-f1-red text-white shadow-lg'
                  : 'text-f1-gray hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── PLAYER SCORES ── */}
      {hasData && activeTab === 'players' && (
        <div className="space-y-2">
          {playerScores.map((ps, i) => {
            const isMe = ps.user_id === currentUserId
            const isExpanded = expandedPlayer === ps.user_id

            return (
              <div key={ps.user_id} className={cn(
                'rounded-xl border overflow-hidden transition-all',
                isMe
                  ? 'border-f1-red/50 bg-f1-red/10 shadow-[0_0_15px_rgba(232,0,45,0.15)]'
                  : 'border-f1-gray-dark bg-white/3 hover:border-f1-gray-mid'
              )}>
                <button
                  onClick={() => setExpandedPlayer(isExpanded ? null : ps.user_id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black w-8 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-f1-gray text-lg">{i + 1}</span>}
                    </span>
                    <div>
                      <p className="text-white font-bold text-sm">
                        {ps.display_name}
                        {isMe && <span className="text-f1-red text-xs ml-1.5 font-bold">YOU</span>}
                        {!ps.has_selection && <span className="text-red-400 text-[10px] ml-1.5">⚠ no sel</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ps.driver_pts > 0 && (
                          <span className="text-[10px] text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded font-semibold">
                            {ps.driver_pts} piloti
                          </span>
                        )}
                        {ps.team_pts > 0 && (
                          <span className="text-[10px] text-purple-300 bg-purple-500/15 px-1.5 py-0.5 rounded font-semibold">
                            {ps.team_pts} {ps.team_name}
                          </span>
                        )}
                        {ps.prediction_pts > 0 && (
                          <span className="text-[10px] text-green-300 bg-green-500/15 px-1.5 py-0.5 rounded font-semibold">
                            +{ps.prediction_pts} pred
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-f1-red/80 rounded-lg px-3 py-1.5 min-w-[56px] text-center">
                      <p className="text-white font-black text-lg">{ps.total_qualifying_pts}</p>
                      <p className="text-[9px] text-white/60 uppercase font-bold">pts</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-f1-gray" /> : <ChevronDown className="w-4 h-4 text-f1-gray" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5 border-t border-white/10 pt-2">
                    {ps.drivers.map(d => (
                      <div key={d.driver_id} className={cn(
                        'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs',
                        d.is_bench
                          ? 'bg-orange-500/10 border border-orange-500/20 opacity-60'
                          : d.is_captain
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-white/5 border border-white/10'
                      )}>
                        <div className="flex items-center gap-2">
                          {d.is_captain && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                          {d.is_bench && <UserMinus className="w-3 h-3 text-orange-400" />}
                          <span className="font-bold text-white">{d.short_name}</span>
                          {d.position && (
                            <span className="text-f1-gray">P{d.position}</span>
                          )}
                          {d.is_captain && <span className="text-yellow-400 text-[10px]">×2</span>}
                          {d.is_bench && <span className="text-orange-400 text-[10px]">PANCHINA</span>}
                        </div>
                        <span className={cn('font-bold', d.qualifying_pts > 0 ? 'text-green-400' : 'text-f1-gray')}>
                          {d.qualifying_pts > 0 ? `+${d.qualifying_pts}` : '0'}
                        </span>
                      </div>
                    ))}
                    {ps.team_pts > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-purple-500/10 border border-purple-500/20">
                        <span className="font-bold text-purple-300">🏎 {ps.team_name}</span>
                        <span className="text-purple-300 font-bold">+{ps.team_pts}</span>
                      </div>
                    )}
                    {ps.pole_prediction && (
                      <div className={cn(
                        'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs',
                        ps.pole_correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/3 border border-white/10'
                      )}>
                        <span className="text-f1-gray-light">Scommessa Pole: <span className="text-white font-bold">{driverLookup.get(ps.pole_prediction)?.short_name ?? ps.pole_prediction}</span></span>
                        {ps.pole_correct ? <span className="text-green-400 font-bold">✓ +5</span> : <span className="text-f1-gray">✗</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── DRIVER STANDINGS ── */}
      {hasData && activeTab === 'drivers' && (
        <div className="space-y-1">
          {driverStandings.map((ds, i) => (
            <div key={ds.driver_id} className={cn(
              'flex items-center justify-between p-2.5 rounded-lg border transition-all',
              i === 0 ? 'border-yellow-500/40 bg-yellow-500/10' :
              i === 1 ? 'border-gray-400/30 bg-gray-400/5' :
              i === 2 ? 'border-amber-500/30 bg-amber-500/5' :
              'border-f1-gray-dark bg-white/3'
            )}>
              <div className="flex items-center gap-3">
                <span className="text-f1-red font-black text-sm w-8 text-center">P{ds.position}</span>
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: ds.team_color }} />
                <div>
                  <p className="text-white font-bold text-sm">{ds.short_name}</p>
                  <p className="text-f1-gray text-[10px]">{ds.team_short_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {ds.q3_time && <span className="text-xs text-f1-gray font-mono">{ds.q3_time}</span>}
                <span className={cn(
                  'font-black text-sm min-w-[32px] text-right',
                  ds.qualifying_pts > 0 ? 'text-green-400' : 'text-f1-gray'
                )}>
                  {ds.qualifying_pts > 0 ? `+${ds.qualifying_pts}` : '0'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TEAM STANDINGS ── */}
      {hasData && activeTab === 'teams' && (
        <div className="space-y-2">
          {teamStandings.map((ts, i) => (
            <div key={ts.team_id} className={cn(
              'flex items-center justify-between p-3 rounded-xl border transition-all',
              i === 0 ? 'border-yellow-500/40 bg-yellow-500/10' :
              i === 1 ? 'border-gray-400/30 bg-gray-400/5' :
              i === 2 ? 'border-amber-500/30 bg-amber-500/5' :
              'border-f1-gray-dark bg-white/3'
            )}>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-f1-gray text-sm">{i + 1}</span>}
                </span>
                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: ts.color }} />
                <div>
                  <p className="text-white font-bold text-sm">{ts.name}</p>
                  <p className="text-f1-gray text-xs">{ts.drivers.join(' · ')}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-1.5 min-w-[56px] text-center">
                <p className="text-white font-black text-lg">{ts.total_pts}</p>
                <p className="text-[9px] text-white/50 uppercase font-bold">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!hasData && (
        <div className="text-center py-12">
          <Radio className="w-12 h-12 text-f1-gray mx-auto mb-3" />
          <p className="text-f1-gray text-sm">
            {isAdmin
              ? 'Avvia una sessione live e inserisci le posizioni di qualifica man mano che escono.'
              : 'Nessuna sessione live al momento. L\'admin deve avviarla durante la qualifica.'}
          </p>
        </div>
      )}
    </div>
  )
}
