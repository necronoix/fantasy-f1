'use client'

import { proposeTrade } from '@/app/actions/trades'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeftRight } from 'lucide-react'

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

  const selectedMyDriver = myRoster.find(r => {
    const d = r.driver as Record<string, unknown>
    return String(d?.id ?? '') === myDriver
  })
  const selectedTheirDriver = theirRoster.find(r => {
    const d = r.driver as Record<string, unknown>
    return String(d?.id ?? '') === theirDriver
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetUser || !myDriver || !theirDriver) return toast.error('Completa tutti i campi')
    if (myDriver === theirDriver) return toast.error('Non puoi scambiare lo stesso pilota')

    startTransition(async () => {
      const result = await proposeTrade(leagueId, targetUser, myDriver, theirDriver, credits)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Proposta inviata!')
        // Reset form
        setTargetUser('')
        setMyDriver('')
        setTheirDriver('')
        setCredits(0)
      }
    })
  }

  function getDriverLabel(entry: Record<string, unknown>) {
    const driver = entry.driver as Record<string, unknown>
    const team = driver?.team as Record<string, unknown>
    const name = String(driver?.name ?? driver?.short_name ?? '')
    const teamName = String(team?.name ?? '')
    return teamName ? `${name} (${teamName})` : name
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
      {/* Target user */}
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

      {/* Driver selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-f1-red uppercase tracking-wider">Offro (mio pilota)</label>
          <select
            value={myDriver}
            onChange={(e) => setMyDriver(e.target.value)}
            className="w-full bg-f1-gray-dark border border-f1-red/30 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
          >
            <option value="">— Scegli pilota —</option>
            {myRoster.map((entry) => {
              const driver = entry.driver as Record<string, unknown>
              return (
                <option key={String(driver?.id ?? '')} value={String(driver?.id ?? '')}>
                  {getDriverLabel(entry)}
                </option>
              )
            })}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Ricevo (suo pilota)</label>
          <select
            value={theirDriver}
            onChange={(e) => setTheirDriver(e.target.value)}
            disabled={!targetUser}
            className="w-full bg-f1-gray-dark border border-emerald-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">{targetUser ? '— Scegli pilota —' : '— Seleziona controparte —'}</option>
            {theirRoster.map((entry) => {
              const driver = entry.driver as Record<string, unknown>
              return (
                <option key={String(driver?.id ?? '')} value={String(driver?.id ?? '')}>
                  {getDriverLabel(entry)}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Preview */}
      {selectedMyDriver && selectedTheirDriver && (
        <div className="flex items-center gap-3 bg-f1-black-light/60 rounded-xl p-3 border border-white/10">
          <div className="flex-1 text-center">
            <p className="text-f1-gray text-[10px] uppercase tracking-wider font-semibold">Dai</p>
            <p className="text-f1-red font-bold text-sm">{getDriverLabel(selectedMyDriver)}</p>
          </div>
          <ArrowLeftRight className="w-5 h-5 text-f1-gray flex-shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-f1-gray text-[10px] uppercase tracking-wider font-semibold">Ricevi</p>
            <p className="text-emerald-400 font-bold text-sm">{getDriverLabel(selectedTheirDriver)}</p>
          </div>
        </div>
      )}

      {/* Credit adjustment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">
          Conguaglio crediti (opzionale) — disponibili: {myCreditsLeft}
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
        {credits > 0 && (
          <p className="text-yellow-400 text-xs">
            Darai {credits} crediti extra alla controparte insieme al pilota
          </p>
        )}
      </div>

      <Button type="submit" loading={pending} className="w-full" disabled={!targetUser || !myDriver || !theirDriver}>
        Proponi scambio
      </Button>
    </form>
  )
}
