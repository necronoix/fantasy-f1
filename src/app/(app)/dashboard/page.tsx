import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMyLeagues } from '@/app/actions/league'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Plus, LogIn, Flag, ChevronRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const myLeagues = user ? await getMyLeagues(user.id) : []

  // Upcoming GPs
  const { data: nextGps } = await createAdminClient()
    .from('grands_prix')
    .select('*')
    .eq('season_id', 2026)
    .eq('status', 'upcoming')
    .order('date', { ascending: true })
    .limit(3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-f1-gray text-sm mt-0.5">Stagione F1 2026</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/join-league"
            className="flex items-center gap-1.5 text-sm border border-f1-gray-mid hover:border-f1-red text-white rounded-lg px-3 py-2 transition-colors font-semibold"
          >
            <LogIn className="w-4 h-4" />
            Entra
          </Link>
          <Link
            href="/create-league"
            className="flex items-center gap-1.5 text-sm bg-f1-red hover:bg-f1-red-dark text-white rounded-lg px-3 py-2 transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Crea lega
          </Link>
        </div>
      </div>

      {/* My leagues */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-f1-gray mb-3">Le mie leghe</h2>
        {myLeagues.length === 0 ? (
          <Card className="text-center py-12">
            <Flag className="w-10 h-10 text-f1-gray mx-auto mb-3" />
            <p className="text-f1-gray-light font-semibold">Nessuna lega ancora</p>
            <p className="text-f1-gray text-sm mt-1">Crea una lega o entra con un codice</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {myLeagues.map((membership: Record<string, unknown>) => {
              const league = membership.league as Record<string, unknown>
              return (
                <Link
                  key={String(membership.league_id)}
                  href={`/league/${membership.league_id}`}
                  className="block"
                >
                  <Card className="hover:border-f1-gray-mid transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-f1-red/20 rounded-lg flex items-center justify-center">
                          <Flag className="w-5 h-5 text-f1-red" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{String(league?.name ?? '')}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={membership.role === 'admin' ? 'red' : 'default'}>
                              {String(membership.role)}
                            </Badge>
                            <span className="text-f1-gray text-xs">
                              {String(membership.credits_left ?? 200)} crediti
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-f1-gray group-hover:text-f1-red transition-colors" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Upcoming GPs */}
      {nextGps && nextGps.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-f1-gray mb-3">Prossimi GP</h2>
          <div className="grid gap-2">
            {nextGps.map((gp) => (
              <Card key={gp.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[40px]">
                    <div className="text-f1-red font-black text-lg leading-none">{gp.round}</div>
                    <div className="text-f1-gray text-xs uppercase">Round</div>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{gp.name}</p>
                    <p className="text-f1-gray text-xs">{gp.circuit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-xs font-semibold">
                    {new Date(gp.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </p>
                  {gp.has_sprint && (
                    <Badge variant="yellow" className="mt-1">Sprint</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
