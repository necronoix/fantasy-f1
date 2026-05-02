import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const leagueId = '43e9d40d-e92a-46f8-a760-7005b6a256a5'
  const userId = 'b48794fc-2e4c-4bbd-b5e8-f9ccd23b4f78'
  const admin = createAdminClient()
  const steps: string[] = []

  try {
    // Step 1: membership
    steps.push('1: getting membership')
    const { data: myMembership } = await admin
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single()
    steps.push(`1: ok - role=${myMembership?.role}`)

    // Step 2: GPs
    steps.push('2: getting GPs')
    const { data: gps } = await admin
      .from('grands_prix')
      .select('*')
      .eq('season_id', 2026)
      .order('round', { ascending: true })
    steps.push(`2: ok - ${gps?.length} GPs`)

    // Step 3: selections
    steps.push('3: getting selections')
    const { data: mySelections } = await admin
      .from('gp_selections')
      .select('gp_id, captain_driver_id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
    steps.push(`3: ok - ${mySelections?.length} selections`)

    // Step 4: league settings
    steps.push('4: getting league settings')
    const { data: leagueData } = await admin
      .from('leagues')
      .select('settings_json')
      .eq('id', leagueId)
      .single()
    const leagueSettings = (leagueData?.settings_json as Record<string, unknown>) ?? {}
    const liveSessions = (leagueSettings.live_sessions as Record<string, { is_active: boolean; is_final: boolean }>) ?? {}
    steps.push(`4: ok - live sessions: ${Object.keys(liveSessions).join(', ')}`)

    // Step 5: Try to simulate the rendering
    steps.push('5: simulating render loop')
    const selectedGpIds = new Set((mySelections ?? []).map(s => String((s as Record<string, unknown>).gp_id)))

    for (const gp of (gps ?? [])) {
      try {
        const gpId = String(gp.id)
        const hasSelection = selectedGpIds.has(gpId)
        const isCompleted = gp.status === 'completed'
        const liveSession = liveSessions[gpId] ?? null
        const hasActiveLive = liveSession?.is_active === true

        // Simulate date formatting that happens in render
        const dateStr = new Date(String(gp.date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()

        steps.push(`  ${gpId}: status=${gp.status}, sel=${hasSelection}, live=${hasActiveLive}, date=${dateStr}`)
      } catch (e: any) {
        steps.push(`  CRASH on ${gp.id}: ${e.message}`)
      }
    }

    // Step 6: Now simulate the GP detail page for mia_2026
    steps.push('6: simulating GP detail page for mia_2026')
    const { getGpWithSelection } = await import('@/app/actions/gp')
    try {
      const data = await getGpWithSelection(leagueId, 'mia_2026', userId)
      steps.push(`6: ok - gp=${data.gp?.id}, roster=${data.roster.length}, scores=${data.scores.length}`)

      // Check qualifying_datetime
      const qdt = (data.gp as any)?.qualifying_datetime
      steps.push(`6: qualifying_datetime=${qdt}`)

      // Check gp_results
      const { data: gpResult } = await admin
        .from('gp_results')
        .select('results_json')
        .eq('league_id', leagueId)
        .eq('gp_id', 'mia_2026')
        .maybeSingle()
      steps.push(`6: gp_results=${gpResult ? 'exists' : 'null'}`)

      // isPredictionLocked check
      const { isPredictionLocked } = await import('@/lib/utils')
      const gpDeadline = (leagueSettings.gp_deadlines as Record<string, string> ?? {})['mia_2026'] ?? null
      const locked = isPredictionLocked(qdt, gpDeadline)
      steps.push(`6: deadline=${gpDeadline}, locked=${locked}`)
    } catch (e: any) {
      steps.push(`6: CRASH - ${e.message}`)
      steps.push(`6: stack - ${e.stack?.split('\n').slice(0, 3).join(' | ')}`)
    }

    return NextResponse.json({ ok: true, steps })
  } catch (e: any) {
    return NextResponse.json({
      fatal: true,
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5),
      steps
    }, { status: 500 })
  }
}
