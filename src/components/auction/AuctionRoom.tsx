'use client'

import { placeBid, closeAuction } from '@/app/actions/auction'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DriverCard } from '@/components/f1/DriverCard'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getTimerSeconds } from '@/lib/utils'
import { validateAuctionBid } from '@/lib/scoring'
import { Gavel, Clock, Crown, TrendingUp } from 'lucide-react'
import { DRIVER_TEAMS, TEAM_COLORS } from '@/components/f1/f1-data'

interface Props {
  leagueId: string
  auction: Record<string, unknown>
  initialBids: Record<string, unknown>[]
  userId: string
  userDisplayName: string
  userCreditsLeft: number
  userRosterCount: number
  isAdmin: boolean
}

export function AuctionRoom({
  leagueId,
  auction: initialAuction,
  initialBids,
  userId,
  userDisplayName,
  userCreditsLeft,
  userRosterCount,
  isAdmin,
}: Props) {
  const [auction, setAuction] = useState(initialAuction)
  const [bids, setBids] = useState(initialBids)
  const [bidAmount, setBidAmount] = useState(Number(initialAuction.current_bid ?? 1) + 1)
  const [timeLeft, setTimeLeft] = useState(getTimerSeconds(String(initialAuction.ends_at)))
  const [pending, startTransition] = useTransition()

  const driverObj = (auction.target_driver ?? auction.target_driver_id) as Record<string, unknown> | null
  const leader = auction.leader as Record<string, unknown> | null

  const currentBid = Number(auction.current_bid ?? 1)
  const leaderUserId = String(auction.leader_user_id ?? '')
  const isLeading = leaderUserId === userId
  const auctionId = String(auction.id)
  const isExpired = timeLeft <= 0

  // Get driver short name for helmet
  const driverShortName = String((driverObj as Record<string, unknown>)?.short_name ?? '')
  const driverTeamId = driverShortName ? DRIVER_TEAMS[driverShortName] : null
  const teamColor = driverTeamId ? TEAM_COLORS[driverTeamId] : '#888'
  const driverName = String((driverObj as Record<string, unknown>)?.name ?? '')
  const driverNumber = String((driverObj as Record<string, unknown>)?.number ?? '?')

  // Validation
  const validation = validateAuctionBid(bidAmount, currentBid, userCreditsLeft, userRosterCount, 4, 200)

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
          toast.success('Asta chiusa!')
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
        filter: `auction_id=eq.${auctionId}`,
      }, (payload) => {
        // Attach profile display_name for current user's bids (realtime payload lacks join data)
        const newBid = payload.new as Record<string, unknown>
        if (newBid.user_id === userId) {
          newBid.profile = { display_name: userDisplayName }
        }
        setBids(prev => [newBid, ...prev.slice(0, 19)])
        // Flash effect notification
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
      const result = await closeAuction(auctionId)
      if (result?.error) toast.error(result.error)
    })
  }, [auctionId])

  const timerPct = Math.min(100, (timeLeft / 20) * 100)
  const timerColor = timeLeft <= 8 ? 'bg-red-500' : timeLeft <= 15 ? 'bg-yellow-500' : 'bg-green-500'

  if (auction.status === 'closed') {
    return (
      <div className="relative overflow-hidden rounded-2xl p-6 border backdrop-blur-md text-center" style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
        borderColor: `${teamColor}40`,
        boxShadow: `0 0 15px rgba(232,0,45,0.2)`
      }}>
        {/* Top color stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ backgroundColor: teamColor }} />

        <div className="text-5xl mb-3">🏁</div>
        <p className="text-xl font-black text-white mb-1">Asta chiusa!</p>
        {auction.leader_user_id ? (
          <p className="text-f1-gray-light text-sm">
            Aggiudicato a <span className="text-f1-red font-bold">{String((leader as Record<string, unknown>)?.display_name ?? 'Unknown')}</span> per {currentBid} cr
          </p>
        ) : (
          <p className="text-f1-gray-light text-sm">Nessuna offerta — pilota non assegnato</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Driver card - Main auction display */}
      <div className="relative overflow-hidden rounded-2xl border backdrop-blur-md" style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
        borderColor: `${teamColor}40`,
        boxShadow: `inset 0 0 20px ${teamColor}10, 0 0 15px ${teamColor}15`
      }}>
        {/* Top color stripe - 3px thick */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ backgroundColor: teamColor, height: '3px' }} />

        <div className="p-6 pt-8">
          {/* Header with auction type badge */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-f1-red" />
              <span className="text-xs font-bold uppercase tracking-widest text-f1-red">
                {String(auction.type) === 'mini' ? 'Mini-Asta' : 'Asta'} in corso
              </span>
            </div>
            <Badge variant={isExpired ? 'red' : 'green'} className="animate-pulse-red">
              LIVE
            </Badge>
          </div>

          {driverObj && (
            <div className="mb-8 flex flex-col items-center">
              <DriverCard
                driverId={driverShortName}
                driverName={driverName}
                driverShortName={driverShortName}
                driverNumber={driverNumber}
                teamName={String(((driverObj as Record<string, unknown>).team as Record<string, unknown>)?.short_name ?? '')}
                teamColor={teamColor}
                price={currentBid}
                priceLabel="Prezzo"
                size="lg"
              />
            </div>
          )}

          {/* Current bid prominently displayed */}
          <div className="flex items-end justify-between mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              <p className="text-f1-gray text-xs uppercase tracking-wider font-bold mb-2">Offerta attuale</p>
              <p className="text-5xl font-black text-white">{currentBid}<span className="text-lg text-f1-gray ml-2">cr</span></p>
            </div>
            <div className="text-right">
              {leaderUserId && (
                <div className="flex items-center gap-1.5 text-yellow-400 mb-2">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    {isLeading ? 'Tu stai vincendo!' : String((leader as Record<string, unknown>)?.display_name ?? 'Unknown')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-f1-gray-light">
                <Clock className="w-4 h-4" />
                <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>

          {/* Timer bar - Gradient from yellow to red */}
          <div className="w-full bg-f1-gray-dark rounded-full h-2 mb-6 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${timerColor}`}
              style={{
                width: `${timerPct}%`,
                background: timeLeft <= 8 ? `linear-gradient(90deg, #FFA500, #FF4444)` : timeLeft <= 15 ? `linear-gradient(90deg, #90EE90, #FFD700)` : `linear-gradient(90deg, #4169E1, #90EE90)`,
              }}
            />
          </div>

          {/* Bid controls */}
          {!isExpired && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="number"
                  value={bidAmount}
                  min={currentBid + 1}
                  max={userCreditsLeft}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="flex-1 rounded-lg px-4 py-3 text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-f1-red transition-all duration-200"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderColor: `${teamColor}40`,
                    border: `1.5px solid ${teamColor}40`,
                    boxShadow: `inset 0 0 10px ${teamColor}10, 0 0 10px ${teamColor}20`
                  }}
                />
                <Button
                  onClick={handleBid}
                  loading={pending}
                  disabled={!validation.valid || isLeading}
                  className="flex-shrink-0 flex items-center gap-2"
                  size="lg"
                >
                  <TrendingUp className="w-4 h-4" />
                  Offri
                </Button>
              </div>
              {!validation.valid && (
                <p className="text-red-400 text-xs font-semibold">{validation.error}</p>
              )}
              {isLeading && (
                <p className="text-yellow-400 text-xs text-center font-bold">Stai già vincendo questa asta!</p>
              )}
            </div>
          )}

          {/* Admin: close button */}
          {(isAdmin || isExpired) && (
            <div className="mt-4 pt-4 border-t border-f1-gray-dark">
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
      </div>

      {/* Bid history */}
      {bids.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border backdrop-blur-md p-4" style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
          borderColor: `rgba(255,255,255,0.15)`
        }}>
          <p className="text-xs font-bold uppercase tracking-wider text-f1-gray mb-3">Storico offerte</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {bids.map((bid, i) => {
              const profile = (bid as Record<string, unknown>).profile as Record<string, unknown>
              const isMyBid = bid.user_id === userId
              const bidAmount = Number(bid.amount ?? 0)

              return (
                <div key={String(bid.id ?? i)}
                  className={`flex items-center justify-between text-xs py-2 px-3 rounded-lg transition-all duration-200 ${
                    i === 0 ? 'bg-f1-red/20 border border-f1-red/40' : 'bg-white/5 border border-white/10'
                  }`}>
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
                  <span className={`font-black ${i === 0 ? 'text-f1-red' : 'text-white'}`}>
                    {bidAmount} cr
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
