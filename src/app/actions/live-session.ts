'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeGpScore, computeTeamScore } from '@/lib/scoring'
import type { GpResultsData, GpPredictions, ScoringRulesData } from '@/lib/types'

/* ── Types ── */
export interface LiveQualifyingEntry {
  driver_id: string
  position: number
  q1_time?: string
  q2_time?: string
  q3_time?: string
}

export interface LiveSessionData {
  session_type: 'qualifying' | 'race' | 'sprint'
  is_active: boolean
  is_final: boolean
  qualifying_order: LiveQualifyingEntry[]
  source: 'admin' | 'api' | 'admin_override'
  updated_at: string
  started_at: string
}

/* ── Start / Stop live session ── */
export async function startLiveSession(
  leagueId: string,
  gpId: string,
  sessionType: 'qualifying' | 'race' | 'sprint'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = { ...((settings.live_sessions as Record<string, LiveSessionData>) ?? {}) }

  liveSessions[gpId] = {
    session_type: sessionType,
    is_active: true,
    is_final: false,
    qualifying_order: [],
    source: 'admin',
    updated_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
  }

  await admin
    .from('leagues')
    .update({ settings_json: { ...settings, live_sessions: liveSessions } })
    .eq('id', leagueId)

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'live_session_started',
    details_json: { gp_id: gpId, session_type: sessionType },
  })

  revalidatePath(`/league/${leagueId}/gp/${gpId}/live`)
  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  return { success: true }
}

export async function stopLiveSession(leagueId: string, gpId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = { ...((settings.live_sessions as Record<string, LiveSessionData>) ?? {}) }

  if (liveSessions[gpId]) {
    liveSessions[gpId] = {
      ...liveSessions[gpId],
      is_active: false,
      updated_at: new Date().toISOString(),
    }
  }

  await admin
    .from('leagues')
    .update({ settings_json: { ...settings, live_sessions: liveSessions } })
    .eq('id', leagueId)

  revalidatePath(`/league/${leagueId}/gp/${gpId}/live`)
  return { success: true }
}

/* ── Update qualifying positions (admin manual entry) ── */
export async function updateLiveQualifying(
  leagueId: string,
  gpId: string,
  qualifyingOrder: LiveQualifyingEntry[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = { ...((settings.live_sessions as Record<string, LiveSessionData>) ?? {}) }

  const existing = liveSessions[gpId]
  liveSessions[gpId] = {
    session_type: existing?.session_type ?? 'qualifying',
    is_active: existing?.is_active ?? true,
    is_final: false,
    qualifying_order: qualifyingOrder,
    source: 'admin',
    updated_at: new Date().toISOString(),
    started_at: existing?.started_at ?? new Date().toISOString(),
  }

  await admin
    .from('leagues')
    .update({ settings_json: { ...settings, live_sessions: liveSessions } })
    .eq('id', leagueId)

  revalidatePath(`/league/${leagueId}/gp/${gpId}/live`)
  return { success: true }
}

/* ── Confirm live results → copy to official gp_results ── */
export async function confirmLiveResults(leagueId: string, gpId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = (settings.live_sessions as Record<string, LiveSessionData>) ?? {}
  const session = liveSessions[gpId]

  if (!session || session.qualifying_order.length === 0) {
    return { error: 'Nessun dato live da confermare' }
  }

  // ── Save qualifying results to gp_results ──
  // Check if gp_results already exists (may have partial race data)
  const { data: existingResult } = await admin
    .from('gp_results')
    .select('results_json')
    .eq('league_id', leagueId)
    .eq('gp_id', gpId)
    .maybeSingle()

  const existingResultsJson = (existingResult?.results_json as Record<string, unknown>) ?? {}

  // Build qualifying_order for official results
  const officialQualOrder = session.qualifying_order.map(e => ({
    driver_id: e.driver_id,
    position: e.position,
    ...(e.q1_time ? { q1_time: e.q1_time } : {}),
    ...(e.q2_time ? { q2_time: e.q2_time } : {}),
    ...(e.q3_time ? { q3_time: e.q3_time } : {}),
  }))

  // Merge: keep existing race_order if it exists, update qualifying_order
  const mergedResults = {
    ...existingResultsJson,
    qualifying_order: officialQualOrder,
    race_order: existingResultsJson.race_order ?? [],
    safety_car: existingResultsJson.safety_car ?? false,
  }

  const { error: upsertError } = await admin
    .from('gp_results')
    .upsert(
      {
        league_id: leagueId,
        gp_id: gpId,
        results_json: mergedResults,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'league_id,gp_id' }
    )

  if (upsertError) return { error: `Errore salvataggio risultati: ${upsertError.message}` }

  // Update GP status to 'qualifying' (not 'completed' — race hasn't happened)
  await admin
    .from('grands_prix')
    .update({ status: 'qualifying' })
    .eq('id', gpId)
    .in('status', ['upcoming']) // Only update if still upcoming

  // Mark live session as final
  liveSessions[gpId] = { ...session, is_final: true, is_active: false, updated_at: new Date().toISOString() }
  await admin
    .from('leagues')
    .update({ settings_json: { ...settings, live_sessions: liveSessions } })
    .eq('id', leagueId)

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'live_results_confirmed',
    details_json: { gp_id: gpId, positions_count: session.qualifying_order.length },
  })

  revalidatePath(`/league/${leagueId}/gp/${gpId}/live`)
  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  revalidatePath(`/league/${leagueId}`)
  return { success: true }
}

/* ── Get live session data + compute scores for all players ── */
export async function getLiveSessionWithScores(leagueId: string, gpId: string) {
  const admin = createAdminClient()

  // Get league settings (live session data)
  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = (settings.live_sessions as Record<string, LiveSessionData>) ?? {}
  const session = liveSessions[gpId] ?? null

  if (!session || session.qualifying_order.length === 0) {
    return { session: null, playerScores: [], driverStandings: [], teamStandings: [] }
  }

  // Get scoring rules
  const { data: scoringRules } = await admin
    .from('scoring_rules')
    .select('rules_json')
    .eq('league_id', leagueId)
    .eq('active', true)
    .single()

  const rules = (scoringRules?.rules_json ?? {}) as ScoringRulesData

  // Get all members
  const { data: members } = await admin
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  // Get profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]))

  // Get all rosters
  const { data: rosters } = await admin
    .from('rosters')
    .select('user_id, driver_id, team_id, driver:drivers(id, name, short_name, team_id), team:teams(id, name, short_name)')
    .eq('league_id', leagueId)

  // Get all selections for this GP
  const { data: selections } = await admin
    .from('gp_selections')
    .select('user_id, captain_driver_id, bench_driver_id, predictions_json')
    .eq('league_id', leagueId)
    .eq('gp_id', gpId)

  const selectionMap = new Map((selections ?? []).map(s => [s.user_id, s]))

  // Get all drivers for the standings
  const { data: allDrivers } = await admin
    .from('drivers')
    .select('id, name, short_name, team_id, team:teams(id, name, short_name, color)')
    .eq('season_id', 2026)
    .eq('active', true)

  const driverMap = new Map((allDrivers ?? []).map(d => [d.id, d]))

  // Get all teams
  const { data: allTeams } = await admin
    .from('teams')
    .select('id, name, short_name, color')
    .eq('season_id', 2026)

  // Build partial GpResultsData from live qualifying positions
  const liveResults: GpResultsData = {
    qualifying_order: session.qualifying_order.map(e => ({
      driver_id: e.driver_id,
      position: e.position,
    })),
    race_order: [], // No race data yet during qualifying
    safety_car: false,
  }

  // ── Compute driver standings (qualifying only) ──
  const driverStandings = session.qualifying_order.map(entry => {
    const driver = driverMap.get(entry.driver_id)
    const qualPts = rules.qualifying?.[String(entry.position)] ?? 0
    return {
      driver_id: entry.driver_id,
      driver_name: driver ? (driver as any).name : entry.driver_id,
      short_name: driver ? (driver as any).short_name : entry.driver_id,
      team_id: driver ? (driver as any).team_id : null,
      team_name: driver ? (driver as any).team?.name : null,
      team_short_name: driver ? (driver as any).team?.short_name : null,
      team_color: driver ? (driver as any).team?.color : '#888',
      position: entry.position,
      qualifying_pts: qualPts,
      q1_time: entry.q1_time,
      q2_time: entry.q2_time,
      q3_time: entry.q3_time,
    }
  }).sort((a, b) => a.position - b.position)

  // ── Compute team standings ──
  const teamScoreMap = new Map<string, { team_id: string; name: string; short_name: string; color: string; total_pts: number; drivers: string[] }>()
  for (const ds of driverStandings) {
    if (!ds.team_id) continue
    const existing = teamScoreMap.get(ds.team_id)
    if (existing) {
      existing.total_pts += ds.qualifying_pts
      existing.drivers.push(ds.short_name)
    } else {
      teamScoreMap.set(ds.team_id, {
        team_id: ds.team_id,
        name: ds.team_name ?? ds.team_id,
        short_name: ds.team_short_name ?? ds.team_id,
        color: ds.team_color ?? '#888',
        total_pts: ds.qualifying_pts,
        drivers: [ds.short_name],
      })
    }
  }
  const teamStandings = [...teamScoreMap.values()].sort((a, b) => b.total_pts - a.total_pts)

  // ── Compute player scores ──
  const playerScores = (members ?? []).map(m => {
    const userRoster = (rosters ?? []).filter(r => r.user_id === m.user_id)
    const driverRoster = userRoster.filter(r => r.driver_id != null)
    const teamRoster = userRoster.find(r => r.team_id != null)

    const sel = selectionMap.get(m.user_id)
    const captainId = sel?.captain_driver_id ?? (driverRoster[0] as any)?.driver_id
    const benchId = sel?.bench_driver_id ?? undefined
    const predictions: GpPredictions = (sel?.predictions_json ?? {}) as GpPredictions

    const rosterDriverIds = driverRoster.map(r => r.driver_id).filter(Boolean) as string[]

    // Compute qualifying-only scores for each owned driver
    let totalQualPts = 0
    const driverDetails: Array<{
      driver_id: string
      short_name: string
      position: number | null
      qualifying_pts: number
      is_captain: boolean
      is_bench: boolean
    }> = []

    for (const dId of rosterDriverIds) {
      const isBench = benchId === dId
      const isCaptain = captainId === dId
      const qualEntry = session.qualifying_order.find(e => e.driver_id === dId)
      const qualPos = qualEntry?.position
      let qualPts = qualPos ? (rules.qualifying?.[String(qualPos)] ?? 0) : 0

      // Captain multiplier applies to qualifying pts too
      if (isCaptain && !isBench) {
        qualPts = qualPts * (rules.captain_multiplier ?? 2)
      }

      // Skip bench driver from total (unless substituting - can't know during quali)
      if (!isBench) {
        totalQualPts += qualPts
      }

      const driver = driverMap.get(dId)
      driverDetails.push({
        driver_id: dId,
        short_name: driver ? (driver as any).short_name : dId,
        position: qualPos ?? null,
        qualifying_pts: qualPts,
        is_captain: isCaptain && !isBench,
        is_bench: isBench,
      })
    }

    // Team qualifying score
    let teamQualPts = 0
    let teamName: string | undefined
    if (teamRoster) {
      const teamId = teamRoster.team_id!
      const teamInfo = teamScoreMap.get(teamId)
      if (teamInfo) {
        teamQualPts = teamInfo.total_pts
        teamName = teamInfo.name
      }
    }

    // Prediction partial check: pole
    let predictionPts = 0
    const poleDriverId = session.qualifying_order.find(e => e.position === 1)?.driver_id
    const polePredCorrect = predictions.pole_driver_id ? predictions.pole_driver_id === poleDriverId : false
    if (polePredCorrect) {
      predictionPts += rules.predictions?.pole ?? 5
    }

    return {
      user_id: m.user_id,
      display_name: profileMap.get(m.user_id) ?? '?',
      total_qualifying_pts: totalQualPts + teamQualPts + predictionPts,
      driver_pts: totalQualPts,
      team_pts: teamQualPts,
      team_name: teamName,
      prediction_pts: predictionPts,
      pole_correct: polePredCorrect,
      pole_prediction: predictions.pole_driver_id,
      drivers: driverDetails,
      has_selection: !!sel,
    }
  }).sort((a, b) => b.total_qualifying_pts - a.total_qualifying_pts)

  return {
    session,
    playerScores,
    driverStandings,
    teamStandings,
  }
}
