import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getActiveAuction, getAuctionBids } from '@/app/actions/auction'
import { getTeamOwnership } from '@/app/actions/team-auction'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { AuctionRoom } from '@/components/auction/AuctionRoom'
import { TeamAuctionRoom } from '@/components/auction/TeamAuctionRoom'
import { AdminDriverPicker } from '@/components/auction/AdminDriverPicker'
import { AdminTeamPicker } from '@/components/auction/AdminTeamPicker'
import { Gavel, Shield } from 'lucide-react'
import { TEAM_NAMES, TEAM_COLORS } from '@/components/f1/f1-data'

interface Props { params: Promise<{ id: string }> }

export default async function AuctionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: myMembership } = await admin
    .from('league_members')
    .select('role, credits_left, credits_spent, profile:profiles(display_name)')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myMembership) notFound()

  const myDisplayName = String(((myMembership as Record<string, unknown>).profile as Record<string, unknown>)?.display_name ?? 'Utente')

  const isAdmin = (myMembership as Record<string, unknown>).role === 'admin'

  // Get active auction if any
  const activeAuction = await getActiveAuction(id)
  const bids = activeAuction ? await getAuctionBids(String(activeAuction.id)) : []

  // Get roster count (to check completion)
  const { count: myRosterCount } = await admin
    .from('rosters')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', id)
    .eq('user_id', user.id)

  // Get all members + roster count
  const { data: allMembers } = await admin
    .from('league_members')
    .select('user_id, credits_left, credits_spent, profile:profiles(display_name)')
    .eq('league_id', id)

  const memberRosterCounts: Record<string, number> = {}
  const { data: allRosters } = await admin
    .from('rosters')
    .select('user_id')
    .eq('league_id', id)
  for (const r of (allRosters ?? [])) {
    const uid = String((r as Record<string, unknown>).user_id)
    memberRosterCounts[uid] = (memberRosterCounts[uid] ?? 0) + 1
  }

  // All drivers + taken status
  const { data: allDrivers } = await admin
    .from('drivers')
    .select('*, team:teams(*)')
    .eq('season_id', 2026)
    .eq('active', true)
    .order('name')

  const { data: takenDrivers } = await admin
    .from('rosters')
    .select('driver_id')
    .eq('league_id', id)

  const takenIds = new Set((takenDrivers ?? []).map(r => String((r as Record<string, unknown>).driver_id)))

  // Team auction data
  const teamOwnership = await getTeamOwnership(id)
  const takenTeamIds = teamOwnership.map(t => String((t as Record<string, unknown>).team_id))
  const isTeamAuction = activeAuction && (activeAuction as Record<string, unknown>).type === 'team'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Gavel className="w-6 h-6 text-f1-red" />
          Asta
        </h1>
        <p className="text-f1-gray text-sm">
          {activeAuction ? 'Asta in corso!' : 'Nessuna asta attiva'}
        </p>
      </div>

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      {/* Live auction room */}
      {activeAuction ? (
        isTeamAuction ? (
          <TeamAuctionRoom
            leagueId={id}
            auction={activeAuction as Record<string, unknown>}
            initialBids={bids as Record<string, unknown>[]}
            userId={user.id}
            userDisplayName={myDisplayName}
            userCreditsLeft={Number((myMembership as Record<string, unknown>).credits_left ?? 200)}
            isAdmin={isAdmin}
            hasTeam={takenTeamIds.some(tid => teamOwnership.some(t => String((t as Record<string, unknown>).user_id) === user.id))}
          />
        ) : (
          <AuctionRoom
            leagueId={id}
            auction={activeAuction as Record<string, unknown>}
            initialBids={bids as Record<string, unknown>[]}
            userId={user.id}
            userDisplayName={myDisplayName}
            userCreditsLeft={Number((myMembership as Record<string, unknown>).credits_left ?? 200)}
            userRosterCount={myRosterCount ?? 0}
            isAdmin={isAdmin}
          />
        )
      ) : (
        <Card>
          <div className="text-center py-10">
            <Gavel className="w-12 h-12 text-f1-gray mx-auto mb-3" />
            <p className="text-f1-gray-light font-semibold">Nessuna asta in corso</p>
            {isAdmin && <p className="text-f1-gray text-sm mt-1">Seleziona un pilota qui sotto per avviare l&apos;asta</p>}
          </div>
        </Card>
      )}

      {/* Admin: start auction */}
      {isAdmin && !activeAuction && (
        <Card>
          <CardHeader>
            <CardTitle>Avvia nuova asta (Admin)</CardTitle>
            <Badge variant="red">Admin</Badge>
          </CardHeader>
          <AdminDriverPicker
            leagueId={id}
            allDrivers={(allDrivers ?? []) as Record<string, unknown>[]}
            takenIds={[...takenIds]}
          />
        </Card>
      )}

      {/* Admin: start team auction */}
      {isAdmin && !activeAuction && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-f1-red" />
                Asta Scuderie (Admin)
              </span>
            </CardTitle>
            <Badge variant="red">Admin</Badge>
          </CardHeader>
          <AdminTeamPicker
            leagueId={id}
            takenTeamIds={takenTeamIds}
          />
        </Card>
      )}

      {/* Team ownership display */}
      {teamOwnership.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Scuderie assegnate
              </span>
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {teamOwnership.map((t) => {
              const teamId = String((t as Record<string, unknown>).team_id)
              const profile = (t as Record<string, unknown>).profile as Record<string, unknown>
              const color = TEAM_COLORS[teamId] ?? '#888'
              const name = TEAM_NAMES[teamId] ?? teamId
              return (
                <div key={teamId} className="flex items-center justify-between py-2 border-b border-f1-gray-dark last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                    <span className="text-sm font-bold text-white">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-f1-gray-light">{String(profile?.display_name ?? 'Unknown')}</span>
                    <span className="text-xs text-green-400 font-bold">{String((t as Record<string, unknown>).purchase_price ?? 0)} cr</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Members status */}
      <Card>
        <CardHeader>
          <CardTitle>Stato giocatori</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {(allMembers ?? []).map((m) => {
            const profile = (m as Record<string, unknown>).profile as Record<string, unknown>
            const uid = String((m as Record<string, unknown>).user_id)
            const rCount = memberRosterCounts[uid] ?? 0
            const isComplete = rCount >= 4
            return (
              <div key={uid} className="flex items-center justify-between py-2 border-b border-f1-gray-dark last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {String(profile?.display_name ?? 'Unknown')}
                  </span>
                  {uid === user.id && <Badge variant="red" className="text-[9px]">tu</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-f1-gray">{rCount}/4 piloti</span>
                  <span className="text-xs font-bold text-green-400">
                    {String((m as Record<string, unknown>).credits_left ?? 200)} cr
                  </span>
                  {isComplete && <Badge variant="green">✓</Badge>}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
