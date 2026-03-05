'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeGpScore } from '@/lib/scoring'
import type { GpResultsData, GpPredictions, ScoringRulesData } from '@/lib/types'

export async function setCaptainAndPredictions(
  leagueId: string,
  gpId: string,
  captainDriverId: string,
  predictions: GpPredictions
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const { data: ownedDriver } = await supabase
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('driver_id', captainDriverId)
    .maybeSingle()

  if (!ownedDriver) return { error: 'Non possiedi questo pilota' }

  const { data: gp } = await supabase
    .from('grands_prix')
    .select('date, qualifying_date, status')
    .eq('id', gpId)
    .single()

  if (!gp) return { error: 'GP non trovato' }
  if (gp.status === 'completed') return { error: 'Il GP è già terminato' }

  const { error } = await supabase
    .from('gp_selections')
    .upsert(
      {
        league_id: leagueId,
        gp_id: gpId,
        user_id: user.id,
        captain_driver_id: captainDriverId,
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

  const { data: member } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può inserire i risultati' }

  const { error: resultsError } = await supabase
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

  await supabase
    .from('grands_prix')
    .update({ status: 'completed' })
    .eq('id', gpId)

  // Compute scores for all members
  const computeResult = await computeAndSaveGpScores(leagueId, gpId, results, supabase)
  if (computeResult?.error) return { error: computeResult.error }

  await supabase.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'gp_results_submitted',
    details_json: { gp_id: gpId },
  })

  revalidatePath(`/league/${leagueId}/gp/${gpId}`)
  revalidatePath(`/league/${leagueId}/standings`)
  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeAndSaveGpScores(leagueId: string, gpId: string, results: GpResultsData, supabase: any) {
  const { data: scoringRules } = await supabase
    .from('scoring_rules')
    .select('rules_json')
    .eq('league_id', leagueId)
    .eq('active', true)
    .single()

  if (!scoringRules) return { error: 'Nessuna regola di punteggio trovata' }

  const rules = scoringRules.rules_json as ScoringRulesData

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members) return

  for (const member of members) {
    const { data: roster } = await supabase
      .from('rosters')
      .select('driver_id, driver:drivers(name)')
      .eq('league_id', leagueId)
      .eq('user_id', member.user_id)

    const { data: selection } = await supabase
      .from('gp_selections')
      .select('captain_driver_id, predictions_json')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .eq('user_id', member.user_id)
      .maybeSingle()

    if (!roster || roster.length === 0) continue

    const rosterDriverIds = roster.map((r: { driver_id: string }) => r.driver_id)
    const captainId = selection?.captain_driver_id ?? rosterDriverIds[0]
    const predictions: GpPredictions = selection?.predictions_json ?? {}

    const breakdown = computeGpScore(rosterDriverIds, captainId, results, rules, predictions)

    // Fill in driver names from joined data
    breakdown.drivers = breakdown.drivers.map((d, i) => ({
      ...d,
      driver_name: (roster[i]?.driver as { name?: string })?.name ?? d.driver_id,
    }))

    await supabase
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

export async function getGpWithSelection(leagueId: string, gpId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [gpRes, selectionRes, rosterRes, scoresRes] = await Promise.all([
    supabase.from('grands_prix').select('*').eq('id', gpId).single(),
    supabase
      .from('gp_selections')
      .select('*')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('rosters')
      .select('*, driver:drivers(*, team:teams(*))')
      .eq('league_id', leagueId)
      .eq('user_id', user.id),
    supabase
      .from('gp_scores')
      .select('*, profile:profiles(display_name)')
      .eq('league_id', leagueId)
      .eq('gp_id', gpId)
      .order('total_points', { ascending: false }),
  ])

  return {
    gp: gpRes.data,
    selection: selectionRes.data,
    roster: rosterRes.data ?? [],
    scores: scoresRes.data ?? [],
  }
}

export async function getStandings(leagueId: string) {
  const supabase = await createClient()

  const { data: scores } = await supabase
    .from('gp_scores')
    .select('*, profile:profiles(display_name), grand_prix:grands_prix(name, round, date)')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id, credits_left, profile:profiles(display_name)')
    .eq('league_id', leagueId)

  return { scores: scores ?? [], members: members ?? [] }
}
