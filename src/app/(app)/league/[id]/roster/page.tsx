import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { Star, Users } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function RosterPage({ params }: Props) {
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

  // Get all members' rosters for this league
  const { data: allRosters } = await supabase
    .from('rosters')
    .select('*, driver:drivers(*, team:teams(*)), member:league_members!inner(*, profile:profiles(display_name))')
    .eq('league_id', id)
    .order('purchase_price', { ascending: false })

  // Get my roster specifically
  const myRoster = (allRosters ?? []).filter((r: Record<string, unknown>) => {
    const member = r.member as Record<string, unknown>
    return member?.user_id === user.id
  })

  // Group by user
  const byUser: Record<string, typeof allRosters> = {}
  for (const entry of (allRosters ?? [])) {
    const member = (entry as Record<string, unknown>).member as Record<string, unknown>
    const uid = String(member?.user_id ?? '')
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
      <div>
        <h1 className="text-2xl font-black">Rosa</h1>
        <p className="text-f1-gray text-sm">Piloti acquistati all&apos;asta</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={myMembership.role === 'admin'} />

      {/* My roster */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-f1-red" />
              La mia rosa
            </span>
          </CardTitle>
          <span className="text-f1-gray text-xs">{myRoster.length}/4 piloti</span>
        </CardHeader>
        {myRoster.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-6">
            Nessun pilota — partecipa all&apos;asta per acquistarne!
          </p>
        ) : (
          <div className="space-y-2">
            {myRoster.map((entry) => {
              const driver = (entry as Record<string, unknown>).driver as Record<string, unknown>
              const team = driver?.team as Record<string, unknown>
              const color = TEAM_COLORS[String(team?.id ?? '')] ?? '#888'
              return (
                <div key={String((entry as Record<string, unknown>).driver_id)}
                  className="flex items-center justify-between p-3 rounded-lg border border-f1-gray-dark hover:border-f1-gray-mid transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-10 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="font-bold text-white">{String(driver?.name ?? '')}</p>
                      <p className="text-f1-gray text-xs">{String(team?.name ?? '')} · #{String(driver?.number ?? '')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-f1-red font-black">{String((entry as Record<string, unknown>).purchase_price ?? 0)} cr</p>
                    <Badge variant="gray" className="text-[9px]">{String((entry as Record<string, unknown>).acquired_via ?? '').replace('_', ' ')}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* All players rosters */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Rose di tutti
            </span>
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          {Object.entries(byUser).map(([uid, entries]) => {
            if (!entries || entries.length === 0) return null
            const firstEntry = entries[0] as Record<string, unknown>
            const memberData = firstEntry?.member as Record<string, unknown>
            const profile = memberData?.profile as Record<string, unknown>
            const isMe = uid === user.id
            return (
              <div key={uid}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-f1-gray-light">
                    {String(profile?.display_name ?? 'Unknown')}
                  </span>
                  {isMe && <Badge variant="red" className="text-[9px]">Tu</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {entries.map((entry) => {
                    const driver = (entry as Record<string, unknown>).driver as Record<string, unknown>
                    const team = driver?.team as Record<string, unknown>
                    const color = TEAM_COLORS[String(team?.id ?? '')] ?? '#888'
                    return (
                      <div key={String((entry as Record<string, unknown>).driver_id)}
                        className="flex items-center gap-2 p-2 bg-f1-gray-dark rounded-lg">
                        <div className="w-0.5 h-8 rounded-full" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate">{String(driver?.name ?? '')}</p>
                          <p className="text-f1-gray text-[10px]">{String(driver?.short_name ?? '')} · {String((entry as Record<string, unknown>).purchase_price ?? 0)}cr</p>
                        </div>
                      </div>
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
