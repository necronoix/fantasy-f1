import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const leagueId = '43e9d40d-e92a-46f8-a760-7005b6a256a5'
  const admin = createAdminClient()
  const errors: string[] = []

  try {
    // Step 1: Get all GPs
    const { data: gps, error: gpsError } = await admin
      .from('grands_prix')
      .select('*')
      .eq('season_id', 2026)
      .order('round', { ascending: true })

    if (gpsError) errors.push(`gps: ${gpsError.message}`)

    // Step 2: Get league settings
    const { data: league, error: leagueError } = await admin
      .from('leagues')
      .select('settings_json')
      .eq('id', leagueId)
      .single()

    if (leagueError) errors.push(`league: ${leagueError.message}`)

    // Step 3: Get selections
    const { data: sels, error: selsError } = await admin
      .from('gp_selections')
      .select('gp_id, captain_driver_id')
      .eq('league_id', leagueId)

    if (selsError) errors.push(`selections: ${selsError.message}`)

    // Step 4: Get drivers
    const { data: drivers, error: driversError } = await admin
      .from('drivers')
      .select('*, team:teams(*)')
      .eq('season_id', 2026)
      .eq('active', true)
      .order('name')

    if (driversError) errors.push(`drivers: ${driversError.message}`)

    // Step 5: Get gp_results
    const { data: results, error: resultsError } = await admin
      .from('gp_results')
      .select('gp_id, results_json')
      .eq('league_id', leagueId)

    if (resultsError) errors.push(`results: ${resultsError.message}`)

    // Step 6: Get scores
    const { data: scores, error: scoresError } = await admin
      .from('gp_scores')
      .select('*, profile:profiles(display_name)')
      .eq('league_id', leagueId)

    if (scoresError) errors.push(`scores: ${scoresError.message}`)

    // Step 7: Try getLiveSessionWithScores for mia_2026
    const { getLiveSessionWithScores } = await import('@/app/actions/live-session')
    let liveData = null
    try {
      liveData = await getLiveSessionWithScores(leagueId, 'mia_2026')
    } catch (e: any) {
      errors.push(`live_mia: ${e.message}`)
    }

    const settings = (league?.settings_json as Record<string, unknown>) ?? {}
    const liveSessions = settings.live_sessions as Record<string, unknown> ?? {}

    return NextResponse.json({
      ok: errors.length === 0,
      errors,
      gps_count: gps?.length ?? 0,
      gps_statuses: (gps ?? []).map((g: any) => ({ id: g.id, status: g.status })),
      drivers_count: drivers?.length ?? 0,
      selections_count: sels?.length ?? 0,
      results_count: results?.length ?? 0,
      scores_count: scores?.length ?? 0,
      live_session_keys: Object.keys(liveSessions),
      live_mia: liveData ? 'ok' : 'null',
    })
  } catch (e: any) {
    return NextResponse.json({
      fatal: true,
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5)
    }, { status: 500 })
  }
}
