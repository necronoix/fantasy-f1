import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { LiveSessionView } from '@/components/league/LiveSessionView'
import { getLiveSessionWithScores } from '@/app/actions/live-session'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string; gpId: string }>
}

export default async function LiveSessionPage({ params }: Props) {
  const { id: leagueId, gpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Check membership
  const { data: membership } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const isAdmin = (membership as Record<string, unknown>).role === 'admin'

  // Get GP info
  const { data: gp } = await admin
    .from('grands_prix')
    .select('id, name, round, date, circuit')
    .eq('id', gpId)
    .single()

  if (!gp) notFound()

  // Get all drivers for admin position entry
  const { data: allDrivers } = await admin
    .from('drivers')
    .select('id, name, short_name, team_id, team:teams(id, name, short_name, color)')
    .eq('season_id', 2026)
    .eq('active', true)
    .order('name')

  // Get initial live session data with scores
  const liveData = await getLiveSessionWithScores(leagueId, gpId)

  return (
    <div className="space-y-4">
      {/* Back link + header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/league/${leagueId}/gp/${gpId}`}
          className="flex items-center gap-1 text-f1-gray hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Torna al GP
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <div>
          <h1 className="text-xl font-black text-white">
            {String(gp.name)} — Sessione LIVE
          </h1>
          <p className="text-f1-gray text-xs">
            Round {String(gp.round)} · {new Date(String(gp.date)).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <LeagueNav leagueId={leagueId} isAdmin={isAdmin} />

      <LiveSessionView
        leagueId={leagueId}
        gpId={gpId}
        gpName={String(gp.name)}
        gpRound={Number(gp.round)}
        isAdmin={isAdmin}
        currentUserId={user.id}
        initialSession={liveData.session}
        initialPlayerScores={liveData.playerScores}
        initialDriverStandings={liveData.driverStandings}
        initialTeamStandings={liveData.teamStandings}
        allDrivers={(allDrivers ?? []) as any}
      />
    </div>
  )
}
