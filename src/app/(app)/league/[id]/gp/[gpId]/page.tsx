import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getGpWithSelection } from '@/app/actions/gp'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { GpSelectionForm } from '@/components/league/GpSelectionForm'
import { GpResultsForm } from '@/components/league/GpResultsForm'
import { GpHeader } from '@/components/f1/GpHeader'
import { Star, Trophy, Target, CheckCircle, XCircle } from 'lucide-react'
import { isPredictionLocked, formatDateTime } from '@/lib/utils'
import type { ScoreBreakdown, GpPredictions } from '@/lib/types'
import { LiveCountdown } from '@/components/league/AdminGpManager'
import { LiveSessionBanner } from '@/components/league/LiveSessionBanner'

interface Props { params: Promise<{ id: string; gpId: string }> }

export default async function GpPage({ params }: Props) {
 try {
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
  // Note: predictionsLocked will be recalculated after we fetch the admin deadline below
  let predictionsLocked = false

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

  // Get deadline for this GP
  const { data: leagueForDeadline } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', id)
    .single()
  const leagueSettings = (leagueForDeadline?.settings_json as Record<string, unknown>) ?? {}
  const gpDeadlines = (leagueSettings.gp_deadlines as Record<string, string>) ?? {}
  const gpDeadline = gpDeadlines[gpId] ?? null
  const isDeadlinePassed = gpDeadline ? new Date(gpDeadline) < new Date() : false

  // Now calculate predictions lock using admin deadline (10 min before) or qualifying time fallback
  predictionsLocked = isPredictionLocked(gp.qualifying_datetime, gpDeadline)

  // Check if there's a live session for this GP
  const liveSessions = (leagueSettings.live_sessions as Record<string, { is_active: boolean; is_final: boolean }>) ?? {}
  const liveSession = liveSessions[gpId] ?? null
  const hasLiveSession = liveSession !== null

  // Get GP results for prediction checking and admin edit
  const { data: gpResult } = await admin
    .from('gp_results')
    .select('results_json')
    .eq('league_id', id)
    .eq('gp_id', gpId)
    .maybeSingle()

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
      {/* Beautiful GP Header with circuit map */}
      <GpHeader
        gpId={gpId}
        round={Number(gp.round)}
        name={String(gp.name)}
        circuit={String(gp.circuit)}
        country={String(gp.country ?? '')}
        date={String(gp.date)}
        status={String(gp.status)}
        isCompleted={isCompleted}
      />

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      {/* Live countdown if deadline is set and GP not completed */}
      {gpDeadline && !isCompleted && (
        <LiveCountdown deadline={gpDeadline} />
      )}

      {/* Live Session Banner */}
      {!isCompleted && (
        <LiveSessionBanner
          leagueId={id}
          gpId={gpId}
          gpName={String(gp.name)}
          gpRound={Number(gp.round)}
          session={liveSession}
          isAdmin={isAdmin}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Captain & Predictions */}
        {!isCompleted && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Capitano e Scommesse
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {selection?.captain_driver_id && (
                  <Badge variant="green">Salvato</Badge>
                )}
                {predictionsLocked && (
                  <Badge variant="red">Bloccato</Badge>
                )}
              </div>
            </CardHeader>
            {predictionsLocked ? (
              <div className="text-center py-4">
                <p className="text-f1-gray text-sm">Selezioni bloccate — tempo scaduto</p>
                {selection?.captain_driver_id && (
                  <p className="text-yellow-400 text-xs mt-2">
                    Capitano: {driverMap.get(String(selection.captain_driver_id)) ?? String(selection.captain_driver_id)}
                  </p>
                )}
              </div>
            ) : roster.length === 0 ? (
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
              />
            )}
          </Card>
        )}

        {/* Scores (if completed) - Podium-style */}
        {isCompleted && scores.length > 0 && (
          <Card className="md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]" />
                <span>Punteggi GP</span>
              </CardTitle>
            </CardHeader>
            <div className="space-y-1.5 mt-4">
              {scores.map((score, i) => {
                const profile = (score as Record<string, unknown>).profile as Record<string, unknown>
                const isMe = (score as Record<string, unknown>).user_id === user.id
                const breakdown = (score as Record<string, unknown>).breakdown_json as ScoreBreakdown
                const predPts = breakdown?.predictions_pts ?? 0
                const rosterPts = breakdown?.drivers?.reduce((sum, d) => sum + d.subtotal, 0) ?? 0
                const totalScore = Number((score as Record<string, unknown>).total_points ?? 0)

                let rowBg = 'bg-f1-gray-dark/30 border-l-4 border-white/20'
                let rowGlow = ''

                if (i === 0) {
                  rowBg = 'bg-gradient-to-r from-yellow-500/15 via-yellow-600/10 to-transparent border-l-4 border-yellow-400/60'
                  rowGlow = 'shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                } else if (i === 1) {
                  rowBg = 'bg-gradient-to-r from-gray-400/15 via-gray-500/10 to-transparent border-l-4 border-gray-400/60'
                  rowGlow = 'shadow-[0_0_20px_rgba(156,163,175,0.15)]'
                } else if (i === 2) {
                  rowBg = 'bg-gradient-to-r from-amber-600/15 via-amber-700/10 to-transparent border-l-4 border-amber-500/60'
                  rowGlow = 'shadow-[0_0_20px_rgba(217,119,6,0.15)]'
                }

                if (isMe) {
                  rowBg = 'bg-gradient-to-r from-f1-red/20 via-f1-red/10 to-transparent border-l-4 border-f1-red/80'
                  rowGlow = 'shadow-[0_0_25px_rgba(232,0,45,0.25)]'
                }

                return (
                  <div
                    key={String((score as Record<string, unknown>).id)}
                    className={`relative p-4 rounded-lg backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${rowBg} ${rowGlow}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Medal/Position */}
                        <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                          {i < 3 && (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-60" />
                          )}
                          <span className="text-4xl font-black drop-shadow-lg">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-2xl text-f1-gray-light font-black">{i + 1}</span>}
                          </span>
                        </div>

                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white text-lg leading-tight">
                            {String(profile?.display_name ?? 'Unknown')}
                            {isMe && <span className="text-f1-red text-xs ml-2 font-bold tracking-wider">YOU</span>}
                          </p>
                          {(predPts > 0 || rosterPts > 0) && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {rosterPts > 0 && (
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/40 font-semibold">
                                  {rosterPts} drivers
                                </span>
                              )}
                              {predPts > 0 && (
                                <span className="text-xs bg-green-500/20 text-green-300 px-2.5 py-1 rounded-full border border-green-500/40 font-semibold">
                                  +{predPts} pred
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score display - prominent */}
                      <div className="flex-shrink-0 ml-4">
                        <div className="bg-gradient-to-br from-f1-red/80 to-f1-red/60 rounded-lg px-5 py-2.5 border border-f1-red/50 shadow-[0_0_15px_rgba(232,0,45,0.4)]">
                          <p className="text-white font-black text-2xl drop-shadow-lg">{totalScore}</p>
                          <p className="text-f1-gray text-xs uppercase tracking-widest font-bold">pts</p>
                        </div>
                      </div>
                    </div>

                    {/* Score breakdown bar */}
                    {(predPts > 0 || rosterPts > 0) && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="space-y-2">
                          {rosterPts > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-f1-gray-light text-xs uppercase font-bold tracking-wider">Driver Points</span>
                                <span className="text-blue-300 font-bold text-xs">{rosterPts}pt</span>
                              </div>
                              <div className="h-2.5 bg-f1-gray-dark/80 rounded-full overflow-hidden border border-blue-500/30">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                  style={{ width: `${(rosterPts / totalScore) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {predPts > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-f1-gray-light text-xs uppercase font-bold tracking-wider">Prediction Bonus</span>
                                <span className="text-green-300 font-bold text-xs">{predPts}pt</span>
                              </div>
                              <div className="h-2.5 bg-f1-gray-dark/80 rounded-full overflow-hidden border border-green-500/30">
                                <div
                                  className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                  style={{ width: `${(predPts / totalScore) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Predictions reveal (if completed) */}
        {isCompleted && allSelections.length > 0 && resultsJson && (
          <Card className="md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-f1-red/40 via-white/10 to-transparent" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="w-6 h-6 text-f1-red drop-shadow-[0_0_8px_rgba(232,0,45,0.4)]" />
                <span>Scommesse — Risultati</span>
              </CardTitle>
            </CardHeader>

            {/* Actual outcomes - F1 broadcast style */}
            <div className="mb-5 p-4 bg-gradient-to-br from-f1-red/15 via-f1-red/5 to-transparent rounded-xl border border-f1-red/40 shadow-[0_0_15px_rgba(232,0,45,0.1)] mt-4">
              <p className="text-xs font-black text-f1-red uppercase tracking-widest mb-4 flex items-center gap-2 drop-shadow-sm">
                <span className="text-lg">🎯</span>
                Risultati effettivi
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {/* Pole */}
                <div className="p-3.5 rounded-lg bg-yellow-500/10 border border-yellow-500/40 group hover:border-yellow-400/60 hover:bg-yellow-400/15 hover:shadow-[0_0_12px_rgba(250,204,21,0.2)] transition-all">
                  <p className="text-yellow-300/80 text-[10px] uppercase tracking-widest font-bold mb-1.5">🏎 Pole</p>
                  <p className="text-white font-bold truncate text-sm">
                    {actualPole ? (driverMap.get(actualPole) ?? actualPole) : '—'}
                  </p>
                </div>

                {/* Winner */}
                <div className="p-3.5 rounded-lg bg-f1-red/10 border border-f1-red/40 group hover:border-f1-red/60 hover:bg-f1-red/15 hover:shadow-[0_0_12px_rgba(232,0,45,0.2)] transition-all">
                  <p className="text-f1-red/80 text-[10px] uppercase tracking-widest font-bold mb-1.5">🏆 Vincitore</p>
                  <p className="text-white font-bold truncate text-sm">
                    {actualWinner ? (driverMap.get(actualWinner) ?? actualWinner) : '—'}
                  </p>
                </div>

                {/* Fastest Lap */}
                <div className="p-3.5 rounded-lg bg-purple-500/10 border border-purple-500/40 group hover:border-purple-400/60 hover:bg-purple-400/15 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-all">
                  <p className="text-purple-300/80 text-[10px] uppercase tracking-widest font-bold mb-1.5">⚡ Giro veloce</p>
                  <p className="text-white font-bold truncate text-sm">
                    {actualFastestLap ? (driverMap.get(actualFastestLap) ?? actualFastestLap) : '—'}
                  </p>
                </div>

                {/* Safety Car */}
                <div className="p-3.5 rounded-lg bg-white/5 border border-white/15 group hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all">
                  <p className="text-f1-gray-light text-[10px] uppercase tracking-widest font-bold mb-1.5">🚗 Safety Car</p>
                  <p className={`font-black text-lg ${actualSafetyCar ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]' : 'text-f1-gray'}`}>
                    {actualSafetyCar ? '✓' : '✗'}
                  </p>
                </div>

                {/* Podium */}
                {actualPodium && actualPodium.length > 0 && (
                  <div className="md:col-span-2 p-3.5 rounded-lg bg-gradient-to-r from-yellow-500/15 to-yellow-600/5 border border-yellow-500/40 group hover:border-yellow-400/60 hover:shadow-[0_0_15px_rgba(250,204,21,0.15)] transition-all">
                    <p className="text-yellow-300/80 text-[10px] uppercase tracking-widest font-bold mb-2">🥇🥈🥉 Podium</p>
                    <p className="text-white font-bold text-sm">
                      {actualPodium.map((id, idx) => (
                        <span key={id} className="inline-block">
                          {idx > 0 ? ' • ' : ''}
                          {driverMap.get(id) ?? id}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Each player's predictions */}
            <div className="space-y-2.5 mt-5">
              {allSelections.map((sel) => {
                const profile = (sel as Record<string, unknown>).profile as Record<string, unknown>
                const preds = (sel as Record<string, unknown>).predictions_json as GpPredictions
                const captainId = String((sel as Record<string, unknown>).captain_driver_id ?? '')
                const isMe = (sel as Record<string, unknown>).user_id === user.id

                const checkPole = preds?.pole_driver_id
                  ? preds.pole_driver_id === actualPole : null
                const checkWinner = preds?.winner_driver_id
                  ? preds.winner_driver_id === actualWinner : null
                const checkFL = preds?.fastest_lap_driver_id
                  ? preds.fastest_lap_driver_id === actualFastestLap : null
                const checkSC = preds?.safety_car !== undefined && actualSafetyCar !== null
                  ? preds.safety_car === actualSafetyCar : null

                const PredRow = ({ label, driverId, correct, icon }: { label: string; driverId?: string; correct: boolean | null; icon: string }) => {
                  if (!driverId) return null
                  return (
                    <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border transition-all ${
                      correct === true ? 'bg-green-500/15 border-green-500/40 shadow-[0_0_8px_rgba(74,222,128,0.15)]' :
                      correct === false ? 'bg-red-500/15 border-red-500/40 shadow-[0_0_8px_rgba(248,113,113,0.15)]' :
                      'bg-white/3 border-white/10 hover:border-white/20'
                    }`}>
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <span className="text-f1-gray-light font-medium min-w-12">{label}</span>
                      <span className={`font-bold truncate flex-1 ${
                        correct === true ? 'text-green-300 drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]' :
                        correct === false ? 'text-red-300 drop-shadow-[0_0_4px_rgba(248,113,113,0.4)]' :
                        'text-white'
                      }`}>
                        {driverMap.get(driverId) ?? driverId}
                      </span>
                      {correct === true && <span className="text-green-400 font-black text-sm flex-shrink-0">✓</span>}
                      {correct === false && <span className="text-red-400 font-black text-sm flex-shrink-0">✗</span>}
                    </div>
                  )
                }

                return (
                  <div
                    key={String((sel as Record<string, unknown>).id)}
                    className={`p-4 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
                      isMe
                        ? 'border-f1-red/50 bg-f1-red/15 shadow-[0_0_20px_rgba(232,0,45,0.2)]'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                      <span className={`font-black text-sm ${isMe ? 'text-f1-red drop-shadow-[0_0_4px_rgba(232,0,45,0.3)]' : 'text-white'}`}>
                        {String(profile?.display_name ?? 'Unknown')}
                        {isMe && <span className="text-f1-red ml-2 text-xs font-bold tracking-wider">(YOU)</span>}
                      </span>
                      {captainId && (
                        <span className="text-yellow-300 text-xs flex items-center gap-1.5 bg-yellow-500/20 px-2.5 py-1.5 rounded-full border border-yellow-500/50 font-bold drop-shadow-[0_0_4px_rgba(255,215,0,0.2)]">
                          <Star className="w-3.5 h-3.5 fill-yellow-300" />
                          {driverMap.get(captainId) ?? captainId}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <PredRow label="Pole" driverId={preds?.pole_driver_id} correct={checkPole} icon="🏎" />
                      <PredRow label="Winner" driverId={preds?.winner_driver_id} correct={checkWinner} icon="🏆" />
                      <PredRow label="Fastest Lap" driverId={preds?.fastest_lap_driver_id} correct={checkFL} icon="⚡" />
                      {preds?.safety_car !== undefined && (
                        <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border transition-all ${
                          checkSC === true ? 'bg-green-500/15 border-green-500/40 shadow-[0_0_8px_rgba(74,222,128,0.15)]' :
                          checkSC === false ? 'bg-red-500/15 border-red-500/40 shadow-[0_0_8px_rgba(248,113,113,0.15)]' :
                          'bg-white/3 border-white/10'
                        }`}>
                          <span className="text-lg flex-shrink-0">🚗</span>
                          <span className="text-f1-gray-light font-medium">SC</span>
                          <span className={`font-bold flex-1 ${
                            checkSC === true ? 'text-green-300 drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]' :
                            checkSC === false ? 'text-red-300 drop-shadow-[0_0_4px_rgba(248,113,113,0.4)]' :
                            'text-white'
                          }`}>
                            {preds.safety_car ? 'Yes' : 'No'}
                          </span>
                          {checkSC === true && <span className="text-green-400 font-black text-sm flex-shrink-0">✓</span>}
                          {checkSC === false && <span className="text-red-400 font-black text-sm flex-shrink-0">✗</span>}
                        </div>
                      )}
                      {preds?.podium_driver_ids && preds.podium_driver_ids.length > 0 && (
                        <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/40">
                          <span className="text-lg flex-shrink-0">🥇</span>
                          <span className="text-f1-gray-light font-medium min-w-12">Podium</span>
                          <span className="text-yellow-200 flex-1 font-semibold">
                            {preds.podium_driver_ids.map((id, idx) => {
                              const correct = actualPodium?.includes(id)
                              return (
                                <span
                                  key={id}
                                  className={correct ? 'text-green-300 font-bold drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]' : 'text-yellow-200'}
                                >
                                  {idx > 0 ? ', ' : ''}{driverMap.get(id) ?? id}
                                </span>
                              )
                            })}
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
        {isAdmin && (
          <Card className="md:col-span-2 relative overflow-hidden border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 via-yellow-600/5 to-transparent shadow-[0_0_20px_rgba(250,204,21,0.1)]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-2xl">👑</span>
                <span className="text-yellow-300 drop-shadow-[0_0_4px_rgba(255,215,0,0.3)]">
                  {isCompleted ? 'Modifica Risultati' : 'Inserisci Risultati'}
                </span>
              </CardTitle>
              <p className="text-yellow-300/70 text-xs uppercase tracking-widest font-semibold mt-2">Admin only</p>
            </CardHeader>
            <GpResultsForm
              leagueId={id}
              gpId={gpId}
              allDrivers={(allDrivers ?? []) as Record<string, unknown>[]}
              existingResults={resultsJson}
              isCompleted={isCompleted}
            />
          </Card>
        )}
      </div>
    </div>
  )
 } catch (e: unknown) {
   const msg = e instanceof Error ? e.message : String(e)
   const stack = e instanceof Error ? e.stack?.split('\n').slice(0, 5).join('\n') : ''
   return (
     <div className="p-8 space-y-4">
       <h1 className="text-xl font-black text-red-400">DEBUG: Errore GP Detail Page</h1>
       <pre className="text-xs text-white bg-red-900/30 p-4 rounded-lg overflow-auto whitespace-pre-wrap">{msg}</pre>
       <pre className="text-xs text-f1-gray bg-f1-gray-dark p-4 rounded-lg overflow-auto whitespace-pre-wrap">{stack}</pre>
     </div>
   )
 }
}
