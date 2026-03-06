import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getActiveAuction, getAuctionBids } from '@/app/actions/auction'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { AuctionRoom } from '@/components/auction/AuctionRoom'
import { AdminDriverPicker } from '@/components/auction/AdminDriverPicker'
import { Gavel } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function AuctionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myMembership } = await supabase
    .from('league_members')
    .select('role, credits_left, credits_spent')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myMembership) notFound()

  const isAdmin = (myMembership as Record<string, unknown>).role === 'admin'

  // Get active auction if any
  const activeAuction = await getActiveAuction(id)
  const bids = activeAuction ? await getAuctionBids(String(activeAuction.id)) : []

  // Get roster count (to check completion)
  const { count: myRosterCount } = await supabase
    .from('rosters')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', id)
    .eq('user_id', user.id)

  // Get all members + roster count
  const { data: allMembers } = await supabase
    .from('league_members')
    .select('user_id, credits_left, credits_spent, profile:profiles(display_name)')
    .eq('league_id', id)

  const memberRosterCounts: Record<string, number> = {}
  const { data: allRosters } = await supabase
    .from('rosters')
    .select('user_id')
    .eq('league_id', id)
  for (const r of (allRosters ?? [])) {
    const uid = String((r as Record<string, unknown>).user_id)
    memberRosterCounts[uid] = (memberRosterCounts[uid] ?? 0) + 1
  }

  // All drivers + taken status
  const { data: allDrivers } = await supabase
    .from('drivers')
    .select('*, team:teams(*)')
    .eq('season_id', 2026)
    .eq('active', true)
    .order('name')

  const { data: takenDrivers } = await supabase
    .from('rosters')
    .select('driver_id')
    .eq('league_id', id)

  const takenIds = new Set((takenDrivers ?? []).map(r => String((r as Record<string, unknown>).driver_id)))

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
        <AuctionRoom
          leagueId={id}
          auction={activeAuction as Record<string, unknown>}
          initialBids={bids as Record<string, unknown>[]}
          userId={user.id}
          userCreditsLeft={Number((myMembership as Record<string, unknown>).credits_left ?? 200)}
          userRosterCount={myRosterCount ?? 0}
          isAdmin={isAdmin}
        />
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
