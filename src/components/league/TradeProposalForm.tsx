'use client'

import { proposeTrade } from '@/app/actions/trades'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'

interface Props {
  leagueId: string
  myRoster: Record<string, unknown>[]
  otherMembers: Record<string, unknown>[]
  othersRosters: Record<string, unknown>[]
  myCreditsLeft: number
}

export function TradeProposalForm({ leagueId, myRoster, otherMembers, othersRosters, myCreditsLeft }: Props) {
  const [pending, startTransition] = useTransition()
  const [targetUser, setTargetUser] = useState('')
  const [myDriver, setMyDriver] = useState('')
  const [theirDriver, setTheirDriver] = useState('')
  const [credits, setCredits] = useState(0)

  const theirRoster = othersRosters.filter(r => String(r.user_id) === targetUser)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetUser || !myDriver || !theirDriver) return toast.error('Completa tutti i campi')
    startTransition(async () => {
      const result = await proposeTrade(leagueId, targetUser, myDriver, theirDriver, credits)
      if (result?.error) toast.error(result.error)
      else toast.success('Proposta inviata!')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">Controparte</label>
        <select
          value={targetUser}
          onChange={(e) => { setTargetUser(e.target.value); setTheirDriver('') }}
          className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
        >
          <option value="">— Scegli giocatore —</option>
          {otherMembers.map((m) => {
            const profile = m.profile as Record<string, unknown>
            return (
              <option key={String(m.user_id)} value={String(m.user_id)}>
                {String(profile?.display_name ?? 'Unknown')}
              </option>
            )
          })}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">Offro (mio pilota)</label>
          <select
            value={myDriver}
            onChange={(e) => setMyDriver(e.target.value)}
            className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
          >
            <option value="">— Scegli —</option>
            {myRoster.map((entry) => {
              const driver = entry.driver as Record<string, unknown>
              return (
                <option key={String(driver?.id ?? '')} value={String(driver?.id ?? '')}>
                  {String(driver?.name ?? '')}
                </option>
              )
            })}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">Ricevo (suo pilota)</label>
          <select
            value={theirDriver}
            onChange={(e) => setTheirDriver(e.target.value)}
            disabled={!targetUser}
            className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red disabled:opacity-50"
          >
            <option value="">— Scegli —</option>
            {theirRoster.map((entry) => {
              const driver = entry.driver as Record<string, unknown>
              return (
                <option key={String(driver?.id ?? '')} value={String(driver?.id ?? '')}>
                  {String(driver?.name ?? '')}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">
          Conguaglio crediti (opzionale) — max {myCreditsLeft}
        </label>
        <input
          type="number"
          value={credits}
          onChange={(e) => setCredits(Math.max(0, Math.min(myCreditsLeft, Number(e.target.value))))}
          min={0}
          max={myCreditsLeft}
          className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
          placeholder="0 = nessun conguaglio"
        />
        {credits > 0 && <p className="text-yellow-400 text-xs">Darai {credits} crediti extra alla controparte</p>}
      </div>

      <Button type="submit" loading={pending} className="w-full">
        Proponi scambio
      </Button>
    </form>
  )
}
