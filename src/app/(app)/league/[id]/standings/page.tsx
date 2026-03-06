import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStandings } from '@/app/actions/gp'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function StandingsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myMembership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myMembership) notFound()

  const { scores, members } = await getStandings(id)

  // Aggregate totals per user
  const totals: Record<string, { name: string; total: number; gps: number }> = {}
  for (const m of members) {
    const profile = (m as Record<string, unknown>).profile as Record<string, unknown>
    totals[String((m as Record<string, unknown>).user_id)] = {
      name: String(profile?.display_name ?? 'Unknown'),
      total: 0,
      gps: 0,
    }
  }
  for (const s of scores) {
    const uid = String((s as Record<string, unknown>).user_id)
    if (totals[uid]) {
      totals[uid]!.total += Number((s as Record<string, unknown>).total_points ?? 0)
      totals[uid]!.gps++
    }
  }

  const ranked = Object.entries(totals)
    .map(([uid, data]) => ({ uid, ...data }))
    .sort((a, b) => b.total - a.total)

  // GPs with results
  const completedGps = [...new Set(scores.map((s) => {
    const gp = (s as Record<string, unknown>).grand_prix as Record<string, unknown>
    return { id: String((s as Record<string, unknown>).gp_id), name: String(gp?.name ?? ''), round: Number(gp?.round ?? 0) }
  }))].sort((a, b) => a.round - b.round)

  const scoreByUserGp: Record<string, Record<string, number>> = {}
  for (const s of scores) {
    const uid = String((s as Record<string, unknown>).user_id)
    const gpId = String((s as Record<string, unknown>).gp_id)
    if (!scoreByUserGp[uid]) scoreByUserGp[uid] = {}
    scoreByUserGp[uid]![gpId] = Number((s as Record<string, unknown>).total_points ?? 0)
  }

  const medalColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600']

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Classifica</h1>
        <p className="text-f1-gray text-sm">{completedGps.length} GP completati</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={myMembership.role === 'admin'} />

      {/* Total standings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Classifica generale
            </span>
          </CardTitle>
        </CardHeader>
        {ranked.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-6">Nessun risultato ancora. Completa il primo GP!</p>
        ) : (
          <div className="space-y-2">
            {ranked.map((entry, i) => {
              const isMe = entry.uid === user.id
              return (
                <div key={entry.uid}
                  className={`flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-f1-red/10 border border-f1-red/30' : 'bg-f1-gray-dark'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-black w-8 text-center ${medalColors[i] ?? 'text-f1-gray-light'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">
                        {entry.name}
                        {isMe && <span className="text-f1-red text-xs ml-2">(tu)</span>}
                      </p>
                      <p className="text-f1-gray text-xs">{entry.gps} GP giocati</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black text-xl">{entry.total}</p>
                    <p className="text-f1-gray text-xs">punti</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* GP-by-GP breakdown table */}
      {completedGps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storico per GP</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-f1-gray-dark">
                  <th className="text-left py-2 pr-3 text-f1-gray font-semibold uppercase tracking-wider">Giocatore</th>
                  {completedGps.map((gp) => (
                    <th key={gp.id} className="text-center py-2 px-2 text-f1-gray font-semibold uppercase tracking-wider whitespace-nowrap">
                      R{gp.round}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-3 text-f1-gray font-semibold uppercase tracking-wider">Tot</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry) => (
                  <tr key={entry.uid} className="border-b border-f1-gray-dark/50 last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-white whitespace-nowrap">
                      {entry.name}
                      {entry.uid === user.id && <span className="text-f1-red ml-1">●</span>}
                    </td>
                    {completedGps.map((gp) => {
                      const pts = scoreByUserGp[entry.uid]?.[gp.id]
                      return (
                        <td key={gp.id} className="text-center py-2.5 px-2">
                          <span className={pts !== undefined ? 'text-white font-semibold' : 'text-f1-gray'}>
                            {pts !== undefined ? pts : '—'}
                          </span>
                        </td>
                      )
                    })}
                    <td className="text-right py-2.5 pl-3 font-black text-f1-red">{entry.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
