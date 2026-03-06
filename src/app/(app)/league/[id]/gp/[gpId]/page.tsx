import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getGpWithSelection } from '@/app/actions/gp'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { GpSelectionForm } from '@/components/league/GpSelectionForm'
import { GpResultsForm } from '@/components/league/GpResultsForm'
import { CalendarDays, Star, Trophy, Target, CheckCircle, XCircle } from 'lucide-react'
import type { ScoreBreakdown, GpPredictions } from '@/lib/types'

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

  const { gp, selection, roster, scores, allSelections } = data
  const isAdmin = myMembership.role === 'admin'
  const isCompleted = gp.status === 'completed'

  // Get all drivers for predictions
  const { data: allDrivers } = await admin
    .from('drivers')
    .select('*, team:teams(*)')
    .eq('season_id', 2026)
    .eq('active', true)
    .order('name')

  // Build driver lookup map
  const driverMap = new Map<string, string>()
  for (const d of allDrivers ?? []) {
    driverMap.set(String(d.id), String(d.short_name ?? d.id))
  }

  // Get GP results for prediction checking
  const { data: gpResult } = isCompleted ? await admin
    .from('gp_results')
    .select('results_json')
    .eq('league_id', id)
    .eq('gp_id', gpId)
    .maybeSingle() : { data: null }

  const resultsJson = gpResult?.results_json as Record<string, unknown> | null

  // Determine actual outcomes for prediction checking
  const actualPole = resultsJson
    ? (resultsJson.qualifying_order as Array<{driver_id: string; position: number}>)?.find(q => q.position === 1)?.driver_id
    : null
  const actualWinner = resultsJson
    ? (resultsJson.race_order as Array<{driver_id: string; position: number; dsq?: boolean; dnf?: boolean}>)?.find(r => r.position === 1 && !r.dsq && !r.dnf)?.driver_id
    : null
  const actualFastestLap = resultsJson
    ? (resultsJson.race_order as Array<{driver_id: string; fastest_lap?: boolean}>)?.find(r => r.fastest_lap)?.driver_id
    : null
  const actualPodium = resultsJson
    ? (resultsJson.race_order as Array<{driver_id: string; position: number; dsq?: boolean; dnf?: boolean}>)
        ?.filter(r => r.position <= 3 && !r.dsq && !r.dnf)
        .map(r => r.driver_id)
    : null
  const actualSafetyCar = resultsJson ? Boolean(resultsJson.safety_car) : null

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
        {/* Captain & Predictions (before race) */}
        {!isCompleted && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Capitano e Scommesse
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
                const breakdown = (score as Record<string, unknown>).breakdown_json as ScoreBreakdown
                const predPts = breakdown?.predictions_pts ?? 0
                return (
                  <div key={String((score as Record<string, unknown>).id)}
                    className={`flex items-center justify-between p-3 rounded-lg ${isMe ? 'bg-f1-red/10 border border-f1-red/30' : 'bg-f1-gray-dark'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl font-black w-7 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-f1-gray-light'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-white">
                          {String(profile?.display_name ?? 'Unknown')}
                          {isMe && <span className="text-f1-red text-xs ml-1">(tu)</span>}
                        </span>
                        {predPts > 0 && (
                          <p className="text-green-400 text-xs">+{predPts} pt scommesse</p>
                        )}
                      </div>
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

        {/* Predictions reveal (if completed) */}
        {isCompleted && allSelections.length > 0 && resultsJson && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-f1-red" />
                  Scommesse — Risultati
                </span>
              </CardTitle>
            </CardHeader>

            {/* Actual outcomes */}
            <div className="mb-4 p-3 bg-f1-gray-dark rounded-xl">
              <p className="text-xs font-bold text-f1-gray-light uppercase tracking-wider mb-2">Risultati effettivi</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-f1-gray">Pole: </span><span className="text-white font-bold">{actualPole ? (driverMap.get(actualPole) ?? actualPole) : '—'}</span></div>
                <div><span className="text-f1-gray">Vincitore: </span><span className="text-white font-bold">{actualWinner ? (driverMap.get(actualWinner) ?? actualWinner) : '—'}</span></div>
                <div><span className="text-f1-gray">Giro veloce: </span><span className="text-white font-bold">{actualFastestLap ? (driverMap.get(actualFastestLap) ?? actualFastestLap) : '—'}</span></div>
                <div><span className="text-f1-gray">Safety Car: </span><span className={`font-bold ${actualSafetyCar ? 'text-yellow-400' : 'text-f1-gray-light'}`}>{actualSafetyCar ? 'Sì' : 'No'}</span></div>
                {actualPodium && actualPodium.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-f1-gray">Podio: </span>
                    <span className="text-white font-bold">{actualPodium.map(id => driverMap.get(id) ?? id).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Each player's predictions */}
            <div className="space-y-3">
              {allSelections.map((sel) => {
                const profile = (sel as Record<string, unknown>).profile as Record<string, unknown>
                const preds = (sel as Record<string, unknown>).predictions_json as GpPredictions
                const captainId = String((sel as Record<string, unknown>).captain_driver_id ?? '')
                const isMe = (sel as Record<string, unknown>).user_id === user.id

                const checkPole = preds?.pole_driver_id
                  ? preds.pole_driver_id === actualPole
                  : null
                const checkWinner = preds?.winner_driver_id
                  ? preds.winner_driver_id === actualWinner
                  : null
                const checkFL = preds?.fastest_lap_driver_id
                  ? preds.fastest_lap_driver_id === actualFastestLap
                  : null
                const checkSC = preds?.safety_car !== undefined && actualSafetyCar !== null
                  ? preds.safety_car === actualSafetyCar
                  : null

                const PredRow = ({ label, driverId, correct }: { label: string; driverId?: string; correct: boolean | null }) => {
                  if (!driverId) return null
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      {correct === true && <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                      {correct === false && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      {correct === null && <div className="w-3.5 h-3.5 rounded-full border border-f1-gray flex-shrink-0" />}
                      <span className="text-f1-gray">{label}: </span>
                      <span className={correct === true ? 'text-green-400 font-bold' : 'text-f1-gray-light'}>
                        {driverMap.get(driverId) ?? driverId}
                      </span>
                    </div>
                  )
                }

                return (
                  <div key={String((sel as Record<string, unknown>).id)}
                    className={`p-3 rounded-xl border ${isMe ? 'border-f1-red/40 bg-f1-red/5' : 'border-f1-gray-dark bg-f1-black-light'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">
                        {String(profile?.display_name ?? 'Unknown')}
                        {isMe && <span className="text-f1-red ml-1 text-xs">(tu)</span>}
                      </span>
                      {captainId && (
                        <span className="text-yellow-400 text-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          {driverMap.get(captainId) ?? captainId}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <PredRow label="Pole" driverId={preds?.pole_driver_id} correct={checkPole} />
                      <PredRow label="Vincitore" driverId={preds?.winner_driver_id} correct={checkWinner} />
                      <PredRow label="Giro veloce" driverId={preds?.fastest_lap_driver_id} correct={checkFL} />
                      {preds?.safety_car !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                          {checkSC === true && <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                          {checkSC === false && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                          {checkSC === null && <div className="w-3.5 h-3.5 rounded-full border border-f1-gray flex-shrink-0" />}
                          <span className="text-f1-gray">Safety Car: </span>
                          <span className={checkSC === true ? 'text-green-400 font-bold' : 'text-f1-gray-light'}>
                            {preds.safety_car ? 'Sì' : 'No'}
                          </span>
                        </div>
                      )}
                      {preds?.podium_driver_ids && preds.podium_driver_ids.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-f1-gray">Podio: </span>
                          <span className="text-f1-gray-light">
                            {preds.podium_driver_ids.map(id => {
                              const correct = actualPodium?.includes(id)
                              return (
                                <span key={id} className={correct ? 'text-green-400 font-bold' : ''}>
                                  {driverMap.get(id) ?? id}
                                </span>
                              )
                            }).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr] as React.ReactNode[], [] as React.ReactNode[])}
                          </span>
                        </div>
                      )}
                    </div>
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
