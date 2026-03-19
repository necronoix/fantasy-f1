'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateTrade, getTradesMonthKey } from '@/lib/utils'

export async function proposeTrade(
  leagueId: string,
  accepterUserId: string,
  proposerDriverId: string,
  accepterDriverId: string,
  creditAdjustment: number = 0
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  if (user.id === accepterUserId) return { error: 'Non puoi scambiare con te stesso' }
  if (proposerDriverId === accepterDriverId) return { error: 'Non puoi scambiare lo stesso pilota' }

  const admin = createAdminClient()
  const monthKey = getTradesMonthKey()

  // Get league settings for trade limit
  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', leagueId)
    .single()

  const settings = (league?.settings_json ?? {}) as Record<string, unknown>
  const tradeLimit = Number(settings.trade_limit_per_month ?? 2)

  const { data: proposerMember } = await admin
    .from('league_members')
    .select('trades_used_month, trades_month_key, credits_left')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!proposerMember) return { error: 'Non sei membro di questa lega' }

  const currentMonth = proposerMember.trades_month_key === monthKey
    ? proposerMember.trades_used_month
    : 0

  if (currentMonth >= tradeLimit) {
    return { error: `Hai già effettuato ${tradeLimit} scambi questo mese` }
  }

  // Check accepter doesn't already have a pending trade for this driver
  const { data: existingTrades } = await admin
    .from('trades')
    .select('id, offer_json')
    .eq('league_id', leagueId)
    .eq('status', 'pending')
    .or(`proposer_user_id.eq.${user.id},accepter_user_id.eq.${user.id}`)

  if (existingTrades && existingTrades.length > 0) {
    for (const t of existingTrades) {
      const o = t.offer_json as Record<string, unknown>
      if (o.proposer_driver_id === proposerDriverId || o.accepter_driver_id === accepterDriverId) {
        return { error: 'Esiste già una proposta pendente per uno di questi piloti' }
      }
    }
  }

  const { data: accepterMember } = await admin
    .from('league_members')
    .select('credits_left')
    .eq('league_id', leagueId)
    .eq('user_id', accepterUserId)
    .single()

  if (!accepterMember) return { error: 'Il destinatario non è membro di questa lega' }

  const validation = validateTrade(
    proposerMember.credits_left,
    accepterMember.credits_left,
    creditAdjustment
  )

  if (!validation.valid) return { error: validation.error }

  // Verify ownership using roster IDs
  const { data: proposerRosterEntry } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('driver_id', proposerDriverId)
    .maybeSingle()

  if (!proposerRosterEntry) return { error: 'Non possiedi questo pilota' }

  const { data: accepterRosterEntry } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', accepterUserId)
    .eq('driver_id', accepterDriverId)
    .maybeSingle()

  if (!accepterRosterEntry) return { error: 'Il destinatario non possiede questo pilota' }

  // Store roster IDs in the offer for safe swapping later
  const { data: trade, error } = await admin
    .from('trades')
    .insert({
      league_id: leagueId,
      proposer_user_id: user.id,
      accepter_user_id: accepterUserId,
      offer_json: {
        proposer_driver_id: proposerDriverId,
        accepter_driver_id: accepterDriverId,
        proposer_roster_id: proposerRosterEntry.id,
        accepter_roster_id: accepterRosterEntry.id,
        credit_adjustment: creditAdjustment,
      },
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/league/${leagueId}/trades`)
  return { data: trade }
}

export async function acceptTrade(tradeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: trade } = await admin
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .single()

  if (!trade) return { error: 'Scambio non trovato' }
  if (trade.accepter_user_id !== user.id) return { error: 'Non sei il destinatario di questo scambio' }
  if (trade.status !== 'pending') return { error: 'Questo scambio non è più in attesa' }

  const offer = trade.offer_json as {
    proposer_driver_id: string
    accepter_driver_id: string
    proposer_roster_id?: string
    accepter_roster_id?: string
    credit_adjustment: number
  }

  // Re-verify ownership before executing the swap
  const { data: proposerRoster } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', trade.league_id)
    .eq('user_id', trade.proposer_user_id)
    .eq('driver_id', offer.proposer_driver_id)
    .maybeSingle()

  const { data: accepterRoster } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', trade.league_id)
    .eq('user_id', trade.accepter_user_id)
    .eq('driver_id', offer.accepter_driver_id)
    .maybeSingle()

  if (!proposerRoster || !accepterRoster) {
    // One of the drivers is no longer owned — auto-reject
    await admin
      .from('trades')
      .update({ status: 'rejected' })
      .eq('id', tradeId)
    revalidatePath(`/league/${trade.league_id}/trades`)
    return { error: 'Uno dei piloti non è più nel roster. Scambio annullato.' }
  }

  // Swap using roster row IDs to avoid conflict
  // Step 1: Set proposer's driver to a temp user_id (null-safe via unique roster IDs)
  await admin
    .from('rosters')
    .update({ user_id: trade.accepter_user_id, acquired_via: 'trade' })
    .eq('id', proposerRoster.id)

  await admin
    .from('rosters')
    .update({ user_id: trade.proposer_user_id, acquired_via: 'trade' })
    .eq('id', accepterRoster.id)

  // Handle credit adjustment
  if (offer.credit_adjustment !== 0) {
    const { data: proposerM } = await admin
      .from('league_members')
      .select('credits_left, credits_spent')
      .eq('league_id', trade.league_id)
      .eq('user_id', trade.proposer_user_id)
      .single()

    const { data: accepterM } = await admin
      .from('league_members')
      .select('credits_left, credits_spent')
      .eq('league_id', trade.league_id)
      .eq('user_id', trade.accepter_user_id)
      .single()

    if (proposerM && accepterM) {
      // Re-validate credits before applying
      if (offer.credit_adjustment > 0 && proposerM.credits_left < offer.credit_adjustment) {
        // Rollback the swap
        await admin.from('rosters').update({ user_id: trade.proposer_user_id, acquired_via: 'trade' }).eq('id', proposerRoster.id)
        await admin.from('rosters').update({ user_id: trade.accepter_user_id, acquired_via: 'trade' }).eq('id', accepterRoster.id)
        await admin.from('trades').update({ status: 'rejected' }).eq('id', tradeId)
        revalidatePath(`/league/${trade.league_id}/trades`)
        return { error: 'Crediti insufficienti. Scambio annullato.' }
      }

      await admin
        .from('league_members')
        .update({
          credits_left: proposerM.credits_left - offer.credit_adjustment,
          credits_spent: proposerM.credits_spent + Math.max(0, offer.credit_adjustment),
        })
        .eq('league_id', trade.league_id)
        .eq('user_id', trade.proposer_user_id)

      await admin
        .from('league_members')
        .update({
          credits_left: accepterM.credits_left + offer.credit_adjustment,
          credits_spent: Math.max(0, accepterM.credits_spent - offer.credit_adjustment),
        })
        .eq('league_id', trade.league_id)
        .eq('user_id', trade.accepter_user_id)
    }
  }

  // Mark trade as accepted
  await admin
    .from('trades')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', tradeId)

  // Increment trades_used_month for BOTH users
  const monthKey = getTradesMonthKey()
  for (const userId of [trade.proposer_user_id, trade.accepter_user_id]) {
    const { data: m } = await admin
      .from('league_members')
      .select('trades_used_month, trades_month_key')
      .eq('league_id', trade.league_id)
      .eq('user_id', userId)
      .single()

    if (m) {
      const currentUsed = m.trades_month_key === monthKey ? m.trades_used_month : 0
      await admin
        .from('league_members')
        .update({
          trades_used_month: currentUsed + 1,
          trades_month_key: monthKey,
        })
        .eq('league_id', trade.league_id)
        .eq('user_id', userId)
    }
  }

  // Cancel any other pending trades involving the same drivers in this league
  const { data: conflictingTrades } = await admin
    .from('trades')
    .select('id, offer_json')
    .eq('league_id', trade.league_id)
    .eq('status', 'pending')
    .neq('id', tradeId)

  if (conflictingTrades) {
    for (const ct of conflictingTrades) {
      const ctOffer = ct.offer_json as Record<string, unknown>
      const involvedDrivers = [offer.proposer_driver_id, offer.accepter_driver_id]
      if (
        involvedDrivers.includes(String(ctOffer.proposer_driver_id)) ||
        involvedDrivers.includes(String(ctOffer.accepter_driver_id))
      ) {
        await admin.from('trades').update({ status: 'expired' }).eq('id', ct.id)
      }
    }
  }

  await admin.from('audit_log').insert({
    league_id: trade.league_id,
    user_id: user.id,
    action: 'trade_accepted',
    details_json: { trade_id: tradeId },
  })

  revalidatePath(`/league/${trade.league_id}/trades`)
  revalidatePath(`/league/${trade.league_id}/roster`)
  return { success: true }
}

export async function rejectTrade(tradeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorizzato' }

  const admin = createAdminClient()

  const { data: trade } = await admin
    .from('trades')
    .select('league_id, accepter_user_id, proposer_user_id')
    .eq('id', tradeId)
    .single()

  if (!trade) return { error: 'Scambio non trovato' }
  const participants = [trade.accepter_user_id, trade.proposer_user_id]
  if (!participants.includes(user.id)) return { error: 'Non autorizzato' }

  await admin
    .from('trades')
    .update({ status: 'rejected' })
    .eq('id', tradeId)

  revalidatePath(`/league/${trade.league_id}/trades`)
  return { success: true }
}

export async function getLeagueTrades(leagueId: string) {
  const admin = createAdminClient()

  // Get trades
  const { data: trades } = await admin
    .from('trades')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })

  if (!trades || trades.length === 0) return []

  // Collect all user IDs and driver IDs to resolve names
  const userIds = new Set<string>()
  const driverIds = new Set<string>()
  for (const t of trades) {
    userIds.add(t.proposer_user_id)
    userIds.add(t.accepter_user_id)
    const offer = t.offer_json as Record<string, unknown>
    if (offer.proposer_driver_id) driverIds.add(String(offer.proposer_driver_id))
    if (offer.accepter_driver_id) driverIds.add(String(offer.accepter_driver_id))
  }

  // Fetch profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')
    .in('id', [...userIds])

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p.display_name ?? 'Unknown'
  }

  // Fetch driver names
  const { data: drivers } = await admin
    .from('drivers')
    .select('id, name, short_name')
    .in('id', [...driverIds])

  const driverMap: Record<string, string> = {}
  for (const d of drivers ?? []) {
    driverMap[d.id] = d.name ?? d.short_name ?? d.id
  }

  // Enrich trades
  return trades.map((t) => {
    const offer = t.offer_json as Record<string, unknown>
    return {
      ...t,
      proposer_name: profileMap[t.proposer_user_id] ?? 'Unknown',
      accepter_name: profileMap[t.accepter_user_id] ?? 'Unknown',
      proposer_driver_name: driverMap[String(offer.proposer_driver_id)] ?? String(offer.proposer_driver_id),
      accepter_driver_name: driverMap[String(offer.accepter_driver_id)] ?? String(offer.accepter_driver_id),
    }
  })
}
