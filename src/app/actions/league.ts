'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { generateLeagueCode, getTradesMonthKey, DEFAULT_SCORING_RULES } from '@/lib/utils'

const CreateLeagueSchema = z.object({
  name: z.string().min(3).max(50),
  timezone: z.string().default('Europe/Rome'),
  max_players: z.number().int().min(2).max(5).default(5),
})

export async function createLeague(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = CreateLeagueSchema.safeParse({
    name: formData.get('name'),
    timezone: formData.get('timezone') || 'Europe/Rome',
    max_players: Number(formData.get('max_players')) || 5,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const code = generateLeagueCode()
  // Use admin client for writes to avoid RLS issues with server actions
  const admin = createAdminClient()

  const { data: league, error: leagueError } = await admin
    .from('leagues')
    .insert({
      name: parsed.data.name,
      code,
      owner_user_id: user.id,
      season_id: 2026,
      max_players: parsed.data.max_players,
      roster_size: 4,
      budget: 200,
      settings_json: {
        timezone: parsed.data.timezone,
        qualifying_lock_hours: 2,
        race_lock_hours: 1,
        bid_timer_seconds: 20,
        trade_limit_per_month: 1,
      },
    })
    .select()
    .single()

  if (leagueError) return { error: leagueError.message }

  // Add creator as admin member
  await admin.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    role: 'admin',
    credits_total: 200,
    credits_spent: 0,
    credits_left: 200,
    trades_used_month: 0,
    trades_month_key: getTradesMonthKey(),
  })

  // Create default scoring rules
  await admin.from('scoring_rules').insert({
    league_id: league.id,
    version: 1,
    rules_json: DEFAULT_SCORING_RULES,
    active: true,
  })

  await admin.from('audit_log').insert({
    league_id: league.id,
    user_id: user.id,
    action: 'league_created',
    details_json: { name: parsed.data.name, code },
  })

  revalidatePath('/dashboard')
  redirect(`/league/${league.id}`)
}

export async function joinLeague(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = (formData.get('code') as string)?.toUpperCase().trim()
  if (!code || code.length !== 6) return { error: 'Codice lega non valido' }

  // Use admin client to find league by code (user isn't a member yet, RLS would block SELECT)
  const admin = createAdminClient()
  const { data: league, error: findError } = await admin
    .from('leagues')
    .select('*')
    .eq('code', code)
    .single()

  if (findError || !league) return { error: 'Lega non trovata' }

  // Already a member?
  const { data: existing } = await admin
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .single()

  if (existing) redirect(`/league/${league.id}`)

  // Check max players
  const { count } = await admin
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', league.id)

  if (count !== null && count >= league.max_players) {
    return { error: 'La lega è al completo' }
  }

  const { error: joinError } = await admin.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    role: 'player',
    credits_total: 200,
    credits_spent: 0,
    credits_left: 200,
    trades_used_month: 0,
    trades_month_key: getTradesMonthKey(),
  })

  if (joinError) return { error: joinError.message }

  await admin.from('audit_log').insert({
    league_id: league.id,
    user_id: user.id,
    action: 'member_joined',
    details_json: {},
  })

  revalidatePath('/dashboard')
  redirect(`/league/${league.id}`)
}

export async function getMyLeagues(userId: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('league_members')
    .select('*, league:leagues(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  return data ?? []
}

export async function getLeagueDetails(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('leagues')
    .select(`
      *,
      league_members(
        *,
        profile:profiles(*)
      )
    `)
    .eq('id', leagueId)
    .single()

  return data
}
