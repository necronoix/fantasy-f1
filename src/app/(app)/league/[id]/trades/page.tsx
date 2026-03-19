import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLeagueTrades } from '@/app/actions/trades'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { TradeProposalForm } from '@/components/league/TradeProposalForm'
import { TradeActions } from '@/components/league/TradeActions'
import { ArrowLeftRight, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getTradesMonthKey } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export default async function TradesPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: myMembership } = await admin
    .from('league_members')
    .select('role, trades_used_month, trades_month_key, credits_left')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myMembership) notFound()

  // Get league settings for trade limit
  const { data: league } = await admin
    .from('leagues')
    .select('settings_json')
    .eq('id', id)
    .single()

  const settings = (league?.settings_json ?? {}) as Record<string, unknown>
  const tradeLimit = Number(settings.trade_limit_per_month ?? 2)

  const trades = await getLeagueTrades(id)

  // My roster
  const { data: myRoster } = await admin
    .from('rosters')
    .select('*, driver:drivers(id, name, short_name, team:teams(name, color))')
    .eq('league_id', id)
    .eq('user_id', user.id)

  // Other members + their rosters
  const { data: otherMembers } = await admin
    .from('league_members')
    .select('user_id, profile:profiles(display_name)')
    .eq('league_id', id)
    .neq('user_id', user.id)

  const { data: othersRosters } = await admin
    .from('rosters')
    .select('user_id, driver_id, driver:drivers(id, name, short_name, team:teams(name, color))')
    .eq('league_id', id)
    .neq('user_id', user.id)

  const monthKey = getTradesMonthKey()
  const tradesUsed = myMembership.trades_month_key === monthKey
    ? Number(myMembership.trades_used_month ?? 0)
    : 0
  const canTrade = tradesUsed < tradeLimit
  const hasRoster = (myRoster?.length ?? 0) > 0
  const hasOthers = (otherMembers?.length ?? 0) > 0

  // Count pending trades for current user
  const pendingForMe = trades.filter(
    (t) => (t as Record<string, unknown>).accepter_user_id === user.id && (t as Record<string, unknown>).status === 'pending'
  ).length

  const statusConfig: Record<string, { variant: 'green' | 'red' | 'gray' | 'yellow'; icon: typeof Clock; label: string }> = {
    pending: { variant: 'yellow', icon: Clock, label: 'In attesa' },
    accepted: { variant: 'green', icon: CheckCircle, label: 'Accettato' },
    rejected: { variant: 'red', icon: XCircle, label: 'Rifiutato' },
    expired: { variant: 'gray', icon: AlertCircle, label: 'Scaduto' },
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="absolute left-0 top-0 w-2 h-12 bg-gradient-to-b from-f1-red to-f1-red/20 rounded-r-full" />
        <h1 className="text-4xl font-black pl-4 text-white drop-shadow-lg">Scambi</h1>
        <p className="text-f1-gray text-sm pl-4 uppercase tracking-widest font-semibold mt-1">
          {tradesUsed}/{tradeLimit} scambi usati questo mese
          {pendingForMe > 0 && (
            <span className="text-yellow-400 ml-3">{pendingForMe} proposta{pendingForMe > 1 ? 'e' : ''} in attesa</span>
          )}
        </p>
      </div>

      <LeagueNav leagueId={id} isAdmin={myMembership.role === 'admin'} />

      {/* Propose trade - always visible */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-f1-red" />
              Proponi uno scambio
            </span>
          </CardTitle>
          {!canTrade && (
            <p className="text-f1-red text-xs font-semibold mt-1">
              Hai raggiunto il limite di {tradeLimit} scambi per questo mese
            </p>
          )}
          {!hasRoster && (
            <p className="text-f1-gray text-xs mt-1">
              Devi avere almeno un pilota nel roster per proporre uno scambio
            </p>
          )}
        </CardHeader>
        {canTrade && hasRoster && hasOthers ? (
          <TradeProposalForm
            leagueId={id}
            myRoster={(myRoster ?? []) as Record<string, unknown>[]}
            otherMembers={(otherMembers ?? []) as Record<string, unknown>[]}
            othersRosters={(othersRosters ?? []) as Record<string, unknown>[]}
            myCreditsLeft={Number(myMembership.credits_left ?? 200)}
          />
        ) : (
          <div className="px-4 pb-4">
            {canTrade && !hasRoster && (
              <p className="text-f1-gray text-sm text-center py-4">Acquista piloti all&apos;asta prima di proporre scambi</p>
            )}
          </div>
        )}
      </Card>

      {/* Trade history */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-f1-red via-red-500 to-f1-red" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Storico scambi
          </CardTitle>
        </CardHeader>
        {trades.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-8">Nessuno scambio ancora</p>
        ) : (
          <div className="space-y-3 px-4 pb-4">
            {trades.map((trade) => {
              const t = trade as Record<string, unknown>
              const offer = t.offer_json as Record<string, unknown>
              const isRecipient = t.accepter_user_id === user.id
              const isProposer = t.proposer_user_id === user.id
              const isPending = t.status === 'pending'
              const proposerName = String(t.proposer_name ?? 'Unknown')
              const accepterName = String(t.accepter_name ?? 'Unknown')
              const proposerDriverName = String(t.proposer_driver_name ?? offer?.proposer_driver_id ?? '?')
              const accepterDriverName = String(t.accepter_driver_name ?? offer?.accepter_driver_id ?? '?')
              const creditAdj = Number(offer?.credit_adjustment ?? 0)
              const config = statusConfig[String(t.status)] ?? statusConfig.expired
              const StatusIcon = config!.icon

              return (
                <div
                  key={String(t.id)}
                  className={`border rounded-xl p-4 transition-all ${
                    isPending && isRecipient
                      ? 'border-yellow-500/50 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                      : isPending && isProposer
                      ? 'border-f1-red/30 bg-f1-red/5'
                      : 'border-f1-gray-dark/50 bg-white/2'
                  }`}
                >
                  {/* Header: Players + status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-bold ${isProposer ? 'text-f1-red' : 'text-white'}`}>
                        {proposerName}
                        {isProposer && <span className="text-f1-gray text-xs ml-1">(tu)</span>}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-f1-gray" />
                      <span className={`font-bold ${isRecipient ? 'text-f1-red' : 'text-white'}`}>
                        {accepterName}
                        {isRecipient && <span className="text-f1-gray text-xs ml-1">(tu)</span>}
                      </span>
                    </div>
                    <Badge variant={config!.variant}>
                      <StatusIcon className="w-3 h-3 mr-1 inline" />
                      {config!.label}
                    </Badge>
                  </div>

                  {/* Trade details: Driver swap */}
                  <div className="flex items-center gap-3 bg-f1-black-light/50 rounded-lg p-3">
                    <div className="flex-1 text-center">
                      <p className="text-f1-gray text-[10px] uppercase tracking-wider font-semibold mb-1">Offre</p>
                      <p className="text-white font-bold text-sm">{proposerDriverName}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowLeftRight className="w-5 h-5 text-f1-red" />
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-f1-gray text-[10px] uppercase tracking-wider font-semibold mb-1">Riceve</p>
                      <p className="text-white font-bold text-sm">{accepterDriverName}</p>
                    </div>
                  </div>

                  {/* Credit adjustment */}
                  {creditAdj !== 0 && (
                    <div className="mt-2 text-center">
                      <span className="text-yellow-400 font-bold text-xs bg-yellow-400/10 px-3 py-1 rounded-full">
                        {creditAdj > 0 ? `${proposerName} aggiunge ${creditAdj} crediti` : `${accepterName} aggiunge ${Math.abs(creditAdj)} crediti`}
                      </span>
                    </div>
                  )}

                  {/* Created date */}
                  <p className="text-f1-gray text-[10px] mt-2 text-right">
                    {new Date(String(t.created_at)).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {/* Actions for recipient */}
                  {isPending && isRecipient && (
                    <TradeActions tradeId={String(t.id)} />
                  )}

                  {/* Cancel for proposer */}
                  {isPending && isProposer && (
                    <TradeActions tradeId={String(t.id)} isProposer />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
