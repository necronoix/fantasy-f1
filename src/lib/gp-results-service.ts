import { createAdminClient } from '@/lib/supabase/server'
import { computeGpScore, computeTeamScore } from '@/lib/scoring'
import type { GpResultsData, GpPredictions, ScoringRulesData } from '@/lib/types'

/**
 * Persists results, marks the GP completed and recomputes scores. Performs no
 * auth check: callers (admin action, results cron) must authorize first, and
 * this module must never become a 'use server' file.
 */
export async function saveGpResultsAndScores(
  leagueId: string,
  gpId: string,
  results: GpResultsData,
  submittedBy: string,
  auditAction: 'gp_results_submitted' | 'gp_results_auto_imported'
): Promise<{ error?: string }> {
  const admin = createAdminClient()

  const { error: resultsError } = await admin
    .from('gp_results')
    .upsert(
      {
        league_id: leagueId,
        gp_id: gpId,
        results_json: results,
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'league_id,gp_id' }
    )

  if (resultsError) return { error: resultsError.message }

  await admin
    .from('grands_prix')
    .update({ status: 'completed' })
    .eq('id', gpId)

  const computeResult = await computeAndSaveGpScores(leagueId, gpId, results)
  if (computeResult?.error) return { error: computeResult.error }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: submittedBy,
    action: auditAction,
    details_json: { gp_id: gpId },
  })

  return {}
}

async function computeAndSaveGpScores(leagueId: string, gpId: string, results: GpResultsData) {
  const admin = createAdminClient()

  const { data: scoringRules } = await admin
    .from('scoring_rules')
    .select('rules_json')
    .eq('league_id', leagueId)
    .eq('active', true)
    .single()

  if (!scoringRules) return { error: 'Nessuna regola di punteggio trovata' }

  const rules = scoringRules.rules_json as ScoringRulesData

  const { data: members } = await admin
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members) return

  // Load per-GP driver overrides once for all members
  const { data: overridesRaw } = await admin
    .from('gp_driver_overrides')
    .select('driver_id, temp_team_id, substitute_driver_id')
    .eq('league_id', leagueId)
    .eq('gp_id', gpId)

  // driverId → tempTeamId (null = absent, string = racing for that team)
  const tempTeamMap = new Map<string, string | null>()
  // driverId → substituteDriverId (who sits in their normal seat)
  const substituteMap = new Map<string, string>()
  for (const ov of overridesRaw ?? []) {
    tempTeamMap.set(ov.driver_id, ov.temp_team_id ?? null)
    if (ov.substitute_driver_id) substituteMap.set(ov.driver_id, ov.substitute_driver_id)
  }

  for (const member of members) {
    const { data: roster } = await admin
      .from('rosters')
      .select('driver_id, team_id, driver:drivers(name), team:teams(name)')
      .eq('league_id', leagueId)
      .eq('user_id', member.user_id)

    const { data: selection } = await admin
      .from('gp_selections')
      .select('captain_driver_id, bench_driver_id, predictions_json')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .eq('user_id', member.user_id)
      .maybeSingle()

    if (!roster || roster.length === 0) continue

    const rosterDriverIds = roster.filter((r: { driver_id: string }) => r.driver_id != null).map((r: { driver_id: string }) => r.driver_id)
    const captainId = selection?.captain_driver_id ?? rosterDriverIds[0]
    const benchId = selection?.bench_driver_id ?? undefined
    const predictions: GpPredictions = selection?.predictions_json ?? {}

    const breakdown = computeGpScore(rosterDriverIds, captainId, results, rules, predictions, benchId)

    // Map driver names from roster data
    const driverNameMap = new Map<string, string>()
    for (const r of roster) {
      const dId = (r as { driver_id: string }).driver_id
      const dName = (r as { driver: { name?: string } }).driver?.name
      if (dId && dName) driverNameMap.set(dId, dName)
    }
    breakdown.drivers = breakdown.drivers.map((d) => ({
      ...d,
      driver_name: driverNameMap.get(d.driver_id) ?? d.driver_id,
    }))

    // Compute team score if user owns an F1 team
    let teamScore = 0
    let teamName: string | undefined
    const teamEntry = roster.find((r: { team_id: string | null }) => r.team_id != null)
    if (teamEntry) {
      const teamId = (teamEntry as { team_id: string }).team_id
      teamName = (teamEntry as { team: { name?: string } }).team?.name

      // Get the default two drivers for this team
      const { data: defaultDrivers } = await admin
        .from('drivers')
        .select('id')
        .eq('team_id', teamId)

      if (defaultDrivers) {
        // Build the actual lineup for this team this GP, applying overrides:
        // 1. Start from the team's default drivers
        // 2. Remove drivers who have been reassigned to another team or are absent
        //    (those have a tempTeamMap entry where the value ≠ teamId)
        // 3. For each removed driver, add their substitute (if any) in their place
        // 4. Add drivers from other teams who have been temporarily reassigned TO this team
        const activeDriverIds = new Set<string>(defaultDrivers.map((d: { id: string }) => d.id))

        for (const dId of [...activeDriverIds]) {
          if (tempTeamMap.has(dId)) {
            const dest = tempTeamMap.get(dId)
            if (dest !== teamId) {
              // Driver left this team (reassigned elsewhere or absent)
              activeDriverIds.delete(dId)
              const sub = substituteMap.get(dId)
              if (sub) activeDriverIds.add(sub)
            }
          }
        }

        // Drivers from other teams temporarily racing for teamId
        for (const [dId, dest] of tempTeamMap.entries()) {
          if (dest === teamId && !activeDriverIds.has(dId)) {
            activeDriverIds.add(dId)
          }
        }

        if (activeDriverIds.size >= 1) {
          teamScore = computeTeamScore(teamId, [...activeDriverIds], results, rules)
        }
      }
    }

    breakdown.team_pts = teamScore
    breakdown.team_name = teamName
    breakdown.total += teamScore

    await admin
      .from('gp_scores')
      .upsert(
        {
          league_id: leagueId,
          gp_id: gpId,
          user_id: member.user_id,
          total_points: breakdown.total,
          breakdown_json: breakdown,
        },
        { onConflict: 'league_id,gp_id,user_id' }
      )
  }
}
