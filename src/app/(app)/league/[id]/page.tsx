import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { CopyCode } from '@/components/league/CopyCode'

interface Props { params: Promise<{ id: string }> }

export default async function LeaguePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch league + members directly with admin client (avoids double auth call)
  const { data: league } = await admin
    .from('leagues')
    .select(`*, league_members(*, profile:profiles(*))`)
    .eq('id', id)
    .single()

  if (!league) notFound()

  const members = (league.league_members ?? []) as Array<Record<string, unknown>>
  const myMembership = members.find((m) => m.user_id === user.id)
  if (!myMembership) notFound()

  const isAdmin = myMembership.role === 'admin'

  // Next GP (public table)
  const { data: nextGp } = await admin
    .from('grands_prix')
    .select('*')
    .eq('status', 'upcoming')
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-black">{String(league.name)}</h1>
          <Badge variant={isAdmin ? 'red' : 'default'}>{String(myMembership.role)}</Badge>
        </div>
        <p className="text-f1-gray text-sm">Stagione 2026 · {members.length}/{league.max_players} giocatori</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invite code */}
        <Card>
          <CardHeader>
            <CardTitle>Codice invito</CardTitle>
          </CardHeader>
          <CopyCode code={String(league.code)} />
          <p className="text-f1-gray text-xs mt-2">
            Condividi questo codice con i tuoi amici per farli entrare nella lega
          </p>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Giocatori
              </span>
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {members.map((m) => {
              const profile = m.profile as Record<string, unknown>
              return (
                <div key={String(m.user_id)} className="flex items-center justify-between py-1.5 border-b border-f1-gray-dark last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-f1-gray-dark flex items-center justify-center text-xs font-bold text-f1-gray-light">
                      {String(profile?.display_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white">{String(profile?.display_name ?? 'Unknown')}</span>
                    {m.role === 'admin' && <Badge variant="red" className="text-[9px]">admin</Badge>}
                  </div>
                  <span className="text-f1-gray text-xs">{String(m.credits_left ?? 200)} cr</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Budget summary for current user */}
        <Card>
          <CardHeader>
            <CardTitle>Il tuo budget</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-f1-gray text-sm">Budget totale</span>
              <span className="text-white font-bold">{String(myMembership.credits_total ?? 200)} cr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-f1-gray text-sm">Spesi</span>
              <span className="text-f1-red font-bold">{String(myMembership.credits_spent ?? 0)} cr</span>
            </div>
            <div className="w-full bg-f1-gray-dark rounded-full h-2">
              <div
                className="bg-f1-red h-2 rounded-full transition-all"
                style={{ width: `${((Number(myMembership.credits_spent) || 0) / (Number(myMembership.credits_total) || 200)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-f1-gray-dark">
              <span className="text-white text-sm font-bold">Rimanenti</span>
              <span className="text-green-400 font-black text-lg">{String(myMembership.credits_left ?? 200)} cr</span>
            </div>
          </div>
        </Card>

        {/* Next GP */}
        {nextGp && (
          <Card>
            <CardHeader>
              <CardTitle>Prossimo GP</CardTitle>
            </CardHeader>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl font-black text-f1-red">{nextGp.round}</span>
                <div>
                  <p className="font-bold text-white">{nextGp.name}</p>
                  <p className="text-f1-gray text-xs">{nextGp.circuit}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-f1-gray mt-3 pt-3 border-t border-f1-gray-dark">
                <span>Gara: <span className="text-white">{new Date(nextGp.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}</span></span>
                {nextGp.has_sprint && <Badge variant="yellow">Sprint ⚡</Badge>}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
