'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  toggleSelectionsLock,
  resetGpStatus,
  setGpLock,
  setPermanentGpLock,
} from '@/app/actions/gp'
import { Lock, Unlock, RotateCcw, CheckCircle2, Circle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────
   LOCK TOGGLE — blocca / sblocca TUTTE le selezioni
   ────────────────────────────────────────────── */
interface LockToggleProps {
  leagueId: string
  initialLocked: boolean
}

export function AdminLockToggle({ leagueId, initialLocked }: LockToggleProps) {
  const [locked, setLocked] = useState(initialLocked)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const newLocked = !locked
    startTransition(async () => {
      const res = await toggleSelectionsLock(leagueId, newLocked)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setLocked(newLocked)
        toast.success(newLocked
          ? '🔒 Selezioni bloccate per tutti i giocatori'
          : '🔓 Selezioni riaperte'
        )
      }
    })
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-xl border transition-all duration-300',
      locked
        ? 'bg-red-500/10 border-red-500/40'
        : 'bg-green-500/10 border-green-500/40'
    )}>
      <div className="flex items-center gap-3">
        {locked
          ? <Lock className="w-5 h-5 text-red-400" />
          : <Unlock className="w-5 h-5 text-green-400" />
        }
        <div>
          <p className={cn('text-sm font-bold', locked ? 'text-red-300' : 'text-green-300')}>
            {locked ? 'Selezioni bloccate' : 'Selezioni aperte'}
          </p>
          <p className="text-xs text-f1-gray mt-0.5">
            {locked
              ? 'I giocatori non possono modificare capitano, panchina o pronostici'
              : 'I giocatori possono modificare capitano, panchina e pronostici'
            }
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={pending}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-50',
          locked
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-red-600 hover:bg-red-500 text-white'
        )}
      >
        {pending ? '...' : locked ? '🔓 Sblocca' : '🔒 Blocca'}
      </button>
    </div>
  )
}

/* ──────────────────────────────────────────────
   RESET GP STATUS — resetta un GP da "completato"
   ────────────────────────────────────────────── */
interface ResetGpButtonProps {
  leagueId: string
  gpId: string
  gpName: string
  currentStatus: string
  raceDate: string
}

export function ResetGpButton({ leagueId, gpId, gpName, currentStatus, raceDate }: ResetGpButtonProps) {
  const [pending, startTransition] = useTransition()

  const isFutureRace = new Date(raceDate) > new Date()
  if (currentStatus !== 'completed' || !isFutureRace) return null

  function handleReset() {
    startTransition(async () => {
      const res = await resetGpStatus(leagueId, gpId, 'upcoming')
      if (res?.error) toast.error(res.error)
      else toast.success(`✅ ${gpName} riportato a "In arrivo"`)
    })
  }

  return (
    <button
      onClick={handleReset}
      disabled={pending}
      title={`Resetta "${gpName}" — attualmente segnato come completato ma la gara è futura`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/25 transition-all duration-200 disabled:opacity-50"
    >
      <RotateCcw className="w-3 h-3" />
      {pending ? '...' : 'Resetta'}
    </button>
  )
}

/* ──────────────────────────────────────────────
   GP LOCK PANEL — blocco selettivo + permanente
   ────────────────────────────────────────────── */
export interface GpInfo {
  id: string
  name: string
  round: number
  date: string
}

interface GpLockPanelProps {
  leagueId: string
  allGps: GpInfo[]
  lockedGpIds: string[]
  permanentlyLockedGps: Record<string, { reason: 'completed' | 'cancelled' | 'postponed' }>
}

const REASON_LABELS: Record<string, string> = {
  completed: 'Già concluso',
  cancelled: 'Annullato',
  postponed: 'Rimandato',
}

export function GpLockPanel({
  leagueId,
  allGps,
  lockedGpIds: initialLockedIds,
  permanentlyLockedGps: initialPermanentLocks,
}: GpLockPanelProps) {
  /* ── Temporary per-GP lock state ── */
  const [mode, setMode] = useState<null | 'locking' | 'unlocking'>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set(initialLockedIds))
  const [pending, startTransition] = useTransition()

  /* ── Permanent lock state ── */
  const [permanentLocks, setPermanentLocks] = useState(initialPermanentLocks)
  const [permPending, startPermTransition] = useTransition()
  const [pendingPermGp, setPendingPermGp] = useState<string | null>(null)
  const [openReasonMenu, setOpenReasonMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenReasonMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Helpers ── */
  const gpsForMode = mode === 'locking'
    ? allGps.filter(gp => !lockedIds.has(gp.id) && !permanentLocks[gp.id])
    : mode === 'unlocking'
    ? allGps.filter(gp => lockedIds.has(gp.id))
    : []

  function toggleSelect(gpId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(gpId)) next.delete(gpId)
      else next.add(gpId)
      return next
    })
  }

  function handleCancel() {
    setMode(null)
    setSelectedIds(new Set())
  }

  function handleConfirm() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    const isLocking = mode === 'locking'
    startTransition(async () => {
      const res = await setGpLock(leagueId, ids, isLocking)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setLockedIds(prev => {
          const next = new Set(prev)
          ids.forEach(id => (isLocking ? next.add(id) : next.delete(id)))
          return next
        })
        toast.success(isLocking ? `🔒 ${ids.length} GP bloccati` : `🔓 ${ids.length} GP sbloccati`)
        setMode(null)
        setSelectedIds(new Set())
      }
    })
  }

  function handlePermanentLock(
    gpId: string,
    reason: 'completed' | 'cancelled' | 'postponed' | null
  ) {
    setPendingPermGp(gpId)
    setOpenReasonMenu(null)
    startPermTransition(async () => {
      const res = await setPermanentGpLock(leagueId, gpId, reason)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setPermanentLocks(prev => {
          const next = { ...prev }
          if (reason === null) delete next[gpId]
          else next[gpId] = { reason }
          return next
        })
        toast.success(reason ? '🔒 Blocco permanente applicato' : '🔓 Blocco permanente rimosso')
      }
      setPendingPermGp(null)
    })
  }

  const lockedCount = lockedIds.size

  return (
    <div className="space-y-4">

      {/* ── BLOCCO TEMPORANEO PER GP ──────────────────── */}
      <div className="rounded-xl border border-f1-gray-dark p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Blocco selettivo per GP</p>
            <p className="text-xs text-f1-gray mt-0.5">
              {lockedCount > 0
                ? `${lockedCount} GP ${lockedCount === 1 ? 'bloccato' : 'bloccati'}`
                : 'Nessun GP bloccato'}
            </p>
          </div>

          {mode === null && (
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('locking'); setSelectedIds(new Set()) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                Blocca
              </button>
              {lockedCount > 0 && (
                <button
                  onClick={() => { setMode('unlocking'); setSelectedIds(new Set()) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-bold transition-all"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Sblocca
                </button>
              )}
            </div>
          )}
        </div>

        {/* Idle: show currently locked GPs */}
        {mode === null && lockedCount > 0 && (
          <div className="space-y-1">
            {allGps.filter(gp => lockedIds.has(gp.id)).map(gp => (
              <div key={gp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-f1-red w-5 text-center">{gp.round}</span>
                <span className="text-xs text-white">{gp.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Selection mode */}
        {mode !== null && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-f1-gray-light">
              {mode === 'locking'
                ? 'Seleziona i GP da bloccare:'
                : 'Seleziona i GP da sbloccare:'}
            </p>

            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {gpsForMode.length === 0 ? (
                <p className="text-xs text-f1-gray text-center py-4">
                  {mode === 'locking'
                    ? 'Tutti i GP disponibili sono già bloccati'
                    : 'Nessun GP bloccato da sbloccare'}
                </p>
              ) : (
                gpsForMode.map(gp => {
                  const isSelected = selectedIds.has(gp.id)
                  return (
                    <button
                      key={gp.id}
                      onClick={() => toggleSelect(gp.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left',
                        isSelected
                          ? 'border-f1-red bg-f1-red/10'
                          : 'border-f1-gray-dark hover:border-f1-gray-mid bg-transparent'
                      )}
                    >
                      {isSelected
                        ? <CheckCircle2 className="w-4 h-4 text-f1-red flex-shrink-0" />
                        : <Circle className="w-4 h-4 text-f1-gray flex-shrink-0" />
                      }
                      <span className="text-xs font-black text-f1-red w-5 text-center flex-shrink-0">
                        {gp.round}
                      </span>
                      <span className="text-sm text-white truncate">{gp.name}</span>
                      <span className="text-xs text-f1-gray ml-auto flex-shrink-0 pl-2">
                        {new Date(gp.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Confirm / Cancel */}
            <div className="flex items-center justify-between pt-2 border-t border-f1-gray-dark">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 text-xs text-f1-gray hover:text-white transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Annulla
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0 || pending}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40',
                  mode === 'locking'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                )}
              >
                {pending
                  ? '...'
                  : mode === 'locking'
                  ? `🔒 Conferma (${selectedIds.size})`
                  : `🔓 Conferma (${selectedIds.size})`
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── BLOCCO PERMANENTE PER GP ──────────────────── */}
      <div className="rounded-xl border border-f1-gray-dark p-4 space-y-3" ref={menuRef}>
        <div>
          <p className="text-sm font-bold text-white">Blocco permanente GP</p>
          <p className="text-xs text-f1-gray mt-0.5">
            Blocca a tempo indeterminato: già concluso, annullato o rimandato
          </p>
        </div>

        <div className="space-y-1.5">
          {allGps.map(gp => {
            const pLock = permanentLocks[gp.id]
            const isThisPending = pendingPermGp === gp.id && permPending
            const isOpen = openReasonMenu === gp.id

            return (
              <div
                key={gp.id}
                className={cn(
                  'relative flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all',
                  pLock
                    ? 'border-orange-500/40 bg-orange-500/10'
                    : 'border-f1-gray-dark hover:border-f1-gray-mid'
                )}
              >
                {/* GP info */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-f1-red font-black text-xs w-5 text-center flex-shrink-0">
                    {gp.round}
                  </span>
                  <span className="text-sm text-white truncate">{gp.name}</span>
                  {pLock && (
                    <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold flex-shrink-0">
                      {REASON_LABELS[pLock.reason] ?? pLock.reason}
                    </span>
                  )}
                </div>

                {/* Action */}
                <div className="relative flex-shrink-0 ml-2">
                  {pLock ? (
                    <button
                      onClick={() => handlePermanentLock(gp.id, null)}
                      disabled={isThisPending}
                      className="text-xs px-2.5 py-1 rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                    >
                      {isThisPending ? '...' : 'Rimuovi'}
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setOpenReasonMenu(isOpen ? null : gp.id)}
                        disabled={isThisPending}
                        className="text-xs px-2.5 py-1 rounded-lg border border-f1-gray-dark hover:border-orange-500/60 text-f1-gray hover:text-orange-300 transition-all disabled:opacity-50"
                      >
                        {isThisPending ? '...' : '🔒 Blocca'}
                      </button>

                      {isOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-f1-gray-mid bg-[#1a1a1a] shadow-2xl z-20 overflow-hidden">
                          {(['completed', 'cancelled', 'postponed'] as const).map(reason => (
                            <button
                              key={reason}
                              onClick={() => handlePermanentLock(gp.id, reason)}
                              className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-f1-gray-dark transition-colors border-b border-f1-gray-dark last:border-0"
                            >
                              {REASON_LABELS[reason]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
