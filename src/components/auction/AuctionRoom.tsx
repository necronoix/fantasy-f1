'use client'

import { placeBid, closeAuction } from '@/app/actions/auction'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useTransition, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getTimerSeconds } from '@/lib/utils'
import { validateAuctionBid } from '@/lib/scoring'
import { Gavel, Clock, Crown, TrendingUp } from 'lucide-react'

interface Props {
  leagueId: string
  auction: Record<string, unknown>
  initialBids: Record<string, unknown>[]
  userId: string
  userCreditsLeft: number
  userRosterCount: number
  isAdmin: boolean
}

export function AuctionRoom({
  leagueId,
  auction: initialAuction,
  initialBids,
  userId,
  userCreditsLeft,
  userRosterCount,
  isAdmin,
}: Props) {
  const [auction, setAuction] = useState(initialAuction)
  const [bids, setBids] = useState(initialBids)
  const [bidAmount, setBidAmount] = useState(Number(initialAuction.current_bid ?? 1) + 1)
  const [timeLeft, setTimeLeft] = useState(getTimerSeconds(String(initialAuction.ends_at)))
  const [pending, startTransition] = useTransition()

  // target_driver is the joined object from getActiveAuction
  const driverObj = (auction.target_driver ?? auction.target_driver_id) as Record<string, unknown> | null
  const leader = auction.leader as Record<string, unknown> | null

  const currentBid = Number(auction.current_bid ?? 1)
  const leaderUserId = String(auction.leader_user_id ?? '')
  const isLeading = leaderUserId === userId
  const auctionId = String(auction.id)
  const isExpired = timeLeft <= 0

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
        setBids(prev => [payload.new as Record<string, unknown>, ...prev.slice(0, 19)])
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

  // Quick bid amounts
  const quickBids = [
    currentBid + 1,
    currentBid + 5,
    currentBid + 10,
    currentBid + 20,
  ].filter(b => b <= userCreditsLeft)

  const timerPct = Math.min(100, (timeLeft / 30) * 100)
  const timerColor = timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'

  if (auction.status === 'closed') {
    const closedDriver = driverObj
    return (
      <div className="bg-f1-black-light border border-f1-gray-dark rounded-xl p-6 text-center">
        {closedDriver && String(closedDriver.helmet_url ?? '') ? (
          <img src={String(closedDriver.helmet_url)} alt="" className="w-16 h-16 object-contain mx-auto mb-3"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="text-5xl mb-3">🏁</div>
        )}
        <p className="text-xl font-black text-white mb-1">
          {closedDriver ? String(closedDriver.name ?? 'Asta chiusa!') : 'Asta chiusa!'}
        </p>
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
      {/* Driver card */}
      <div className="bg-gradient-to-br from-f1-red/20 to-f1-black-light border border-f1-red/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
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
          <div className="flex items-center gap-4 mb-5 relative">
            {/* Driver photo */}
            {String(driverObj.photo_url ?? '') && (
              <div className="absolute right-0 top-0 bottom-0 w-28 overflow-hidden pointer-events-none">
                <img
                  src={String(driverObj.photo_url)}
                  alt=""
                  className="absolute bottom-0 right-0 h-28 object-contain object-bottom opacity-80"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
            {/* Helmet + info */}
            <div className="flex items-center gap-3 flex-1 z-10">
              {String(driverObj.helmet_url ?? '') ? (
                <img
                  src={String(driverObj.helmet_url)}
                  alt=""
                  className="w-14 h-14 object-contain flex-shrink-0 drop-shadow-lg"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement
                    el.style.display = 'none'
                    if (el.nextElementSibling) (el.nextElementSibling as HTMLElement).style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className="w-14 h-14 rounded-xl bg-f1-red/20 flex items-center justify-center text-xl font-black text-f1-red flex-shrink-0"
                style={{ display: String(driverObj.helmet_url ?? '') ? 'none' : 'flex' }}
              >
                {String(driverObj.number ?? '?')}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-f1-gray-light">
                  {String((driverObj.team as Record<string, unknown>)?.name ?? '')}
                </p>
                <h2 className="text-2xl font-black text-white leading-tight">
                  {String(driverObj.name ?? '')}
                </h2>
                <p className="text-f1-gray text-xs">#{String(driverObj.number ?? '')}</p>
              </div>
            </div>
          </div>
        )}

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
              <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
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
            <div className="flex flex-wrap gap-2">
              {quickBids.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setBidAmount(amount)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                    bidAmount === amount
                      ? 'bg-f1-red border-f1-red text-white'
                      : 'border-f1-gray-mid text-f1-gray-light hover:border-f1-red hover:text-white'
                  }`}
                >
                  {amount} cr
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={bidAmount}
                min={currentBid + 1}
                max={userCreditsLeft}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="flex-1 bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-f1-red"
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
                  <span className={isMyBid ? 'text-f1-red font-bold' : 'text-f1-gray-light'}>
                    {String(profile?.display_name ?? 'Unknown')}
                    {isMyBid && ' (tu)'}
                  </span>
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
