import { createClient } from '@/lib/supabase/server'
import { getLeagueTrades } from '@/app/actions/trades'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { TradeProposalForm } from '@/components/league/TradeProposalForm'
import { TradeActions } from '@/components/league/TradeActions'
import { ArrowLeftRight } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export default async function TradesPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myMembership } = await supabase
    .from('league_members')
    .select('role, trades_used_month, trades_month_key, credits_left')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()
  if (!myMembership) notFound()

  const trades = await getLeagueTrades(id)

  // My roster
  const { data: myRoster } = await supabase
    .from('rosters')
    .select('*, driver:drivers(*)')
    .eq('league_id', id)
    .eq('user_id', user.id)

  // Other members + their rosters
  const { data: otherMembers } = await supabase
    .from('league_members')
    .select('user_id, profile:profiles(display_name)')
    .eq('league_id', id)
    .neq('user_id', user.id)

  const { data: othersRosters } = await supabase
    .from('rosters')
    .select('user_id, driver_id, driver:drivers(*)')
    .eq('league_id', id)
    .neq('user_id', user.id)

  const monthKey = new Date().toISOString().slice(0, 7)
  const tradesUsed = (myMembership as Record<string, unknown>).trades_month_key === monthKey
    ? Number((myMembership as Record<string, unknown>).trades_used_month ?? 0)
    : 0
  const canTrade = tradesUsed < 1

  const statusVariant: Record<string, 'green' | 'red' | 'gray' | 'yellow'> = {
    pending: 'yellow',
    accepted: 'green',
    rejected: 'red',
    expired: 'gray',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Scambi</h1>
          <p className="text-f1-gray text-sm">
            {tradesUsed}/1 scambi usati questo mese
            {!canTrade && <span className="text-f1-red ml-2">Limite raggiunto</span>}
          </p>
        </div>
        {canTrade && <Badge variant="green">Puoi proporre</Badge>}
      </div>

      <LeagueNav leagueId={id} isAdmin={(myMembership as Record<string, unknown>).role === 'admin'} />

      {/* Propose trade */}
      {canTrade && (myRoster?.length ?? 0) > 0 && (otherMembers?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Proponi uno scambio
              </span>
            </CardTitle>
          </CardHeader>
          <TradeProposalForm
            leagueId={id}
            myRoster={(myRoster ?? []) as Record<string, unknown>[]}
            otherMembers={(otherMembers ?? []) as Record<string, unknown>[]}
            othersRosters={(othersRosters ?? []) as Record<string, unknown>[]}
            myCreditsLeft={Number((myMembership as Record<string, unknown>).credits_left ?? 200)}
          />
        </Card>
      )}

      {/* Trade history */}
      <Card>
        <CardHeader>
          <CardTitle>Storico scambi</CardTitle>
        </CardHeader>
        {trades.length === 0 ? (
          <p className="text-f1-gray text-sm text-center py-6">Nessuno scambio ancora</p>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => {
              const t = trade as Record<string, unknown>
              const offer = t.offer_json as Record<string, unknown>
              const isRecipient = t.accepter_user_id === user.id
              const isPending = t.status === 'pending'
              const proposer = (t.proposer as Record<string, unknown>)?.display_name ?? 'Unknown'
              const accepter = (t.accepter as Record<string, unknown>)?.display_name ?? 'Unknown'

              return (
                <div key={String(t.id)} className="border border-f1-gray-dark rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-f1-gray">
                      <span className="font-semibold text-white">{String(proposer)}</span>
                      <ArrowLeftRight className="w-3 h-3" />
                      <span className="font-semibold text-white">{String(accepter)}</span>
                    </div>
                    <Badge variant={statusVariant[String(t.status)] ?? 'gray'}>
                      {String(t.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-f1-gray-light">
                      {String(offer?.proposer_driver_id ?? '')}
                    </span>
                    <ArrowLeftRight className="w-3 h-3 text-f1-red" />
                    <span className="text-f1-gray-light">
                      {String(offer?.accepter_driver_id ?? '')}
                    </span>
                    {Number(offer?.credit_adjustment ?? 0) !== 0 && (
                      <span className="text-yellow-400 font-bold">
                        +{String(offer?.credit_adjustment ?? 0)} cr
                      </span>
                    )}
                  </div>
                  {isPending && isRecipient && (
                    <TradeActions tradeId={String(t.id)} />
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
