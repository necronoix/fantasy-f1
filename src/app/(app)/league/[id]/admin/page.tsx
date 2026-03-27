import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Settings, Lock, Clock, Users } from 'lucide-react'
import { AdminLockToggle, ResetGpButton, GpLockPanel } from '@/components/league/AdminControls'
import type { GpInfo } from '@/components/league/AdminControls'
import { DeadlinePicker, PlayerSelectionStatus } from '@/components/league/AdminGpManager'
import { getPlayersSelectionStatus } from '@/app/actions/gp'

interface Props { params: Promise<{ id: string }> }

export default async function AdminPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: myMembership } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || (myMembership as Record<string, unknown>).role !== 'admin') {
    redirect(`/league/${id}`)
  }

  // All GPs
  const { data: allGps } = await admin
    .from('grands_prix')
    .select('*')
    .eq('season_id', 2026)
    .order('round', { ascending: true })

  // GP results already submitted
  const { data: submittedResults } = await admin
    .from('gp_results')
    .select('gp_id')
    .eq('league_id', id)
  const submittedIds = new Set((submittedResults ?? []).map(r => String((r as Record<string, unknown>).gp_id)))

  // Current league settings (for selections_locked)
  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', id)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  const selectionsLocked = settings.selections_locked === true
  const lockedGpIds: string[] = (settings.locked_gp_ids as string[]) ?? []
  const permanentlyLockedGps = (settings.permanently_locked_gps as Record<string, { reason: 'completed' | 'cancelled' | 'postponed' }>) ?? {}

  const gpInfoList: GpInfo[] = (allGps ?? []).map(gp => ({
    id: String(gp.id),
    name: String(gp.name),
    round: Number(gp.round),
    date: String(gp.date),
  }))

  // GP deadlines
  const gpDeadlines = (settings.gp_deadlines as Record<string, string>) ?? {}
  const gpDeadlineList = gpInfoList.map(gp => ({
    ...gp,
    deadline: gpDeadlines[gp.id] ?? null,
  }))

  // Find next upcoming GP for player status
  const now = new Date()
  const nextGp = (allGps ?? []).find(gp => new Date(String(gp.date)) >= now && String(gp.status) !== 'completed')
  const nextGpId = nextGp ? String(nextGp.id) : null
  const nextGpName = nextGp ? String(nextGp.name) : null

  // Get player selection status for next GP
  let playerStatuses: Awaited<ReturnType<typeof getPlayersSelectionStatus>> = []
  if (nextGpId) {
    playerStatuses = await getPlayersSelectionStatus(id, nextGpId)
  }

  // Get all drivers for admin edit
  const { data: allDriversForAdmin } = await admin
    .from('drivers')
    .select('id, name, short_name')
    .eq('season_id', 2026)
    .eq('active', true)
    .order('name')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-f1-red" />
        <div>
          <h1 className="text-2xl font-black">Pannello Admin</h1>
          <p className="text-f1-gray text-sm">Gestisci risultati e configurazioni</p>
        </div>
      </div>

      <LeagueNav leagueId={id} isAdmin={true} />

      {/* ── LOCK SELEZIONI ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-f1-red" />
            Gestione Selezioni
          </CardTitle>
          <Badge variant="red">Admin</Badge>
        </CardHeader>
        <p className="text-f1-gray text-xs mb-3">
          Blocca le modifiche a capitano, panchina e pronostici per tutti i giocatori della lega.
          Usa questa opzione prima delle qualifiche se vuoi impedire cambi last-minute.
        </p>
        <AdminLockToggle leagueId={id} initialLocked={selectionsLocked} />
      </Card>

      {/* ── LOCK PER GP ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-f1-red" />
            Blocco GP
          </CardTitle>
          <Badge variant="red">Admin</Badge>
        </CardHeader>
        <p className="text-f1-gray text-xs mb-3">
          Blocca le selezioni per singoli GP — usa «Blocca» per selezionare i GP con le palline, poi «Conferma».
          Il blocco permanente serve per GP già conclusi, annullati o rimandati.
        </p>
        <GpLockPanel
          leagueId={id}
          allGps={gpInfoList}
          lockedGpIds={lockedGpIds}
          permanentlyLockedGps={permanentlyLockedGps}
        />
      </Card>

      {/* ── SCADENZE GP ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Scadenze Selezioni
          </CardTitle>
          <Badge variant="red">Admin</Badge>
        </CardHeader>
        <p className="text-f1-gray text-xs mb-3">
          Imposta una data e un orario entro cui i giocatori devono salvare capitano, panchina e scommesse.
          Un countdown LIVE apparirà nella pagina del GP.
        </p>
        <DeadlinePicker leagueId={id} gps={gpDeadlineList} />
      </Card>

      {/* ── STATO SELEZIONI GIOCATORI ─────────────── */}
      {nextGpId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Stato Selezioni — {nextGpName}
            </CardTitle>
            <Badge variant="red">Admin</Badge>
          </CardHeader>
          <p className="text-f1-gray text-xs mb-3">
            Verifica chi ha impostato capitano, panchina e scommesse per il prossimo GP.
            Espandi un giocatore per impostare la formazione al suo posto.
          </p>
          <div className="flex items-center gap-4 mb-3 text-[10px] text-f1-gray uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500/30 inline-block" /> Impostato</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500/30 inline-block" /> Mancante</span>
          </div>
          <PlayerSelectionStatus
            leagueId={id}
            gpId={nextGpId}
            gpName={nextGpName ?? ''}
            players={playerStatuses as any}
            allDrivers={(allDriversForAdmin ?? []) as any}
          />
        </Card>
      )}

      {/* ── RISULTATI GP ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Risultati GP</CardTitle>
          <Badge variant="red">Admin</Badge>
        </CardHeader>
        <p className="text-f1-gray text-xs mb-3">
          Clicca su un GP per inserire/aggiornare i risultati e calcolare i punteggi.
          I GP con ⚠️ sono segnati come "completati" ma la gara è ancora futura — usa "Resetta" per sbloccarli.
        </p>
        <div className="space-y-1.5">
          {(allGps ?? []).map((gp) => {
            const hasResult = submittedIds.has(String(gp.id))
            const gpStatus = String(gp.status)
            const raceDate = String(gp.date)
            const isFutureRace = new Date(raceDate) > new Date()
            const isWronglyCompleted = gpStatus === 'completed' && isFutureRace

            return (
              <div
                key={String(gp.id)}
                className="flex items-center justify-between p-3 rounded-lg border border-f1-gray-dark hover:border-f1-gray-mid transition-colors group"
              >
                <Link
                  href={`/league/${id}/gp/${gp.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className="text-f1-red font-black text-sm w-6 text-center flex-shrink-0">
                    {String(gp.round)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {isWronglyCompleted && <span className="text-yellow-400 mr-1">⚠️</span>}
                      {String(gp.name)}
                    </p>
                    <p className="text-f1-gray text-xs">
                      {new Date(raceDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      {gp.has_sprint && <span className="ml-2 text-yellow-500">Sprint</span>}
                      {isWronglyCompleted && (
                        <span className="ml-2 text-yellow-400 font-semibold">gara futura!</span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Reset button (only for wrongly-completed future GPs) */}
                  <ResetGpButton
                    leagueId={id}
                    gpId={String(gp.id)}
                    gpName={String(gp.name)}
                    currentStatus={gpStatus}
                    raceDate={raceDate}
                  />
                  {hasResult
                    ? <Badge variant="green">✓ Risultati</Badge>
                    : <Badge variant="gray">In attesa</Badge>
                  }
                  <Link href={`/league/${id}/gp/${gp.id}`}>
                    <ChevronRight className="w-4 h-4 text-f1-gray group-hover:text-f1-red transition-colors" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── AUDIT LOG ──────────────────────────────────── */}
      <AuditLog leagueId={id} />
    </div>
  )
}

async function AuditLog({ leagueId }: { leagueId: string }) {
  const admin = createAdminClient()
  const { data: logs } = await admin
    .from('audit_log')
    .select('*, profile:profiles(display_name)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })
    .limit(20)

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      gp_results_submitted: 'Risultati GP inseriti',
      gp_status_reset: 'Stato GP resettato',
      selections_locked: '🔒 Selezioni bloccate',
      selections_unlocked: '🔓 Selezioni sbloccate',
      gp_locked: '🔒 GP bloccati',
      gp_unlocked: '🔓 GP sbloccati',
      gp_permanent_lock: '🔒 Blocco permanente GP',
      gp_permanent_unlock: '🔓 Blocco permanente rimosso',
      gp_deadline_set: '⏰ Scadenza GP impostata',
      gp_deadline_removed: '⏰ Scadenza GP rimossa',
      admin_set_selection: '👑 Selezione impostata per giocatore',
    }
    return labels[action] ?? action
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log attività</CardTitle>
      </CardHeader>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {(logs ?? []).map((log) => {
          const profile = (log as Record<string, unknown>).profile as Record<string, unknown>
          const action = String((log as Record<string, unknown>).action ?? '')
          return (
            <div key={String((log as Record<string, unknown>).id)}
              className="flex items-start justify-between text-xs py-1.5 border-b border-f1-gray-dark last:border-0">
              <div>
                <span className="text-f1-gray-light font-semibold">{String(profile?.display_name ?? '?')}</span>
                <span className="text-f1-gray ml-2">{actionLabel(action)}</span>
              </div>
              <span className="text-f1-gray text-[10px] whitespace-nowrap ml-2">
                {new Date(String((log as Record<string, unknown>).created_at)).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        {(!logs || logs.length === 0) && (
          <p className="text-f1-gray text-xs text-center py-4">Nessuna attività</p>
        )}
      </div>
    </Card>
  )
}
