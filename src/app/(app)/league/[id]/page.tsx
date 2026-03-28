import { createAdminClient, createClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { CopyCode } from '@/components/league/CopyCode'
import { LiveSessionBanner } from '@/components/league/LiveSessionBanner'

interface Props { params: Promise<{ id: string }> }

export default async function LeaguePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: league } = await admin
    .from('leagues')
    .select(`*, league_members(*, profile:profiles(*))`)
    .eq('id', id)
    .single()

  if (!league) notFound()

  const members = (league.league_members ?? []) as Array<Record<string, unknown>>
  const myMembership = members.find((m) => m.user_id === user.id)
  if (!myMembership) notFound()

  const isAdmin = myMembership.role === 'admin'

  // Next GP (upcoming or qualifying/race — whatever is currently active)
  const { data: activeGp } = await admin
    .from('grands_prix')
    .select('*')
    .in('status', ['upcoming', 'qualifying', 'race'])
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle()
  const nextGp = activeGp

  // Live session data
  const leagueSettings = (league.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = (leagueSettings.live_sessions as Record<string, { is_active: boolean; is_final: boolean }>) ?? {}
  const nextGpId = nextGp ? String((nextGp as Record<string, unknown>).id) : null
  const nextGpLiveSession = nextGpId ? (liveSessions[nextGpId] ?? null) : null

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="absolute left-0 top-0 w-1 h-12 bg-gradient-to-b from-f1-red/60 to-transparent rounded-full" />
        <div className="flex items-start justify-between mb-1 pl-4">
          <h1 className="text-3xl font-black drop-shadow-lg">{String(league.name)}</h1>
          <Badge variant={isAdmin ? 'red' : 'default'}>{String(myMembership.role).toUpperCase()}</Badge>
        </div>
        <p className="text-f1-gray text-sm pl-4 uppercase tracking-wider font-medium">Stagione 2026 · {members.length}/{league.max_players} giocatori</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      {/* Live Session Banner for current/next GP */}
      {nextGp && nextGpId && (
        <LiveSessionBanner
          leagueId={id}
          gpId={nextGpId}
          gpName={String((nextGp as Record<string, unknown>).name)}
          gpRound={Number((nextGp as Record<string, unknown>).round)}
          session={nextGpLiveSession}
          isAdmin={isAdmin}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invite code - Premium glassmorphism */}
        <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-f1-red/20 rounded-full blur-3xl pointer-events-none opacity-60" />
          <CardHeader className="relative pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">🔗</span>
              <span>Codice invito</span>
            </CardTitle>
          </CardHeader>
          <div className="relative z-10">
            <CopyCode code={String(league.code)} />
            <p className="text-f1-gray text-xs mt-4 text-center leading-relaxed font-medium">
              Condividi questo codice con i tuoi amici per farli entrare nella lega
            </p>
          </div>
        </Card>

        {/* Members with better styling - glassmorphism cards */}
        <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-f1-red drop-shadow-[0_0_8px_rgba(232,0,45,0.4)]" />
              <span>Giocatori</span>
              <span className="text-f1-red font-black ml-auto">{members.length}</span>
            </CardTitle>
          </CardHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-f1-red/40 scrollbar-track-transparent">
            {members.map((m, idx) => {
              const profile = m.profile as Record<string, unknown>
              const displayName = String(profile?.display_name ?? 'Unknown')
              return (
                <div
                  key={String(m.user_id)}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/3 border border-white/10 transition-all duration-200 hover:border-f1-red/50 hover:bg-f1-red/10 hover:shadow-[0_0_12px_rgba(232,0,45,0.15)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar with admin indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-f1-red/60 to-f1-red/30 flex items-center justify-center text-xs font-bold text-white border border-f1-red/60 drop-shadow-[0_0_8px_rgba(232,0,45,0.2)]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      {m.role === 'admin' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-f1-red rounded-full border border-f1-black flex items-center justify-center text-[8px] font-bold drop-shadow-lg">
                          👑
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white truncate">{displayName}</span>
                      {m.role === 'admin' && <Badge variant="red" className="text-[8px] ml-1">ADMIN</Badge>}
                    </div>
                  </div>
                  <span className="text-f1-red text-xs font-black whitespace-nowrap ml-2 drop-shadow-[0_0_4px_rgba(232,0,45,0.3)]">{String(m.credits_left ?? 200)} cr</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Budget summary with visual bars - enhanced styling */}
        <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">💰</span>
              <span>Il tuo budget</span>
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {/* Total budget */}
            <div className="p-3 rounded-lg bg-white/3 border border-white/10">
              <div className="flex justify-between items-center mb-1">
                <span className="text-f1-gray text-xs font-bold uppercase tracking-widest">Budget totale</span>
                <span className="text-white font-black text-xl">{String(myMembership.credits_total ?? 200)}</span>
              </div>
              <span className="text-f1-gray text-[10px] uppercase tracking-widest font-semibold">credits</span>
            </div>

            {/* Spent vs Available with enhanced progress bar */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-f1-red font-black uppercase tracking-widest">Spesi</span>
                <span className="text-f1-red font-black">{String(myMembership.credits_spent ?? 0)} / {String(myMembership.credits_total ?? 200)} cr</span>
              </div>
              <div className="w-full bg-f1-gray-dark/80 rounded-full h-4 overflow-hidden border border-f1-red/40 shadow-inset">
                <div
                  className="bg-gradient-to-r from-yellow-400 via-orange-400 to-f1-red h-4 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(232,0,45,0.6)]"
                  style={{ width: `${((Number(myMembership.credits_spent) || 0) / (Number(myMembership.credits_total) || 200)) * 100}%` }}
                />
              </div>
            </div>

            {/* Remaining balance - highlighted */}
            <div className="p-3.5 rounded-lg bg-gradient-to-r from-green-500/15 to-green-400/5 border border-green-500/40 shadow-[0_0_12px_rgba(74,222,128,0.15)]">
              <div className="flex justify-between items-center">
                <span className="text-f1-gray text-xs font-bold uppercase tracking-widest">Rimanenti</span>
                <div className="text-right">
                  <span className="text-green-400 font-black text-2xl drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">{String(myMembership.credits_left ?? 200)}</span>
                  <p className="text-green-400/70 text-[10px] uppercase tracking-widest font-semibold">cr disponibili</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Next GP with red glow effect */}
        {nextGp && (
          <Card className="relative overflow-hidden bg-gradient-to-br from-white/5 via-transparent to-f1-red/5 backdrop-blur-md border border-f1-red/40 shadow-[0_0_30px_rgba(232,0,45,0.2)]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-f1-red/20 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
            <CardHeader className="relative pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl animate-pulse">🏁</span>
                <span>Prossimo GP</span>
              </CardTitle>
            </CardHeader>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-f1-red/30">
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-f1-red via-red-500 to-red-600 drop-shadow-xl">
                  R{(nextGp as Record<string, unknown>).round as number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-lg leading-tight">{String((nextGp as Record<string, unknown>).name)}</p>
                  <p className="text-f1-gray text-xs uppercase tracking-widest font-semibold mt-1">{String((nextGp as Record<string, unknown>).circuit)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-f1-gray"><span className="text-white font-bold">{new Date(String((nextGp as Record<string, unknown>).date)).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}</span></span>
                {Boolean((nextGp as Record<string, unknown>).has_sprint) && (
                  <Badge variant="yellow" className="ml-auto font-black">SPRINT</Badge>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
