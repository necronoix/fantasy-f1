import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Radio } from 'lucide-react'
import { CircuitMap } from '@/components/f1/CircuitMap'

// Country flag emojis mapped by GP id
const COUNTRY_FLAGS: Record<string, string> = {
  aus_2026: '🇦🇺', chn_2026: '🇨🇳', jpn_2026: '🇯🇵', bhr_2026: '🇧🇭',
  ksa_2026: '🇸🇦', sau_2026: '🇸🇦', mia_2026: '🇺🇸', mon_2026: '🇲🇨',
  esp_2026: '🇪🇸', mad_2026: '🇪🇸', can_2026: '🇨🇦', aut_2026: '🇦🇹',
  gbr_2026: '🇬🇧', bel_2026: '🇧🇪', hun_2026: '🇭🇺', ned_2026: '🇳🇱',
  ita_2026: '🇮🇹', aze_2026: '🇦🇿', sin_2026: '🇸🇬', usa_2026: '🇺🇸',
  mex_2026: '🇲🇽', bra_2026: '🇧🇷', lv_2026: '🇺🇸', qat_2026: '🇶🇦',
  abu_2026: '🇦🇪',
}

// City names for each GP
const CITY_NAMES: Record<string, string> = {
  aus_2026: 'MELBOURNE', chn_2026: 'SHANGHAI', jpn_2026: 'SUZUKA', bhr_2026: 'SAKHIR',
  ksa_2026: 'JEDDAH', mia_2026: 'MIAMI', mon_2026: 'MONTE CARLO', esp_2026: 'BARCELONA',
  can_2026: 'MONTREAL', aut_2026: 'SPIELBERG', gbr_2026: 'SILVERSTONE', bel_2026: 'SPA',
  hun_2026: 'BUDAPEST', ned_2026: 'ZANDVOORT', ita_2026: 'MONZA', aze_2026: 'BAKU',
  sin_2026: 'SINGAPORE', usa_2026: 'AUSTIN', mex_2026: 'MEXICO CITY', bra_2026: 'SAO PAULO',
  lv_2026: 'LAS VEGAS', qat_2026: 'LUSAIL', abu_2026: 'YAS MARINA', mad_2026: 'MADRID',
}

// Country color accents for left border (flag-inspired)
const COUNTRY_ACCENT: Record<string, string> = {
  aus_2026: '#00843D', chn_2026: '#DE2910', jpn_2026: '#BC002D', bhr_2026: '#CE1126',
  ksa_2026: '#006C35', mia_2026: '#3C3B6E', mon_2026: '#CE1126', esp_2026: '#F1BF00',
  can_2026: '#FF0000', aut_2026: '#ED2939', gbr_2026: '#012169', bel_2026: '#FDDA24',
  hun_2026: '#477050', ned_2026: '#FF6600', ita_2026: '#008C45', aze_2026: '#00B5E2',
  sin_2026: '#EF3340', usa_2026: '#3C3B6E', mex_2026: '#006847', bra_2026: '#009739',
  lv_2026: '#3C3B6E', qat_2026: '#8D1B3D', abu_2026: '#00732F', mad_2026: '#F1BF00',
}

interface Props { params: Promise<{ id: string }> }

export default async function GpListPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: myMembership } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myMembership) notFound()

  const { data: gps } = await admin
    .from('grands_prix')
    .select('*')
    .eq('season_id', 2026)
    .order('round', { ascending: true })

  const { data: mySelections } = await admin
    .from('gp_selections')
    .select('gp_id, captain_driver_id')
    .eq('league_id', id)
    .eq('user_id', user.id)
  const selectedGpIds = new Set((mySelections ?? []).map(s => String((s as Record<string, unknown>).gp_id)))

  // Live sessions data
  const { data: leagueData } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', id)
    .single()
  const leagueSettings = (leagueData?.settings_json as Record<string, unknown>) ?? {}
  const liveSessions = (leagueSettings.live_sessions as Record<string, { is_active: boolean; is_final: boolean }>) ?? {}
  const isAdmin = (myMembership as Record<string, unknown>).role === 'admin'

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="absolute left-0 top-0 w-2 h-12 bg-gradient-to-b from-f1-red to-f1-red/20 rounded-r-full" />
        <h1 className="text-4xl font-black pl-4 flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-f1-red" />
          Calendario GP
        </h1>
        <p className="text-f1-gray text-sm pl-4 uppercase tracking-widest font-semibold mt-1">Stagione 2026 · 24 round</p>
      </div>

      <LeagueNav leagueId={id} isAdmin={(myMembership as Record<string, unknown>).role === 'admin'} />

      {/* GP Cards Grid - matching reference image style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(gps ?? []).map((gp) => {
          const gpId = String(gp.id)
          const hasSelection = selectedGpIds.has(gpId)
          const isCompleted = gp.status === 'completed'
          const isRace = gp.status === 'race'
          const isQualifying = gp.status === 'qualifying'
          const accentColor = COUNTRY_ACCENT[gpId] ?? '#E8002D'
          const cityName = CITY_NAMES[gpId] ?? String(gp.circuit ?? '')
          const liveSession = liveSessions[gpId] ?? null
          const hasActiveLive = liveSession?.is_active === true

          return (
            <Link key={gpId} href={`/league/${id}/gp/${gp.id}`} className="block group">
              <div
                className="relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(232,0,45,0.3)]"
                style={{
                  background: 'linear-gradient(135deg, rgba(40,40,50,0.9) 0%, rgba(25,25,35,0.95) 100%)',
                  border: `2px solid rgba(232,0,45,0.4)`,
                }}
              >
                {/* Top red gradient stripe */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />

                {/* Left country color accent */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-[3px]"
                  style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}60)` }}
                />

                {/* Header: Round + Country Name */}
                <div className="px-4 pt-4 pb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-f1-red font-black text-xl tracking-tight">R{String(gp.round)}</span>
                    <div>
                      <p className="text-white font-black text-sm uppercase tracking-wider leading-tight">{String(gp.name).replace(' Grand Prix', '').replace(' GP', '')}</p>
                      <p className="text-f1-gray text-[10px] uppercase tracking-widest font-bold">Grand Prix</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasSelection && (
                      <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
                    )}
                    {isCompleted && <Badge variant="green" className="text-[8px] px-1.5 py-0.5">DONE</Badge>}
                    {isRace && <Badge variant="red" className="text-[8px] px-1.5 py-0.5">RACE</Badge>}
                    {isQualifying && <Badge variant="yellow" className="text-[8px] px-1.5 py-0.5">QUALI</Badge>}
                    {hasActiveLive && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 text-[8px] font-black">LIVE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Circuit Layout - Center */}
                <div className="px-6 py-4 flex items-center justify-center min-h-[120px]">
                  <div className="w-full h-24 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                    <CircuitMap circuitId={gpId} color="white" accentColor="#E8002D" className="w-full h-full" />
                  </div>
                </div>

                {/* Footer: Date + City */}
                <div className="px-4 pb-4 flex items-end justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{COUNTRY_FLAGS[gpId] ?? '🏁'}</span>
                    <span className="text-f1-gray text-xs font-semibold uppercase tracking-wider">
                      {new Date(String(gp.date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                    </span>
                  </div>
                  {hasActiveLive ? (
                    <Link
                      href={`/league/${id}/gp/${gpId}/live`}
                      className="flex items-center gap-1 text-red-400 text-xs font-black hover:text-red-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Radio className="w-3 h-3" />
                      ENTRA LIVE →
                    </Link>
                  ) : (
                    <span className="text-white font-black text-sm uppercase tracking-wider">
                      {cityName}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
