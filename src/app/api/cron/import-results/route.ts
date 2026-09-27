import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchOfficialResults, type DriverRow, type OfficialResults } from '@/lib/official-results'
import { saveGpResultsAndScores } from '@/lib/gp-results-service'

// Only recent races are auto-imported, so GPs a league deliberately left
// unscored (e.g. before it started) are never filled in behind its back.
const LOOKBACK_DAYS = 7
const SEASON = 2026

// Called daily by Vercel cron: imports official results for recent GPs that a
// league has not scored yet, then computes the scores.
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const { data: gps } = await admin
    .from('grands_prix')
    .select('id, name, date, country')
    .eq('season_id', SEASON)
    .gte('date', since)
    .lte('date', today)

  const { data: leagues } = await admin
    .from('leagues')
    .select('id, owner_user_id, settings_json')

  const { data: drivers } = await admin
    .from('drivers')
    .select('id, name, short_name, number')
    .eq('season_id', SEASON)
    .eq('active', true)

  const log: Array<Record<string, unknown>> = []

  for (const gp of gps ?? []) {
    let official: OfficialResults | null | undefined

    for (const league of leagues ?? []) {
      const settings = (league.settings_json as Record<string, unknown>) ?? {}
      const permanentLocks = (settings.permanently_locked_gps as Record<string, unknown>) ?? {}
      if (permanentLocks[gp.id]) {
        log.push({ gp: gp.id, league: league.id, skipped: 'bloccato permanentemente' })
        continue
      }

      const { data: existing } = await admin
        .from('gp_results')
        .select('id')
        .eq('league_id', league.id)
        .eq('gp_id', gp.id)
        .maybeSingle()
      if (existing) continue

      // Fetch lazily: most runs find nothing to import and make no API calls
      if (official === undefined) {
        official = await fetchOfficialResults(SEASON, gp, (drivers ?? []) as DriverRow[])
      }
      if (!official) {
        log.push({ gp: gp.id, skipped: 'GP non trovato nel calendario ufficiale' })
        break
      }
      if (!official.raceAvailable || !official.qualifyingAvailable) {
        log.push({ gp: gp.id, skipped: 'risultati non ancora pubblicati' })
        break
      }
      if (official.safetyCar === null) {
        log.push({ gp: gp.id, skipped: 'dato safety car non disponibile' })
        break
      }
      if (official.unmapped.length > 0) {
        log.push({ gp: gp.id, skipped: 'piloti non mappati', unmapped: official.unmapped })
        break
      }

      const saved = await saveGpResultsAndScores(
        league.id, gp.id, official.results, league.owner_user_id, 'gp_results_auto_imported'
      )
      log.push({ gp: gp.id, league: league.id, imported: !saved.error, error: saved.error })
    }
  }

  return NextResponse.json({ ok: true, ran_at: now.toISOString(), log })
}
