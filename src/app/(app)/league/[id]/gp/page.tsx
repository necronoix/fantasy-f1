import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function GpListPage({ params }: Props) {
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

  const { data: gps } = await supabase
    .from('grands_prix')
    .select('*')
    .eq('season_id', 2026)
    .order('round', { ascending: true })

  const { data: mySelections } = await supabase
    .from('gp_selections')
    .select('gp_id, captain_driver_id')
    .eq('league_id', id)
    .eq('user_id', user.id)
  const selectedGpIds = new Set((mySelections ?? []).map(s => String((s as Record<string, unknown>).gp_id)))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-f1-red" />
          Calendario GP
        </h1>
        <p className="text-f1-gray text-sm">Stagione 2026 · 24 round</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={(myMembership as Record<string, unknown>).role === 'admin'} />

      <div className="space-y-1.5">
        {(gps ?? []).map((gp) => {
          const hasSelection = selectedGpIds.has(String(gp.id))
          const statusBadge = {
            upcoming: { label: 'In arrivo', variant: 'default' as const },
            qualifying: { label: 'Qualifiche', variant: 'yellow' as const },
            race: { label: 'Gara', variant: 'red' as const },
            completed: { label: 'Completato', variant: 'green' as const },
          }[String(gp.status)] ?? { label: String(gp.status), variant: 'default' as const }

          return (
            <Link
              key={String(gp.id)}
              href={`/league/${id}/gp/${gp.id}`}
              className="block"
            >
              <Card className="hover:border-f1-gray-mid transition-colors cursor-pointer group py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[36px]">
                      <div className="text-f1-red font-black text-xl leading-none">{String(gp.round)}</div>
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{String(gp.name)}</p>
                      <p className="text-f1-gray text-xs">
                        {new Date(String(gp.date)).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                        {gp.has_sprint && <span className="ml-2 text-yellow-500">⚡ Sprint</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      {hasSelection && <span className="text-green-400 text-[10px] font-bold">✓ Selezione</span>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-f1-gray group-hover:text-f1-red transition-colors" />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
