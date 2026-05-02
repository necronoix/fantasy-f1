'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeGpScore, computeTeamScore } from '@/lib/scoring'
import { isPredictionLocked } from '@/lib/utils'
import type { GpResultsData, GpPredictions, ScoringRulesData } from '@/lib/types'

export async function resetGpStatus(
  leagueId: string,
  gpId: string,
  newStatus: 'upcoming' | 'qualifying' | 'race'
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può resettare lo stato del GP' }

  const { error } = await admin
    .from('grands_prix')
    .update({ status: newStatus })
    .eq('id', gpId)

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'gp_status_reset',
    details_json: { gp_id: gpId, new_status: newStatus },
  })

  revalidatePath(`/league/${leagueId}/admin`)
  revalidatePath(`/league/${leagueId}/gp`)
  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  return { success: true }
}

export async function toggleSelectionsLock(leagueId: string, lock: boolean) {
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può bloccare le selezioni' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const currentSettings = (league?.settings_json as Record<string, unknown>) ?? {}
  const newSettings = { ...currentSettings, selections_locked: lock }

  const { error } = await admin
    .from('leagues')
    .update({ settings_json: newSettings })
    .eq('id', leagueId)

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: lock ? 'selections_locked' : 'selections_unlocked',
    details_json: { locked: lock },
  })

  revalidatePath(`/league/${leagueId}/admin`)
  revalidatePath(`/league/${leagueId}/gp`)
  return { success: true }
}

/* ── setGpLock — lock/unlock specific GPs ────────────────── */
export async function setGpLock(leagueId: string, gpIds: string[], lock: boolean) {
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può bloccare i GP' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const currentSettings = (league?.settings_json as Record<string, unknown>) ?? {}
  const currentLockedIds: string[] = (currentSettings.locked_gp_ids as string[]) ?? []

  const newLockedIds = lock
    ? [...new Set([...currentLockedIds, ...gpIds])]
    : currentLockedIds.filter((id: string) => !gpIds.includes(id))

  const { error } = await admin
    .from('leagues')
    .update({ settings_json: { ...currentSettings, locked_gp_ids: newLockedIds } })
    .eq('id', leagueId)

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: lock ? 'gp_locked' : 'gp_unlocked',
    details_json: { gp_ids: gpIds },
  })

  revalidatePath(`/league/${leagueId}/admin`)
  revalidatePath(`/league/${leagueId}/gp`)
  return { success: true, lockedIds: newLockedIds }
}

/* ── setPermanentGpLock — permanent lock/unlock a GP ─────── */
export async function setPermanentGpLock(
  leagueId: string,
  gpId: string,
  reason: 'completed' | 'cancelled' | 'postponed' | null
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può impostare blocchi permanenti' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const currentSettings = (league?.settings_json as Record<string, unknown>) ?? {}
  const permanentLocks = { ...((currentSettings.permanently_locked_gps as Record<string, unknown>) ?? {}) }

  if (reason === null) {
    delete permanentLocks[gpId]
  } else {
    permanentLocks[gpId] = { reason, locked_at: new Date().toISOString() }
  }

  const { error } = await admin
    .from('leagues')
    .update({ settings_json: { ...currentSettings, permanently_locked_gps: permanentLocks } })
    .eq('id', leagueId)

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: reason ? 'gp_permanent_lock' : 'gp_permanent_unlock',
    details_json: { gp_id: gpId, reason },
  })

  revalidatePath(`/league/${leagueId}/admin`)
  revalidatePath(`/league/${leagueId}/gp`)
  return { success: true }
}

export async function setCaptainAndPredictions(
  leagueId: string,
  gpId: string,
  captainDriverId: string,
  predictions: GpPredictions,
  benchDriverId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  // Check if admin has locked all selections
  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json as Record<string, unknown>) ?? {}
  if (settings.selections_locked === true) {
    return { error: '🔒 Le selezioni sono bloccate dall\'admin della lega' }
  }

  // Per-GP temporary lock
  const lockedGpIds = (settings.locked_gp_ids as string[]) ?? []
  if (lockedGpIds.includes(gpId)) {
    return { error: '🔒 Questo GP è bloccato dall\'admin' }
  }

  // Per-GP permanent lock
  const permanentLocks = (settings.permanently_locked_gps as Record<string, { reason: string }>) ?? {}
  if (permanentLocks[gpId]) {
    const reasonMap: Record<string, string> = { completed: 'già concluso', cancelled: 'annullato', postponed: 'rimandato' }
    return { error: `🔒 Questo GP è bloccato permanentemente (${reasonMap[permanentLocks[gpId].reason] ?? permanentLocks[gpId].reason})` }
  }

  // Check admin-set deadline and auto-lock
  const deadlines = (settings.gp_deadlines as Record<string, string>) ?? {}
  const adminDeadline = deadlines[gpId] ?? null

  const { data: ownedDriver } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('driver_id', captainDriverId)
    .maybeSingle()

  if (!ownedDriver) return { error: 'Non possiedi questo pilota' }

  const { data: gp } = await admin
    .from('grands_prix')
    .select('date, qualifying_date, qualifying_datetime, status')
    .eq('id', gpId)
    .single()

  if (!gp) return { error: 'GP non trovato' }
  if (isPredictionLocked(gp.qualifying_datetime, adminDeadline)) {
    return { error: '⏰ Selezioni bloccate — tempo scaduto' }
  }

  const { error } = await admin
    .from('gp_selections')
    .upsert(
      {
        league_id: leagueId,
        gp_id: gpId,
        user_id: user.id,
        captain_driver_id: captainDriverId,
        bench_driver_id: benchDriverId ?? null,
        predictions_json: predictions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'league_id,gp_id,user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  return { success: true }
}

export async function submitGpResults(
  leagueId: string,
  gpId: string,
  results: GpResultsData
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può inserire i risultati' }

  const { error: resultsError } = await admin
    .from('gp_results')
    .upsert(
      {
        league_id: leagueId,
        gp_id: gpId,
        results_json: results,
        submitted_by: user.id,
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
    user_id: user.id,
    action: 'gp_results_submitted',
    details_json: { gp_id: gpId },
  })

  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  revalidatePath(`/league/${leagueId}/standings`)
  return { success: true }
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

      // Get the two drivers belonging to this team
      const { data: teamDrivers } = await admin
        .from('drivers')
        .select('id')
        .eq('team_id', teamId)

      if (teamDrivers && teamDrivers.length >= 2) {
        const teamDriverIds = teamDrivers.map((d: { id: string }) => d.id)
        teamScore = computeTeamScore(teamId, teamDriverIds, results, rules)
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

export async function getGpWithSelection(leagueId: string, gpId: string, userId: string) {
  const admin = createAdminClient()

  const [gpRes, selectionRes, rosterRes, scoresRes, allSelectionsRes] = await Promise.all([
    admin.from('grands_prix').select('*').eq('id', gpId).single(),
    admin
      .from('gp_selections')
      .select('*')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('rosters')
      .select('*, driver:drivers(*, team:teams(*))')
      .eq('league_id', leagueId)
      .eq('user_id', userId),
    admin
      .from('gp_scores')
      .select('*, profile:profiles(display_name)')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .order('total_points', { ascending: false }),
    admin
      .from('gp_selections')
      .select('*, profile:profiles(display_name)')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId),
  ])

  return {
    gp: gpRes.data,
    selection: selectionRes.data,
    roster: rosterRes.data ?? [],
    scores: scoresRes.data ?? [],
    allSelections: allSelectionsRes.data ?? [],
  }
}

/* ── setGpDeadline — admin sets a deadline for selections ────── */
export async function setGpDeadline(
  leagueId: string,
  gpId: string,
  deadline: string | null // ISO string or null to remove
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può impostare le scadenze' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const currentSettings = (league?.settings_json as Record<string, unknown>) ?? {}
  const deadlines = { ...((currentSettings.gp_deadlines as Record<string, string>) ?? {}) }

  if (deadline === null) {
    delete deadlines[gpId]
  } else {
    deadlines[gpId] = deadline
  }

  const { error } = await admin
    .from('leagues')
    .update({ settings_json: { ...currentSettings, gp_deadlines: deadlines } })
    .eq('id', leagueId)

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: deadline ? 'gp_deadline_set' : 'gp_deadline_removed',
    details_json: { gp_id: gpId, deadline },
  })

  revalidatePath(`/league/${leagueId}/admin`)
  revalidatePath(`/league/${leagueId}/gp`)
  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  return { success: true }
}

/* ── adminSetSelection — admin sets captain/bench/predictions for a player ── */
export async function adminSetSelection(
  leagueId: string,
  gpId: string,
  targetUserId: string,
  captainDriverId: string,
  predictions: GpPredictions,
  benchDriverId?: string
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può impostare le selezioni' }

  // Verify target user owns this driver
  const { data: ownedDriver } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)
    .eq('driver_id', captainDriverId)
    .maybeSingle()

  if (!ownedDriver) return { error: 'Il giocatore non possiede questo pilota' }

  const { error } = await admin
    .from('gp_selections')
    .upsert(
      {
        league_id: leagueId,
        gp_id: gpId,
        user_id: targetUserId,
        captain_driver_id: captainDriverId,
        bench_driver_id: benchDriverId ?? null,
        predictions_json: predictions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'league_id,gp_id,user_id' }
    )

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'admin_set_selection',
    details_json: { gp_id: gpId, target_user_id: targetUserId, captain: captainDriverId },
  })

  revalidatePath(`/league/${leagueId}/admin`)
  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  return { success: true }
}

/* ── getPlayersSelectionStatus — admin view of all players' selection status ── */
export async function getPlayersSelectionStatus(leagueId: string, gpId: string) {
  const admin = createAdminClient()

  const { data: members } = await admin
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members) return []

  const { data: selections } = await admin
    .from('gp_selections')
    .select('user_id, captain_driver_id, bench_driver_id, predictions_json')
    .eq('league_id', leagueId)
    .eq('gp_id', gpId)

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')

  const { data: rosters } = await admin
    .from('rosters')
    .select('user_id, driver_id, team_id, driver:drivers(id, name, short_name)')
    .eq('league_id', leagueId)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]))
  const selectionMap = new Map((selections ?? []).map(s => [s.user_id, s]))
  const rosterMap = new Map<string, Array<{ driver_id: string; name: string; short_name: string }>>()
  for (const r of rosters ?? []) {
    if (!r.driver_id) continue
    const driver = r.driver as { id: string; name: string; short_name: string } | null
    if (!driver) continue
    const arr = rosterMap.get(r.user_id) ?? []
    arr.push({ driver_id: r.driver_id, name: driver.name, short_name: driver.short_name })
    rosterMap.set(r.user_id, arr)
  }

  return members.map(m => {
    const sel = selectionMap.get(m.user_id) as Record<string, unknown> | undefined
    const preds = (sel?.predictions_json ?? {}) as Record<string, unknown>
    const drivers = rosterMap.get(m.user_id) ?? []

    return {
      user_id: m.user_id,
      display_name: profileMap.get(m.user_id) ?? '?',
      has_captain: !!sel?.captain_driver_id,
      captain_driver_id: sel?.captain_driver_id as string | null ?? null,
      has_bench: !!sel?.bench_driver_id,
      bench_driver_id: sel?.bench_driver_id as string | null ?? null,
      has_predictions: !!(preds.pole_driver_id || preds.winner_driver_id || preds.fastest_lap_driver_id || preds.safety_car !== undefined),
      predictions: preds,
      drivers,
    }
  })
}

export async function getStandings(leagueId: string) {
  const admin = createAdminClient()

  const { data: scores } = await admin
    .from('gp_scores')
    .select('*, profile:profiles(display_name), grand_prix:grands_prix(name, round, date)')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })

  const { data: members } = await admin
    .from('league_members')
    .select('user_id, credits_left, profile:profiles(display_name)')
    .eq('league_id', leagueId)

  return { scores: scores ?? [], members: members ?? [] }
}
