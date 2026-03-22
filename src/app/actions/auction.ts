'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateAuctionBid } from '@/lib/scoring'

export async function startInitialAuction(leagueId: string, driverId: string) {
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

  const { data: activeAuction } = await admin
    .from('auction_state')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeAuction) return { error: 'C\'è già un\'asta in corso' }

  const { data: existingRoster } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('driver_id', driverId)
    .maybeSingle()

  if (existingRoster) return { error: 'Questo pilota è già in una rosa' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const timerSeconds = (league?.settings_json as { bid_timer_seconds?: number })?.bid_timer_seconds ?? 30
  const endsAt = new Date(Date.now() + timerSeconds * 1000).toISOString()

  const { data: auction, error } = await admin
    .from('auction_state')
    .insert({
      league_id: leagueId,
      type: 'initial',
      target_driver_id: driverId,
      current_bid: 0,
      ends_at: endsAt,
      status: 'active',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'auction_started',
    details_json: { driver_id: driverId, auction_id: auction.id },
  })

  revalidatePath(`/league/${leagueId}/auction`)
  return { data: auction }
}

export async function placeBid(auctionId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: auction } = await admin
    .from('auction_state')
    .select('*, leagues(settings_json)')
    .eq('id', auctionId)
    .single()

  if (!auction) return { error: 'Asta non trovata' }
  if (auction.status !== 'active') return { error: 'L\'asta non è attiva' }
  if (new Date(auction.ends_at) < new Date()) return { error: 'L\'asta è scaduta' }

  const { data: member } = await admin
    .from('league_members')
    .select('credits_left')
    .eq('league_id', auction.league_id)
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Non sei membro di questa lega' }

  // Count only DRIVER roster entries (not teams) for driver auction slot validation
  const isTeamAuction = auction.type === 'team'

  if (isTeamAuction) {
    // For team auctions, check the user doesn't already have a team
    const { data: existingTeam } = await admin
      .from('rosters')
      .select('id')
      .eq('league_id', auction.league_id)
      .eq('user_id', user.id)
      .not('team_id', 'is', null)
      .maybeSingle()
    if (existingTeam) return { error: 'Hai già una scuderia' }
  }

  // Count driver slots only (where driver_id is not null)
  const { count: driverCount } = await admin
    .from('rosters')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', auction.league_id)
    .eq('user_id', user.id)
    .not('driver_id', 'is', null)

  const maxDriverSlots = 4
  const validation = validateAuctionBid(
    amount,
    auction.current_bid,
    member.credits_left,
    isTeamAuction ? 0 : (driverCount ?? 0),
    isTeamAuction ? 1 : maxDriverSlots,
    200
  )

  if (!validation.valid) return { error: validation.error }

  const timerSeconds =
    (auction.leagues as { settings_json?: { bid_timer_seconds?: number } })?.settings_json?.bid_timer_seconds ?? 30
  const newEndsAt = new Date(Date.now() + timerSeconds * 1000).toISOString()

  const { error: updateError } = await admin
    .from('auction_state')
    .update({
      current_bid: amount,
      leader_user_id: user.id,
      ends_at: newEndsAt,
    })
    .eq('id', auctionId)
    .eq('status', 'active')

  if (updateError) return { error: updateError.message }

  await admin.from('bids').insert({
    league_id: auction.league_id,
    auction_id: auctionId,
    user_id: user.id,
    amount,
  })

  await admin.from('audit_log').insert({
    league_id: auction.league_id,
    user_id: user.id,
    action: 'bid_placed',
    details_json: { auction_id: auctionId, amount },
  })

  revalidatePath(`/league/${auction.league_id}/auction`)
  return { success: true }
}

export async function closeAuction(auctionId: string) {
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

  // CRITICAL: Prevent double-close — if already closed, return early
  if (auction.status === 'closed') {
    return { success: true, already_closed: true }
  }

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

  // Use conditional update: only close if still active (atomic guard)
  const { data: closedRows } = await admin
    .from('auction_state')
    .update({ status: 'closed' })
    .eq('id', auctionId)
    .eq('status', 'active')
    .select('id')

  // If no rows updated, someone else already closed it
  if (!closedRows || closedRows.length === 0) {
    return { success: true, already_closed: true }
  }

  if (auction.leader_user_id) {
    // Check if roster entry already exists (idempotency guard)
    const { data: existingRoster } = await admin
      .from('rosters')
      .select('id')
      .eq('league_id', auction.league_id)
      .eq('user_id', auction.leader_user_id)
      .eq('driver_id', auction.target_driver_id)
      .maybeSingle()

    if (!existingRoster) {
      await admin.from('rosters').insert({
        league_id: auction.league_id,
        user_id: auction.leader_user_id,
        driver_id: auction.target_driver_id,
        purchase_price: auction.current_bid,
        acquired_via: auction.type === 'initial' ? 'initial_auction' : 'mini_auction',
      })

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
    }

    if (auction.type === 'mini' && auction.drop_driver_user_id && auction.drop_driver_id) {
      const { data: droppedRoster } = await admin
        .from('rosters')
        .select('purchase_price')
        .eq('league_id', auction.league_id)
        .eq('user_id', auction.drop_driver_user_id)
        .eq('driver_id', auction.drop_driver_id)
        .single()

      await admin
        .from('rosters')
        .delete()
        .eq('league_id', auction.league_id)
        .eq('user_id', auction.drop_driver_user_id)
        .eq('driver_id', auction.drop_driver_id)

      if (droppedRoster) {
        const { data: dropper } = await admin
          .from('league_members')
          .select('credits_spent, credits_left')
          .eq('league_id', auction.league_id)
          .eq('user_id', auction.drop_driver_user_id)
          .single()

        if (dropper) {
          await admin
            .from('league_members')
            .update({
              credits_spent: Math.max(0, dropper.credits_spent - droppedRoster.purchase_price),
              credits_left: dropper.credits_left + droppedRoster.purchase_price,
            })
            .eq('league_id', auction.league_id)
            .eq('user_id', auction.drop_driver_user_id)
        }
      }
    }

    await admin.from('audit_log').insert({
      league_id: auction.league_id,
      user_id: user.id,
      action: 'auction_closed',
      details_json: {
        auction_id: auctionId,
        winner_id: auction.leader_user_id,
        driver_id: auction.target_driver_id,
        final_bid: auction.current_bid,
      },
    })
  }

  revalidatePath(`/league/${auction.league_id}/auction`)
  return { success: true }
}

export async function startMiniAuction(
  leagueId: string,
  dropDriverId: string,
  targetDriverId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: ownedDriver } = await admin
    .from('rosters')
    .select('id, purchase_price')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('driver_id', dropDriverId)
    .maybeSingle()

  if (!ownedDriver) return { error: 'Non possiedi questo pilota' }

  const { data: takenDriver } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('driver_id', targetDriverId)
    .maybeSingle()

  if (takenDriver) return { error: 'Questo pilota è già in una rosa' }

  const { data: activeAuction } = await admin
    .from('auction_state')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeAuction) return { error: 'C\'è già un\'asta in corso' }

  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const timerSeconds = (league?.settings_json as { bid_timer_seconds?: number })?.bid_timer_seconds ?? 30
  const endsAt = new Date(Date.now() + timerSeconds * 1000).toISOString()

  const { data: auction, error } = await admin
    .from('auction_state')
    .insert({
      league_id: leagueId,
      type: 'mini',
      target_driver_id: targetDriverId,
      drop_driver_user_id: user.id,
      drop_driver_id: dropDriverId,
      current_bid: 0,
      ends_at: endsAt,
      status: 'active',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await admin.from('audit_log').insert({
    league_id: leagueId,
    user_id: user.id,
    action: 'mini_auction_started',
    details_json: {
      drop_driver_id: dropDriverId,
      target_driver_id: targetDriverId,
      auction_id: auction.id,
    },
  })

  revalidatePath(`/league/${leagueId}/auction`)
  return { data: auction }
}

export async function getActiveAuction(leagueId: string) {
  const admin = createAdminClient()

  // Note: auction_state has two FKs to drivers (target_driver_id and drop_driver_id),
  // so we MUST use the FK hint syntax !column to disambiguate (avoids HTTP 300)
  const { data, error } = await admin
    .from('auction_state')
    .select(`*, target_driver:drivers!target_driver_id(*, team:teams(*))`)
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('getActiveAuction error:', error)
    return null
  }

  // Separately fetch leader display name if needed
  if (data?.leader_user_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', data.leader_user_id)
      .single()
    if (profile) (data as Record<string, unknown>).leader = profile
  }

  return data
}

export async function getAuctionBids(auctionId: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('bids')
    .select('*, profile:profiles(display_name)')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}
