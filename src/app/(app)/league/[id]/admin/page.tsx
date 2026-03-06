import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Settings } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function AdminPage({ params }: Props) {
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

  if (!myMembership || (myMembership as Record<string, unknown>).role !== 'admin') {
    redirect(`/league/${id}`)
  }

  // All GPs
  const { data: allGps } = await admin
    .from('grands_prix')
    .select('*')
    .eq('season_id', 2026)
    .order('round', { ascending: true })

  // GP results already submitted
  const { data: submittedResults } = await admin
    .from('gp_results')
    .select('gp_id')
    .eq('league_id', id)
  const submittedIds = new Set((submittedResults ?? []).map(r => String((r as Record<string, unknown>).gp_id)))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-f1-red" />
        <div>
          <h1 className="text-2xl font-black">Pannello Admin</h1>
          <p className="text-f1-gray text-sm">Gestisci risultati e configurazioni</p>
        </div>
      </div>

      <LeagueNav leagueId={id} isAdmin={true} />

      {/* GP results management */}
      <Card>
        <CardHeader>
          <CardTitle>Risultati GP</CardTitle>
          <Badge variant="red">Admin</Badge>
        </CardHeader>
        <p className="text-f1-gray text-xs mb-3">
          Clicca su un GP per inserire/aggiornare i risultati e calcolare i punteggi
        </p>
        <div className="space-y-1.5">
          {(allGps ?? []).map((gp) => {
            const hasResult = submittedIds.has(String(gp.id))
            return (
              <Link
                key={String(gp.id)}
                href={`/league/${id}/gp/${gp.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-f1-gray-dark hover:border-f1-gray-mid transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-f1-red font-black text-sm w-6 text-center">
                    {String(gp.round)}
                  </span>
                  <div>
                    <p className="text-white text-sm font-semibold">{String(gp.name)}</p>
                    <p className="text-f1-gray text-xs">
                      {new Date(String(gp.date)).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      {gp.has_sprint && <span className="ml-2 text-yellow-500">Sprint</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasResult
                    ? <Badge variant="green">✓ Risultati</Badge>
                    : <Badge variant="gray">In attesa</Badge>
                  }
                  <ChevronRight className="w-4 h-4 text-f1-gray group-hover:text-f1-red transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      </Card>

      {/* Audit log */}
      <AuditLog leagueId={id} />
    </div>
  )
}

async function AuditLog({ leagueId }: { leagueId: string }) {
  const admin = createAdminClient()
  const { data: logs } = await admin
    .from('audit_log')
    .select('*, profile:profiles(display_name)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log attività</CardTitle>
      </CardHeader>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {(logs ?? []).map((log) => {
          const profile = (log as Record<string, unknown>).profile as Record<string, unknown>
          return (
            <div key={String((log as Record<string, unknown>).id)}
              className="flex items-start justify-between text-xs py-1.5 border-b border-f1-gray-dark last:border-0">
              <div>
                <span className="text-f1-gray-light font-semibold">{String(profile?.display_name ?? '?')}</span>
                <span className="text-f1-gray ml-2">{String((log as Record<string, unknown>).action ?? '')}</span>
              </div>
              <span className="text-f1-gray text-[10px] whitespace-nowrap ml-2">
                {new Date(String((log as Record<string, unknown>).created_at)).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        {(!logs || logs.length === 0) && (
          <p className="text-f1-gray text-xs text-center py-4">Nessuna attività</p>
        )}
      </div>
    </Card>
  )
}
