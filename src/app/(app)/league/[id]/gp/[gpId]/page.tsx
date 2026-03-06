import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getGpWithSelection } from '@/app/actions/gp'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { GpSelectionForm } from '@/components/league/GpSelectionForm'
import { GpResultsForm } from '@/components/league/GpResultsForm'
import { CalendarDays, Star, Trophy } from 'lucide-react'

interface Props { params: Promise<{ id: string; gpId: string }> }

export default async function GpPage({ params }: Props) {
  const { id, gpId } = await params
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
  if (!myMembership) notFound()

  const data = await getGpWithSelection(id, gpId, user.id)
  if (!data?.gp) notFound()

  const { gp, selection, roster, scores } = data
  const isAdmin = myMembership.role === 'admin'
  const isCompleted = gp.status === 'completed'

  // Get all drivers for predictions
  const { data: allDrivers } = await admin
    .from('drivers')
    .select('*, team:teams(*)')
    .eq('season_id', 2026)
    .eq('active', true)
    .order('name')

  return (
    <div className="space-y-5">
      {/* GP Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-f1-red font-black text-3xl">R{gp.round}</span>
          <div>
            <h1 className="text-2xl font-black leading-tight">{gp.name}</h1>
            <p className="text-f1-gray text-sm">{gp.circuit}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isCompleted ? 'green' : 'default'}>
            {isCompleted ? 'Completato' : gp.status}
          </Badge>
          {gp.has_sprint && <Badge variant="yellow">Sprint ⚡</Badge>}
          <span className="text-f1-gray text-xs flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {new Date(gp.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Captain & Predictions */}
        {!isCompleted && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Capitano e Pronostici
                </span>
              </CardTitle>
              {selection?.captain_driver_id && (
                <Badge variant="green">Salvato</Badge>
              )}
            </CardHeader>
            {roster.length === 0 ? (
              <p className="text-f1-gray text-sm text-center py-4">
                Non hai piloti in rosa. Partecipa all&apos;asta prima!
              </p>
            ) : (
              <GpSelectionForm
                leagueId={id}
                gpId={gpId}
                roster={roster as Record<string, unknown>[]}
                selection={selection as Record<string, unknown> | null}
                allDrivers={(allDrivers ?? []) as Record<string, unknown>[]}
                hasSprintRace={gp.has_sprint}
              />
            )}
          </Card>
        )}

        {/* Scores (if completed) */}
        {isCompleted && scores.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Punteggi GP
                </span>
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {scores.map((score, i) => {
                const profile = (score as Record<string, unknown>).profile as Record<string, unknown>
                const isMe = (score as Record<string, unknown>).user_id === user.id
                return (
                  <div key={String((score as Record<string, unknown>).id)}
                    className={`flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-f1-red/10 border border-f1-red/30' : 'bg-f1-gray-dark'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-black w-7 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-f1-gray-light'}`}>
                        {i + 1}
                      </span>
                      <span className="font-semibold text-white">
                        {String(profile?.display_name ?? 'Unknown')}
                        {isMe && <span className="text-f1-red text-xs ml-1">(tu)</span>}
                      </span>
                    </div>
                    <span className="text-white font-black text-lg">
                      {Number((score as Record<string, unknown>).total_points ?? 0)} pt
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Admin: submit results */}
        {isAdmin && !isCompleted && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Inserisci Risultati (Admin)</CardTitle>
            </CardHeader>
            <GpResultsForm
              leagueId={id}
              gpId={gpId}
              allDrivers={(allDrivers ?? []) as Record<string, unknown>[]}
              hasSprintRace={gp.has_sprint}
            />
          </Card>
        )}
      </div>
    </div>
  )
}
