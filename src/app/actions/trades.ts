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

  const admin = createAdminClient()
  const monthKey = getTradesMonthKey()

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

  if (currentMonth >= 1) {
    return { error: 'Hai già effettuato uno scambio questo mese' }
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

  const { data: proposerDriver } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('driver_id', proposerDriverId)
    .maybeSingle()

  if (!proposerDriver) return { error: 'Non possiedi questo pilota' }

  const { data: accepterDriver } = await admin
    .from('rosters')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', accepterUserId)
    .eq('driver_id', accepterDriverId)
    .maybeSingle()

  if (!accepterDriver) return { error: 'Il destinatario non possiede questo pilota' }

  const { data: trade, error } = await admin
    .from('trades')
    .insert({
      league_id: leagueId,
      proposer_user_id: user.id,
      accepter_user_id: accepterUserId,
      offer_json: {
        proposer_driver_id: proposerDriverId,
        accepter_driver_id: accepterDriverId,
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
    credit_adjustment: number
  }

  await admin
    .from('rosters')
    .update({ user_id: trade.accepter_user_id, acquired_via: 'trade' })
    .eq('league_id', trade.league_id)
    .eq('user_id', trade.proposer_user_id)
    .eq('driver_id', offer.proposer_driver_id)

  await admin
    .from('rosters')
    .update({ user_id: trade.proposer_user_id, acquired_via: 'trade' })
    .eq('league_id', trade.league_id)
    .eq('user_id', trade.accepter_user_id)
    .eq('driver_id', offer.accepter_driver_id)

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

  await admin
    .from('trades')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', tradeId)

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

  const { data } = await admin
    .from('trades')
    .select(`
      *,
      proposer:profiles!trades_proposer_user_id_fkey(display_name),
      accepter:profiles!trades_accepter_user_id_fkey(display_name)
    `)
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })

  return data ?? []
}
