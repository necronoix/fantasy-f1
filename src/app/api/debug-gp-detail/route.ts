import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isPredictionLocked } from '@/lib/utils'
import type { ScoreBreakdown, GpPredictions } from '@/lib/types'

export async function GET() {
  const leagueId = '43e9d40d-e92a-46f8-a760-7005b6a256a5'
  const userId = 'b48794fc-2e4c-4bbd-b5e8-f9ccd23b4f78'
  const gpId = 'mia_2026'
  const admin = createAdminClient()
  const steps: string[] = []
  const warnings: string[] = []

  try {
    // Step 1: Membership
    steps.push('1: membership check')
    const { data: myMembership } = await admin
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single()
    steps.push(`1: OK - role=${myMembership?.role}`)

    // Step 2: getGpWithSelection
    steps.push('2: getGpWithSelection')
    const { getGpWithSelection } = await import('@/app/actions/gp')
    const data = await getGpWithSelection(leagueId, gpId, userId)
    steps.push(`2: OK - gp=${data.gp?.id}, roster=${data.roster.length}, scores=${data.scores.length}, allSelections=${data.allSelections.length}`)

    const { gp, selection, roster, scores, allSelections } = data

    // Step 3: Check gp fields
    steps.push('3: checking gp fields')
    const gpFields = gp as Record<string, unknown>
    for (const key of ['id', 'name', 'circuit', 'country', 'date', 'status', 'round', 'qualifying_datetime']) {
      const val = gpFields[key]
      const type = val === null ? 'null' : val === undefined ? 'undefined' : typeof val
      steps.push(`  gp.${key} = ${type}: ${JSON.stringify(val)?.substring(0, 50)}`)
      if (val === undefined) warnings.push(`gp.${key} is undefined`)
    }

    // Step 4: Date formatting (same as GpHeader)
    steps.push('4: date formatting')
    try {
      const dateStr = String(gpFields.date)
      const d = new Date(dateStr)
      const formatted = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
      steps.push(`4: OK - "${dateStr}" → "${formatted}"`)
    } catch (e: any) {
      steps.push(`4: CRASH - ${e.message}`)
      warnings.push(`Date formatting failed: ${e.message}`)
    }

    // Step 5: isPredictionLocked
    steps.push('5: prediction lock')
    const { data: leagueForDeadline } = await admin
      .from('leagues')
      .select('settings_json')
      .eq('id', leagueId)
      .single()
    const leagueSettings = (leagueForDeadline?.settings_json as Record<string, unknown>) ?? {}
    const gpDeadlines = (leagueSettings.gp_deadlines as Record<string, string>) ?? {}
    const gpDeadline = gpDeadlines[gpId] ?? null
    const locked = isPredictionLocked(gpFields.qualifying_datetime as string, gpDeadline)
    steps.push(`5: OK - deadline=${gpDeadline}, locked=${locked}`)

    // Step 6: Live sessions
    steps.push('6: live sessions')
    const liveSessions = (leagueSettings.live_sessions as Record<string, { is_active: boolean; is_final: boolean }>) ?? {}
    const liveSession = liveSessions[gpId] ?? null
    steps.push(`6: OK - session=${JSON.stringify(liveSession)}`)

    // Step 7: GP results
    steps.push('7: gp results')
    const { data: gpResult } = await admin
      .from('gp_results')
      .select('results_json')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .maybeSingle()
    const resultsJson = gpResult?.results_json as Record<string, unknown> | null
    steps.push(`7: OK - results=${resultsJson ? 'exists' : 'null'}`)

    // Step 8: All drivers
    steps.push('8: all drivers')
    const { data: allDrivers } = await admin
      .from('drivers')
      .select('*, team:teams(*)')
      .eq('season_id', 2026)
      .eq('active', true)
      .order('name')
    steps.push(`8: OK - ${allDrivers?.length} drivers`)

    // Step 9: Simulate score rendering
    steps.push('9: score rendering')
    const isCompleted = gpFields.status === 'completed'
    steps.push(`9: isCompleted=${isCompleted}, scores.length=${scores.length}`)
    if (isCompleted && scores.length > 0) {
      for (const score of scores) {
        try {
          const s = score as Record<string, unknown>
          const profile = s.profile as Record<string, unknown>
          const breakdown = s.breakdown_json as ScoreBreakdown | null | undefined
          const predPts = breakdown?.predictions_pts ?? 0
          const drivers = breakdown?.drivers
          const rosterPts = (drivers && Array.isArray(drivers))
            ? drivers.reduce((sum, d) => sum + (d?.subtotal ?? 0), 0)
            : 0
          const totalScore = Number(s.total_points ?? 0)
          steps.push(`  score: user=${s.user_id}, profile=${profile?.display_name}, total=${totalScore}, roster=${rosterPts}, pred=${predPts}`)

          // Check for zero division in width calc
          if (totalScore === 0 && (rosterPts > 0 || predPts > 0)) {
            warnings.push(`Score ${s.user_id}: totalScore=0 but has rosterPts=${rosterPts} or predPts=${predPts} — would cause division by zero in width %`)
          }
        } catch (e: any) {
          steps.push(`  score CRASH: ${e.message}`)
          warnings.push(`Score rendering crash: ${e.message}`)
        }
      }
    }

    // Step 10: Simulate selections rendering
    steps.push('10: selections rendering')
    if (isCompleted && allSelections.length > 0 && resultsJson) {
      for (const sel of allSelections) {
        try {
          const s = sel as Record<string, unknown>
          const profile = s.profile as Record<string, unknown>
          const preds = (s.predictions_json as GpPredictions | null | undefined) ?? {}
          const captainId = String(s.captain_driver_id ?? '')
          steps.push(`  sel: user=${s.user_id}, profile=${profile?.display_name}, captain=${captainId}, preds=${JSON.stringify(preds)?.substring(0, 100)}`)

          // Test safety_car access
          if (preds.safety_car !== undefined) {
            steps.push(`    safety_car=${preds.safety_car}`)
          }
          if (preds.podium_driver_ids) {
            steps.push(`    podium=${JSON.stringify(preds.podium_driver_ids)}`)
          }
        } catch (e: any) {
          steps.push(`  sel CRASH: ${e.message}`)
          warnings.push(`Selection rendering crash: ${e.message}`)
        }
      }
    }

    // Step 11: Simulate GpSelectionForm props
    steps.push('11: form props check')
    if (!isCompleted) {
      steps.push(`  roster for form: ${roster.length} items`)
      for (const r of roster) {
        const rr = r as Record<string, unknown>
        steps.push(`    driver_id=${rr.driver_id}, driver=${JSON.stringify(rr.driver)?.substring(0, 80)}`)
      }
      steps.push(`  selection for form: ${JSON.stringify(selection)?.substring(0, 200)}`)
    }

    // Step 12: Check for non-serializable values in props
    steps.push('12: serialization check')
    try {
      // Test that all props that go to client components are serializable
      const testProps = {
        leagueId,
        gpId,
        gpName: String(gpFields.name),
        gpRound: Number(gpFields.round),
        session: liveSession,
        isAdmin: myMembership?.role === 'admin',
        roster: roster as Record<string, unknown>[],
        selection: selection as Record<string, unknown> | null,
        allDrivers: (allDrivers ?? []) as Record<string, unknown>[],
        existingResults: resultsJson,
        isCompleted,
        gpDeadline,
      }
      const serialized = JSON.stringify(testProps)
      steps.push(`12: OK - serialized ${serialized.length} chars`)
    } catch (e: any) {
      steps.push(`12: SERIALIZATION CRASH - ${e.message}`)
      warnings.push(`Props not serializable: ${e.message}`)
    }

    return NextResponse.json({
      ok: warnings.length === 0,
      warnings,
      steps,
    })
  } catch (e: any) {
    return NextResponse.json({
      fatal: true,
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 8),
      steps,
      warnings,
    }, { status: 500 })
  }
}
