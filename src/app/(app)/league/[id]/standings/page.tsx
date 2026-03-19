import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStandings } from '@/app/actions/gp'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { StandingsClient } from '@/components/league/StandingsClient'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

type RosterDriverEntry = {
  user_id: string
  driver: { helmet_url?: string | null; short_name: string; team: { color: string } } | null
}

export default async function StandingsPage({ params }: Props) {
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
  if (!myMembership) notFound()

  const { scores, members } = await getStandings(id)

  // Fetch roster helmets per user
  const { data: allRostersRaw } = await admin
    .from('rosters')
    .select('user_id, driver:drivers(helmet_url, short_name, team:teams(color))')
    .eq('league_id', id)
  const allRosters = (allRostersRaw ?? []) as unknown as RosterDriverEntry[]

  const rostersByUser: Record<string, { short_name: string; helmet_url?: string | null; team?: { color: string } | null }[]> = {}
  for (const r of allRosters) {
    const uid = r.user_id
    if (!rostersByUser[uid]) rostersByUser[uid] = []
    rostersByUser[uid]!.push({
      short_name: r.driver?.short_name ?? '',
      helmet_url: r.driver?.helmet_url,
      team: r.driver?.team,
    })
  }

  // Aggregate totals per user and collect GP scores with breakdowns
  const totals: Record<string, { name: string; total: number; gps: number }> = {}
  for (const m of members) {
    const profile = (m as Record<string, unknown>).profile as Record<string, unknown>
    totals[String((m as Record<string, unknown>).user_id)] = {
      name: String(profile?.display_name ?? 'Unknown'),
      total: 0,
      gps: 0,
    }
  }

  // Build per-user GP scores with breakdown
  const gpScoresByUser: Record<string, {
    gp_id: string
    gp_name: string
    gp_round: number
    total_points: number
    breakdown: Record<string, unknown> | null
  }[]> = {}

  const scoreByUserGp: Record<string, Record<string, number>> = {}

  for (const s of scores) {
    const sObj = s as Record<string, unknown>
    const uid = String(sObj.user_id)
    const gpId = String(sObj.gp_id)
    const gp = sObj.grand_prix as Record<string, unknown>
    const totalPts = Number(sObj.total_points ?? 0)
    const breakdown = (sObj.breakdown_json as Record<string, unknown>) ?? null

    if (totals[uid]) {
      totals[uid]!.total += totalPts
      totals[uid]!.gps++
    }

    if (!gpScoresByUser[uid]) gpScoresByUser[uid] = []
    gpScoresByUser[uid]!.push({
      gp_id: gpId,
      gp_name: String(gp?.name ?? ''),
      gp_round: Number(gp?.round ?? 0),
      total_points: totalPts,
      breakdown: breakdown,
    })

    if (!scoreByUserGp[uid]) scoreByUserGp[uid] = {}
    scoreByUserGp[uid]![gpId] = totalPts
  }

  // Sort each user's GP scores by round
  for (const uid of Object.keys(gpScoresByUser)) {
    gpScoresByUser[uid]!.sort((a, b) => a.gp_round - b.gp_round)
  }

  const ranked = Object.entries(totals)
    .map(([uid, data]) => ({
      uid,
      ...data,
      gpScores: (gpScoresByUser[uid] ?? []).map(gs => ({
        gp_id: gs.gp_id,
        gp_name: gs.gp_name,
        gp_round: gs.gp_round,
        total_points: gs.total_points,
        breakdown: gs.breakdown as any,
      })),
    }))
    .sort((a, b) => b.total - a.total)

  // Completed GPs
  const gpSet = new Map<string, { id: string; name: string; round: number }>()
  for (const s of scores) {
    const sObj = s as Record<string, unknown>
    const gp = sObj.grand_prix as Record<string, unknown>
    const gpId = String(sObj.gp_id)
    if (!gpSet.has(gpId)) {
      gpSet.set(gpId, { id: gpId, name: String(gp?.name ?? ''), round: Number(gp?.round ?? 0) })
    }
  }
  const completedGps = [...gpSet.values()].sort((a, b) => a.round - b.round)

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="absolute left-0 top-0 w-2 h-12 bg-gradient-to-b from-f1-red to-f1-red/20 rounded-r-full" />
        <h1 className="text-4xl font-black pl-4 text-white drop-shadow-lg">Classifica</h1>
        <p className="text-f1-gray text-sm pl-4 uppercase tracking-widest font-semibold mt-1">{completedGps.length} GP completati</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={myMembership.role === 'admin'} />

      <StandingsClient
        ranked={ranked}
        currentUserId={user.id}
        rostersByUser={rostersByUser}
        completedGps={completedGps}
        scoreByUserGp={scoreByUserGp}
      />
    </div>
  )
}
