'use client'

import { placeBid } from '@/app/actions/auction'
import { closeTeamAuction } from '@/app/actions/team-auction'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getTimerSeconds } from '@/lib/utils'
import { validateAuctionBid } from '@/lib/scoring'
import { Gavel, Clock, Crown, TrendingUp, Shield } from 'lucide-react'
import { TEAM_COLORS, TEAM_NAMES } from '@/components/f1/f1-data'

interface Props {
  leagueId: string
  auction: Record<string, unknown>
  initialBids: Record<string, unknown>[]
  userId: string
  userDisplayName: string
  userCreditsLeft: number
  isAdmin: boolean
  hasTeam: boolean
}

export function TeamAuctionRoom({
  leagueId,
  auction: initialAuction,
  initialBids,
  userId,
  userDisplayName,
  userCreditsLeft,
  isAdmin,
  hasTeam,
}: Props) {
  const [auction, setAuction] = useState(initialAuction)
  const [bids, setBids] = useState(initialBids)
  const [bidAmount, setBidAmount] = useState(Number(initialAuction.current_bid ?? 1) + 1)
  const [timeLeft, setTimeLeft] = useState(getTimerSeconds(String(initialAuction.ends_at)))
  const [pending, startTransition] = useTransition()

  const leader = auction.leader as Record<string, unknown> | null
  const currentBid = Number(auction.current_bid ?? 1)
  const leaderUserId = String(auction.leader_user_id ?? '')
  const isLeading = leaderUserId === userId
  const auctionId = String(auction.id)
  const isExpired = timeLeft <= 0

  // Team info
  const teamId = String(auction.target_team_id ?? (auction.metadata_json as Record<string, unknown>)?.team_id ?? '')
  const teamColor = TEAM_COLORS[teamId] ?? '#888'
  const teamName = TEAM_NAMES[teamId] ?? teamId

  // Validation — use roster count 0 and max 1 for team auctions (simplified)
  const validation = validateAuctionBid(bidAmount, currentBid, userCreditsLeft, 0, 1, 200)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const auctionSub = supabase
      .channel(`auction:${auctionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'auction_state',
        filter: `id=eq.${auctionId}`,
      }, (payload) => {
        setAuction(prev => ({ ...prev, ...payload.new }))
        setTimeLeft(getTimerSeconds(String(payload.new.ends_at)))
        setBidAmount(Number(payload.new.current_bid) + 1)
        if (payload.new.status === 'closed') {
          toast.success('Asta scuderia chiusa!')
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
        filter: `auction_id=eq.${auctionId}`,
      }, (payload) => {
        const newBid = payload.new as Record<string, unknown>
        if (newBid.user_id === userId) {
          newBid.profile = { display_name: userDisplayName }
        }
        setBids(prev => [newBid, ...prev.slice(0, 19)])
        if (payload.new.user_id !== userId) {
          toast(`Nuova offerta: ${payload.new.amount} cr`, { icon: '💰' })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(auctionSub) }
  }, [auctionId, userId])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimerSeconds(String(auction.ends_at)))
    }, 500)
    return () => clearInterval(interval)
  }, [auction.ends_at])

  const handleBid = useCallback(() => {
    startTransition(async () => {
      const result = await placeBid(auctionId, bidAmount)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(`Offerta di ${bidAmount} cr effettuata!`)
        setBidAmount(bidAmount + 1)
      }
    })
  }, [auctionId, bidAmount])

  const handleClose = useCallback(() => {
    startTransition(async () => {
      const result = await closeTeamAuction(auctionId)
      if (result?.error) toast.error(result.error)
    })
  }, [auctionId])

  const timerPct = Math.min(100, (timeLeft / 20) * 100)
  const timerColor = timeLeft <= 8 ? 'bg-red-500' : timeLeft <= 15 ? 'bg-yellow-500' : 'bg-green-500'

  if (auction.status === 'closed') {
    return (
      <div className="bg-f1-black-light border border-f1-gray-dark rounded-xl p-6 text-center">
        <div className="text-5xl mb-3">🏁</div>
        <p className="text-xl font-black text-white mb-1">Asta scuderia chiusa!</p>
        {auction.leader_user_id ? (
          <p className="text-f1-gray-light text-sm">
            <span className="font-bold" style={{ color: teamColor }}>{teamName}</span> aggiudicata a{' '}
            <span className="text-f1-red font-bold">{String((leader as Record<string, unknown>)?.display_name ?? 'Unknown')}</span> per {currentBid} cr
          </p>
        ) : (
          <p className="text-f1-gray-light text-sm">Nessuna offerta — scuderia non assegnata</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team card */}
      <div className="bg-gradient-to-br from-f1-red/20 to-f1-black-light border rounded-xl p-5" style={{ borderColor: `${teamColor}40` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: teamColor }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: teamColor }}>
              Asta Scuderia
            </span>
          </div>
          <Badge variant={isExpired ? 'red' : 'green'} className="animate-pulse-red">
            LIVE
          </Badge>
        </div>

        {/* Team display */}
        <div className="mb-6">
          <div className="flex items-center gap-6 bg-f1-black-light/60 rounded-lg p-5" style={{
            border: `2px solid ${teamColor}40`,
            boxShadow: `inset 0 0 20px ${teamColor}20`
          }}>
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-xl flex items-center justify-center" style={{
                backgroundColor: teamColor,
                boxShadow: `0 0 20px ${teamColor}40`
              }}>
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-white mb-1">{teamName}</h2>
              <p className="text-sm font-semibold" style={{ color: teamColor }}>Scuderia</p>
            </div>
          </div>
        </div>

        {/* Current bid */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-f1-gray text-xs uppercase tracking-wider mb-1">Offerta attuale</p>
            <p className="text-5xl font-black text-white">{currentBid}<span className="text-xl text-f1-gray ml-1">cr</span></p>
          </div>
          <div className="text-right">
            {leaderUserId && (
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {isLeading ? 'Tu stai vincendo!' : String((leader as Record<string, unknown>)?.display_name ?? 'Unknown')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-f1-gray-light mt-1">
              <Clock className="w-4 h-4" />
              <span className={`text-2xl font-black ${timeLeft <= 8 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full bg-f1-gray-dark rounded-full h-1.5 mb-4">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        {/* Bid controls */}
        {!isExpired && (
          <div className="space-y-3">
            {hasTeam && (
              <p className="text-yellow-400 text-xs text-center">Hai già una scuderia! Non puoi fare offerte.</p>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                value={bidAmount}
                min={currentBid + 1}
                max={userCreditsLeft}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="flex-1 bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-f1-red"
                disabled={hasTeam}
              />
              <Button
                onClick={handleBid}
                loading={pending}
                disabled={!validation.valid || isLeading || hasTeam}
                className="flex-shrink-0 flex items-center gap-2"
                size="lg"
              >
                <TrendingUp className="w-4 h-4" />
                Offri
              </Button>
            </div>
            {!validation.valid && !hasTeam && (
              <p className="text-red-400 text-xs">{validation.error}</p>
            )}
            {isLeading && (
              <p className="text-yellow-400 text-xs text-center">Stai già vincendo questa asta!</p>
            )}
          </div>
        )}

        {/* Admin: close button */}
        {(isAdmin || isExpired) && (
          <div className="mt-3 pt-3 border-t border-f1-gray-dark">
            <Button
              onClick={handleClose}
              loading={pending}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {isExpired ? 'Chiudi asta (scaduta)' : 'Chiudi asta anticipatamente (Admin)'}
            </Button>
          </div>
        )}
      </div>

      {/* Bid history */}
      {bids.length > 0 && (
        <div className="bg-f1-black-light border border-f1-gray-dark rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-f1-gray mb-3">Storico offerte</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {bids.map((bid, i) => {
              const profile = (bid as Record<string, unknown>).profile as Record<string, unknown>
              const isMyBid = bid.user_id === userId
              return (
                <div key={String(bid.id ?? i)}
                  className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${i === 0 ? 'bg-f1-gray-dark' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: teamColor }}
                    />
                    <span className={isMyBid ? 'text-f1-red font-bold' : 'text-f1-gray-light'}>
                      {String(profile?.display_name ?? 'Unknown')}
                      {isMyBid && ' (tu)'}
                    </span>
                  </div>
                  <span className={`font-black ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {String(bid.amount ?? 0)} cr
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
