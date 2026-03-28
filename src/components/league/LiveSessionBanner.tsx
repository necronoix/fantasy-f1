'use client'

import Link from 'next/link'
import { Radio, CheckCircle } from 'lucide-react'

interface LiveSessionInfo {
  is_active: boolean
  is_final: boolean
}

interface Props {
  leagueId: string
  gpId: string
  gpName: string
  gpRound?: number
  session: LiveSessionInfo | null
  isAdmin: boolean
  /** Compact mode for use inside cards/grids */
  compact?: boolean
}

export function LiveSessionBanner({ leagueId, gpId, gpName, gpRound, session, isAdmin, compact }: Props) {
  const hasSession = session !== null

  // Only show if there's a session OR user is admin
  if (!hasSession && !isAdmin) return null

  if (compact) {
    return (
      <Link href={`/league/${leagueId}/gp/${gpId}/live`} className="block">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-[1.02] ${
          session?.is_active
            ? 'bg-red-500/15 border border-red-500/40'
            : session?.is_final
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-white/5 border border-white/10 hover:border-f1-red/40'
        }`}>
          {session?.is_active && (
            <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
              <Radio className="w-3.5 h-3.5 text-red-500 relative z-10" />
            </div>
          )}
          {!session?.is_active && session?.is_final && (
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          )}
          {!hasSession && isAdmin && (
            <Radio className="w-3.5 h-3.5 text-f1-gray flex-shrink-0" />
          )}
          <span className={`text-xs font-bold truncate ${
            session?.is_active ? 'text-red-400' : session?.is_final ? 'text-green-400' : 'text-f1-gray'
          }`}>
            {session?.is_active ? 'LIVE' : session?.is_final ? 'Risultati' : 'Live'}
          </span>
          <span className="text-f1-gray text-[10px] ml-auto">→</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/league/${leagueId}/gp/${gpId}/live`}>
      <div className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:scale-[1.01] ${
        session?.is_active
          ? 'border-red-500/50 bg-gradient-to-r from-red-500/10 to-red-900/10'
          : session?.is_final
            ? 'border-green-500/30 bg-gradient-to-r from-green-500/5 to-green-900/5'
            : 'border-f1-gray-dark bg-f1-gray-dark/20 hover:border-f1-gray-mid'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session?.is_active && (
              <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <Radio className="w-5 h-5 text-red-500 relative z-10" />
              </div>
            )}
            {!session?.is_active && session?.is_final && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {!hasSession && isAdmin && (
              <Radio className="w-5 h-5 text-f1-gray" />
            )}
            <div>
              <p className="text-white font-bold text-sm">
                {session?.is_active ? 'Sessione LIVE in corso' :
                 session?.is_final ? 'Risultati live confermati' :
                 session ? 'Sessione live (in pausa)' :
                 'Avvia sessione LIVE'}
              </p>
              <p className="text-f1-gray text-xs">
                {gpRound ? `R${gpRound} · ` : ''}{gpName} — {
                  session?.is_active ? 'Classifica parziale qualifiche in tempo reale' :
                  session?.is_final ? 'Visualizza i punteggi delle qualifiche' :
                  isAdmin ? 'Inserisci risultati qualifica in tempo reale' :
                  'Visualizza i punteggi live'
                }
              </p>
            </div>
          </div>
          <span className="text-f1-gray text-xs">→</span>
        </div>
      </div>
    </Link>
  )
}
