import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DriverCard } from '@/components/f1/DriverCard'
import { TeamCarSilhouette } from '@/components/f1/TeamCarSilhouette'
import { notFound } from 'next/navigation'
import { Star, Users, Shield } from 'lucide-react'
import { TEAM_COLORS as F1_TEAM_COLORS, TEAM_NAMES } from '@/components/f1/f1-data'
import { LiveSessionBanner } from '@/components/league/LiveSessionBanner'

interface Props { params: Promise<{ id: string }> }

export default async function RosterPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: myMembership } = await admin
    .from('league_members')
    .select('role, credits_left, credits_spent')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) notFound()

  const isAdmin = myMembership.role === 'admin'

  // Get active GP + live session
  const [{ data: activeGp }, { data: leagueForLive }] = await Promise.all([
    admin.from('grands_prix').select('id, name, round').in('status', ['upcoming', 'qualifying', 'race']).order('date', { ascending: true }).limit(1).maybeSingle(),
    admin.from('leagues').select('settings_json').eq('id', id).single(),
  ])
  const liveSettings = (leagueForLive?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = (liveSettings.live_sessions as Record<string, { is_active: boolean; is_final: boolean }>) ?? {}
  const activeGpId = activeGp ? String((activeGp as Record<string, unknown>).id) : null
  const activeLiveSession = activeGpId ? (liveSessions[activeGpId] ?? null) : null

  // Get all members' rosters for this league
  const { data: allRosters } = await admin
    .from('rosters')
    .select('*, driver:drivers(*, team:teams(*)), profile:profiles(display_name)')
    .eq('league_id', id)
    .order('purchase_price', { ascending: false })

  // Separate driver rosters from team rosters
  const driverRosters = (allRosters ?? []).filter((r: Record<string, unknown>) => (r as Record<string, unknown>).driver_id != null)
  const teamRosters = (allRosters ?? []).filter((r: Record<string, unknown>) => (r as Record<string, unknown>).team_id != null)

  // Get my roster specifically (drivers only)
  const myRoster = driverRosters.filter((r: Record<string, unknown>) => {
    return (r as Record<string, unknown>).user_id === user.id
  })
  const myTeam = teamRosters.find((r: Record<string, unknown>) => (r as Record<string, unknown>).user_id === user.id)

  // Group by user_id (drivers)
  const byUser: Record<string, typeof allRosters> = {}
  for (const entry of driverRosters) {
    const uid = String((entry as Record<string, unknown>).user_id ?? '')
    if (!byUser[uid]) byUser[uid] = []
    byUser[uid]!.push(entry)
  }

  const TEAM_COLORS: Record<string, string> = {
    mclaren_2026: '#FF8000',
    ferrari_2026: '#E8002D',
    mercedes_2026: '#27F4D2',
    redbull_2026: '#3671C6',
    racingbulls_2026: '#6692FF',
    astonmartin_2026: '#358C75',
    williams_2026: '#64C4FF',
    alpine_2026: '#0090FF',
    haas_2026: '#B6BABD',
    audi_2026: '#C5000A',
    cadillac_2026: '#888888',
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden">
        {/* Decorative car silhouette */}
        <div className="absolute -right-20 -top-16 opacity-5 pointer-events-none">
          <TeamCarSilhouette size={80} />
        </div>
        <div className="relative z-10">
          <div className="absolute left-0 top-0 w-2 h-12 bg-gradient-to-b from-f1-red to-f1-red/20 rounded-r-full" />
          <h1 className="text-4xl font-black pl-4">Rosa</h1>
          <p className="text-f1-gray text-sm pl-4 uppercase tracking-widest font-semibold mt-1">Piloti acquistati all&apos;asta</p>
        </div>
      </div>

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      {/* Live Session Banner */}
      {activeGp && activeGpId && (
        <LiveSessionBanner
          leagueId={id}
          gpId={activeGpId}
          gpName={String((activeGp as Record<string, unknown>).name)}
          gpRound={Number((activeGp as Record<string, unknown>).round)}
          session={activeLiveSession}
          isAdmin={isAdmin}
        />
      )}

      {/* My roster */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Star className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
              <span>La mia rosa</span>
            </CardTitle>
            <div className="text-right">
              <p className="text-white font-black text-sm">{myRoster.length}<span className="text-f1-gray">/4</span></p>
              <p className="text-f1-gray text-xs uppercase tracking-widest">{myMembership.credits_left} cr left</p>
            </div>
          </div>
        </CardHeader>
        {myRoster.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-12">
            Nessun pilota — partecipa all&apos;asta per acquistarne!
          </p>
        ) : (
          <div className="space-y-4 p-4">
            {/* My team - wider card style */}
            {myTeam && (() => {
              const teamId = String((myTeam as Record<string, unknown>).team_id ?? '')
              const teamColor = F1_TEAM_COLORS[teamId] ?? '#888'
              const teamName = TEAM_NAMES[teamId] ?? teamId
              const teamPrice = String((myTeam as Record<string, unknown>).purchase_price ?? 0)
              return (
                <div
                  className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(232,0,45,0.2)] group"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
                    borderColor: `${teamColor}40`,
                    boxShadow: `inset 0 0 20px ${teamColor}10, 0 0 15px ${teamColor}15`
                  }}
                >
                  {/* Top color stripe */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ backgroundColor: teamColor }} />

                  <div className="flex items-center gap-6">
                    {/* Shield Icon */}
                    <div className="flex-shrink-0 p-4 rounded-xl group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${teamColor}20` }}>
                      <Shield className="w-8 h-8" style={{ color: teamColor }} />
                    </div>

                    {/* Team Info */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-white uppercase tracking-wide">{teamName}</h3>
                      <p className="text-f1-gray text-xs uppercase tracking-widest font-semibold mt-1">Scuderia</p>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-f1-red/80 to-f1-red/60 border border-f1-red/50 shadow-[0_0_15px_rgba(232,0,45,0.2)]">
                        <span className="text-white font-black text-lg">{teamPrice}</span>
                        <span className="text-f1-gray text-xs ml-1">cr</span>
                      </div>
                      <Badge variant="red" className="text-[9px] font-black uppercase tracking-wider">Team</Badge>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* My drivers - 2-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {myRoster.map((entry) => {
                const driver = (entry as Record<string, unknown>).driver as Record<string, unknown>
                const team = driver?.team as Record<string, unknown>
                const teamColor = TEAM_COLORS[String(team?.id ?? '')] ?? '#888'
                const purchasePrice = String((entry as Record<string, unknown>).purchase_price ?? 0)
                const acquiredVia = String((entry as Record<string, unknown>).acquired_via ?? '').replace('_', ' ')
                const driverNumber = String(driver?.number ?? '')
                const driverId = String(driver?.id ?? '')
                const driverName = String(driver?.name ?? '')
                const driverShortName = String(driver?.short_name ?? '')
                const teamName = String(team?.short_name ?? '')

                return (
                  <DriverCard
                    key={driverId}
                    driverId={driverId}
                    driverName={driverName}
                    driverShortName={driverShortName}
                    driverNumber={driverNumber}
                    teamName={teamName}
                    teamColor={teamColor}
                    price={purchasePrice}
                    priceLabel="cr"
                    size="md"
                    badge={acquiredVia}
                    badgeColor="#E8002D"
                  />
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* All players rosters */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-f1-red/40 via-white/10 to-transparent" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-f1-gray-light" />
            <span>Rose di tutti</span>
          </CardTitle>
        </CardHeader>
        <div className="space-y-6 mt-2 p-4">
          {Object.entries(byUser).map(([uid, entries]) => {
            if (!entries || entries.length === 0) return null
            const firstEntry = entries[0] as Record<string, unknown>
            const profile = firstEntry?.profile as Record<string, unknown>
            const isMe = uid === user.id
            return (
              <div key={uid} className="pb-4 last:pb-0">
                <div className={`flex items-center gap-3 mb-4 pb-3 border-b-2 ${isMe ? 'border-f1-red/40' : 'border-f1-gray-dark/40'}`}>
                  <span className={`text-sm font-black uppercase tracking-widest ${isMe ? 'text-f1-red drop-shadow-[0_0_6px_rgba(232,0,45,0.3)]' : 'text-white'}`}>
                    {String(profile?.display_name ?? 'Unknown')}
                  </span>
                  {isMe && <Badge variant="red" className="text-[9px] font-black">YOU</Badge>}
                </div>

                {/* Driver cards in smaller format - 2-3 column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entries.map((entry) => {
                    const driver = (entry as Record<string, unknown>).driver as Record<string, unknown>
                    const team = driver?.team as Record<string, unknown>
                    const teamColor = TEAM_COLORS[String(team?.id ?? '')] ?? '#888'
                    const purchasePrice = String((entry as Record<string, unknown>).purchase_price ?? 0)
                    const driverNumber = String(driver?.number ?? '')
                    const driverId = String(driver?.id ?? '')
                    const driverName = String(driver?.name ?? '')
                    const driverShortName = String(driver?.short_name ?? '')
                    const teamName = String(team?.short_name ?? '')

                    return (
                      <DriverCard
                        key={driverId}
                        driverId={driverId}
                        driverName={driverName}
                        driverShortName={driverShortName}
                        driverNumber={driverNumber}
                        teamName={teamName}
                        teamColor={teamColor}
                        price={purchasePrice}
                        priceLabel="cr"
                        size="sm"
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
