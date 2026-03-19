'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function startTeamAuction(leagueId: string, teamId: string) {
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

  if (!member || member.role !== 'admin') return { error: 'Solo l\'admin può avviare l\'asta' }

  // Check no active auction
  const { data: activeAuction } = await admin
    .from('auction_state')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeAuction) return { error: 'C\'è già un\'asta in corso' }

  // Check team not already owned
  const { data: existingTeamRoster } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (existingTeamRoster) return { error: 'Questa scuderia è già assegnata' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const timerSeconds = (league?.settings_json as { bid_timer_seconds?: number })?.bid_timer_seconds ?? 20
  const endsAt = new Date(Date.now() + timerSeconds * 1000).toISOString()

  const { data: auction, error } = await admin
    .from('auction_state')
    .insert({
      league_id: leagueId,
      type: 'team',
      target_team_id: teamId,
      target_driver_id: null,
      current_bid: 1,
      ends_at: endsAt,
      status: 'active',
      metadata_json: { auction_type: 'team', team_id: teamId },
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'team_auction_started',
    details_json: { team_id: teamId, auction_id: auction.id },
  })

  revalidatePath(`/league/${leagueId}/auction`)
  return { data: auction }
}

export async function closeTeamAuction(auctionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: auction } = await admin
    .from('auction_state')
    .select('*')
    .eq('id', auctionId)
    .single()

  if (!auction) return { error: 'Asta non trovata' }
  if (auction.type !== 'team') return { error: 'Non è un\'asta scuderia' }

  const { data: member } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', auction.league_id)
    .eq('user_id', user.id)
    .single()

  const isExpired = new Date(auction.ends_at) < new Date()
  if (!isExpired && member?.role !== 'admin') {
    return { error: 'Asta non ancora scaduta' }
  }

  await admin
    .from('auction_state')
    .update({ status: 'closed' })
    .eq('id', auctionId)

  if (auction.leader_user_id) {
    // Check player doesn't already have a team
    const { data: existingTeam } = await admin
      .from('rosters')
      .select('id')
      .eq('league_id', auction.league_id)
      .eq('user_id', auction.leader_user_id)
      .not('team_id', 'is', null)
      .maybeSingle()

    if (existingTeam) {
      return { error: 'Il vincitore ha già una scuderia' }
    }

    await admin.from('rosters').insert({
      league_id: auction.league_id,
      user_id: auction.leader_user_id,
      team_id: auction.target_team_id,
      driver_id: null,
      purchase_price: auction.current_bid,
      acquired_via: 'team_auction',
    })

    // Deduct credits (shared budget)
    const { data: winnerMember } = await admin
      .from('league_members')
      .select('credits_spent, credits_left')
      .eq('league_id', auction.league_id)
      .eq('user_id', auction.leader_user_id)
      .single()

    if (winnerMember) {
      await admin
        .from('league_members')
        .update({
          credits_spent: winnerMember.credits_spent + auction.current_bid,
          credits_left: winnerMember.credits_left - auction.current_bid,
        })
        .eq('league_id', auction.league_id)
        .eq('user_id', auction.leader_user_id)
    }

    await admin.from('audit_log').insert({
      league_id: auction.league_id,
      user_id: user.id,
      action: 'team_auction_closed',
      details_json: {
        auction_id: auctionId,
        winner_id: auction.leader_user_id,
        team_id: auction.target_team_id,
        final_bid: auction.current_bid,
      },
    })
  }

  revalidatePath(`/league/${auction.league_id}/auction`)
  return { success: true }
}

export async function getTeamOwnership(leagueId: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('rosters')
    .select('user_id, team_id, purchase_price, profile:profiles(display_name)')
    .eq('league_id', leagueId)
    .not('team_id', 'is', null)

  return data ?? []
}
