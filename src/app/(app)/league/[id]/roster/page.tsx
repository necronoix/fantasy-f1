import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DriverCard } from '@/components/ui/DriverCard'
import { notFound } from 'next/navigation'
import { Star, Users } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function RosterPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myMembership } = await admin
    .from('league_members')
    .select('role, credits_left, credits_spent, user_id')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) notFound()

  const { data: allRosters } = await admin
    .from('rosters')
    .select(`
      *,
      driver:drivers(id, name, short_name, number, photo_url, helmet_url, team:teams(id, name, color)),
      member:league_members!inner(user_id, profile:profiles(display_name))
    `)
    .eq('league_id', id)
    .order('purchase_price', { ascending: false })

  type RosterEntry = {
    driver_id: string
    purchase_price: number
    acquired_via: string
    driver: {
      id: string; name: string; short_name: string; number: number
      photo_url?: string; helmet_url?: string
      team: { id: string; name: string; color: string }
    }
    member: { user_id: string; profile: { display_name: string } }
  }

  const entries = (allRosters ?? []) as unknown as RosterEntry[]
  const myRoster = entries.filter(e => e.member.user_id === user.id)

  const byUser: Record<string, { displayName: string; entries: RosterEntry[] }> = {}
  for (const entry of entries) {
    const uid = entry.member.user_id
    if (!byUser[uid]) byUser[uid] = { displayName: entry.member.profile?.display_name ?? 'Unknown', entries: [] }
    byUser[uid]!.entries.push(entry)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Rosa</h1>
        <p className="text-f1-gray text-sm">Piloti acquistati all&apos;asta</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={myMembership.role === 'admin'} />

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-f1-red" />
              La mia rosa
            </span>
          </CardTitle>
          <span className="text-f1-gray text-xs">{myRoster.length}/4 piloti · {myMembership.credits_left} cr rimasti</span>
        </CardHeader>
        {myRoster.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-8">
            Nessun pilota — partecipa all&apos;asta!
          </p>
        ) : (
          <div className="space-y-3">
            {myRoster.map((entry) => (
              <DriverCard
                key={entry.driver_id}
                name={entry.driver.name}
                shortName={entry.driver.short_name}
                number={entry.driver.number}
                teamName={entry.driver.team.name}
                teamColor={entry.driver.team.color}
                photoUrl={entry.driver.photo_url}
                helmetUrl={entry.driver.helmet_url}
                price={entry.purchase_price}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Rose di tutti
            </span>
          </CardTitle>
        </CardHeader>
        <div className="space-y-6">
          {Object.entries(byUser).map(([uid, { displayName, entries: userEntries }]) => {
            const isMe = uid === user.id
            return (
              <div key={uid}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-f1-gray-dark flex items-center justify-center text-xs font-black text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-f1-gray-light">{displayName}</span>
                  {isMe && <Badge variant="red" className="text-[9px]">Tu</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {userEntries.map((entry) => (
                    <DriverCard
                      key={entry.driver_id}
                      name={entry.driver.name}
                      shortName={entry.driver.short_name}
                      number={entry.driver.number}
                      teamName={entry.driver.team.name}
                      teamColor={entry.driver.team.color}
                      photoUrl={entry.driver.photo_url}
                      helmetUrl={entry.driver.helmet_url}
                      price={entry.purchase_price}
                      compact
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
