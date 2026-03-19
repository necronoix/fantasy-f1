'use client'

import { submitGpResults } from '@/app/actions/gp'
import { Button } from '@/components/ui/Button'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import type { GpResultsData } from '@/lib/types'

interface Props {
  leagueId: string
  gpId: string
  allDrivers: Record<string, unknown>[]
  hasSprintRace?: boolean
  existingResults?: Record<string, unknown> | null
  isCompleted?: boolean
}

export function GpResultsForm({ leagueId, gpId, allDrivers, existingResults, isCompleted = false }: Props) {
  const [pending, startTransition] = useTransition()

  // Pre-fill from existing results if editing
  const existQual = (existingResults?.qualifying_order as Array<{driver_id: string; position: number}>) ?? []
  const existRace = (existingResults?.race_order as Array<{driver_id: string; position: number; dnf?: boolean; dsq?: boolean; dnc?: boolean; fastest_lap?: boolean; penalty_positions?: number}>) ?? []
  const initQual = Array(22).fill('')
  const initRace = Array(22).fill('')
  const initDnf: string[] = []
  const initDsq: string[] = []
  const initDnc: string[] = []
  const initPenalties: Record<string, number> = {}
  let initFL = ''
  for (const q of existQual) { if (q.position >= 1 && q.position <= 22) initQual[q.position - 1] = q.driver_id }
  for (const r of existRace) {
    // Only put non-DNF/DSQ/DNC drivers in the race order dropdowns
    if (!r.dnf && !r.dsq && !r.dnc && r.position >= 1 && r.position <= 22) {
      initRace[r.position - 1] = r.driver_id
    }
    if (r.dnf) initDnf.push(r.driver_id)
    if (r.dsq) initDsq.push(r.driver_id)
    if (r.dnc) initDnc.push(r.driver_id)
    if (r.fastest_lap) initFL = r.driver_id
    if (r.penalty_positions && r.penalty_positions > 0) initPenalties[r.driver_id] = r.penalty_positions
  }

  const [qualOrder, setQualOrder] = useState<string[]>(initQual)
  const [raceOrder, setRaceOrder] = useState<string[]>(initRace)
  const [dnf, setDnf] = useState<string[]>(initDnf)
  const [dsq, setDsq] = useState<string[]>(initDsq)
  const [dnc, setDnc] = useState<string[]>(initDnc)
  const [penalties, setPenalties] = useState<Record<string, number>>(initPenalties)
  const [fastestLap, setFastestLap] = useState<string>(initFL)
  const [safetyCar, setSafetyCar] = useState<boolean>(Boolean(existingResults?.safety_car))

  function toggleFlag(arr: string[], setArr: (v: string[]) => void, driverId: string) {
    setArr(arr.includes(driverId) ? arr.filter(d => d !== driverId) : [...arr, driverId])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const qualifyingOrder = qualOrder
      .filter(Boolean)
      .map((driverId, i) => ({ driver_id: driverId, position: i + 1 }))

    // Build race order: normal finishers first (exclude DNF/DSQ/DNC from dropdown positions)
    const raceOrderData = raceOrder
      .filter(Boolean)
      .filter(driverId => !dnf.includes(driverId) && !dsq.includes(driverId) && !dnc.includes(driverId))
      .map((driverId, i) => ({
        driver_id: driverId,
        position: i + 1,
        dnf: false,
        dsq: false,
        dnc: false,
        fastest_lap: driverId === fastestLap,
        penalty_positions: penalties[driverId] ?? 0,
      }))

    // Append DNF drivers — they raced but didn't finish → malus -10
    const lastFinPos = raceOrderData.length
    dnf.forEach((driverId, i) => {
      if (!raceOrderData.find(r => r.driver_id === driverId)) {
        raceOrderData.push({
          driver_id: driverId,
          position: lastFinPos + i + 1,
          dnf: true, dsq: false, dnc: false,
          fastest_lap: false, penalty_positions: 0,
        })
      }
    })

    // Append DSQ drivers → malus -15
    const lastDnfPos = raceOrderData.length
    dsq.forEach((driverId, i) => {
      if (!raceOrderData.find(r => r.driver_id === driverId)) {
        raceOrderData.push({
          driver_id: driverId,
          position: lastDnfPos + i + 1,
          dnf: false, dsq: true, dnc: false,
          fastest_lap: false, penalty_positions: 0,
        })
      }
    })

    // Append DNC drivers → 0 pts, enables bench substitution
    const lastDsqPos = raceOrderData.length
    dnc.forEach((driverId, i) => {
      if (!raceOrderData.find(r => r.driver_id === driverId)) {
        raceOrderData.push({
          driver_id: driverId,
          position: lastDsqPos + i + 1,
          dnf: false, dsq: false, dnc: true,
          fastest_lap: false, penalty_positions: 0,
        })
      }
    })

    const results: GpResultsData = {
      qualifying_order: qualifyingOrder,
      race_order: raceOrderData,
      safety_car: safetyCar,
    }

    startTransition(async () => {
      const result = await submitGpResults(leagueId, gpId, results)
      if (result?.error) toast.error(result.error)
      else toast.success('Risultati salvati! Punteggi calcolati.')
    })
  }

  const dnfCount = dnf.length
  const dsqCount = dsq.length
  const dncCount = dnc.length
  const penaltyCount = Object.values(penalties).filter(v => v > 0).length

  const DriverOrderSelect = ({
    label, order, setOrder, maxPos
  }: { label: string; order: string[]; setOrder: (v: string[]) => void; maxPos: number }) => (
    <div className="bg-gradient-to-br from-white/8 to-white/3 border border-white/15 rounded-lg p-4 backdrop-blur-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-3">{label}</p>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {Array.from({ length: Math.min(maxPos, allDrivers.length) }, (_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-f1-gray text-xs font-bold w-6 text-right flex-shrink-0 bg-f1-gray-dark/60 px-1.5 py-0.5 rounded">{i + 1}</span>
            <select
              value={order[i] ?? ''}
              onChange={(e) => {
                const newOrder = [...order]
                newOrder[i] = e.target.value
                setOrder(newOrder)
              }}
              className="flex-1 bg-f1-gray-dark/70 border border-f1-gray-mid/60 hover:border-f1-red/50 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-f1-red transition-all duration-300"
            >
              <option value="">— Scegli pilota —</option>
              {allDrivers.map((d) => {
                const teamName = (d as any)?.team?.name || (d as any)?.team?.short_name || ''
                return (
                  <option key={String(d.id)} value={String(d.id)}>
                    {String(d.short_name)} — {String(d.name)}{teamName ? ` (${teamName})` : ''}
                  </option>
                )
              })}
            </select>
          </div>
        ))}
      </div>
    </div>
  )

  const FlagSection = ({
    label, color, items, setItems, countLabel
  }: { label: string; color: string; items: string[]; setItems: (v: string[]) => void; countLabel: string }) => {
    const colorMap: Record<string, { bg: string; activeBg: string; border: string; text: string; shadow: string }> = {
      orange: { bg: 'from-orange-500/10 to-orange-500/5', activeBg: 'bg-orange-600/80', border: 'border-orange-500/30', text: 'text-orange-300', shadow: 'shadow-[0_0_12px_rgba(234,88,12,0.4)]' },
      red: { bg: 'from-red-500/10 to-red-500/5', activeBg: 'bg-red-700/80', border: 'border-red-500/30', text: 'text-red-300', shadow: 'shadow-[0_0_12px_rgba(220,38,38,0.4)]' },
      purple: { bg: 'from-purple-500/10 to-purple-500/5', activeBg: 'bg-purple-700/80', border: 'border-purple-500/30', text: 'text-purple-300', shadow: 'shadow-[0_0_12px_rgba(147,51,234,0.4)]' },
    }
    const c = colorMap[color] ?? colorMap.orange!

    return (
      <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-lg p-4 backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{label}</p>
          {items.length > 0 && (
            <span className={`text-[10px] ${c.activeBg} text-white font-bold px-2 py-0.5 rounded-full`}>
              {items.length} {countLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allDrivers.map((d) => {
            const isSelected = items.includes(String(d.id))
            return (
              <button
                key={String(d.id)}
                type="button"
                onClick={() => toggleFlag(items, setItems, String(d.id))}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all duration-300 ${
                  isSelected
                    ? `${c.activeBg} text-white ${c.shadow}`
                    : 'bg-f1-gray-dark/70 text-f1-gray hover:text-white hover:bg-f1-gray-dark'
                }`}
              >
                {String(d.short_name)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DriverOrderSelect label="Ordine qualifica (Top 10+)" order={qualOrder} setOrder={setQualOrder} maxPos={22} />
        <DriverOrderSelect label="Ordine gara (solo chi ha finito)" order={raceOrder} setOrder={setRaceOrder} maxPos={22} />
      </div>

      <div className="space-y-4">
        <FlagSection label="DNF — Ritirati (malus -10 pts)" color="orange" items={dnf} setItems={setDnf} countLabel="ritirati" />
        <FlagSection label="DSQ — Squalificati (malus -15 pts)" color="red" items={dsq} setItems={setDsq} countLabel="squalificati" />
        <FlagSection label="DNC — Non partecipanti (0 pts, attiva sostituzione panchina)" color="purple" items={dnc} setItems={setDnc} countLabel="non partecipanti" />

        {/* Penalty positions */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">Penalità posizioni (-1 pt ciascuna)</p>
            {penaltyCount > 0 && (
              <span className="text-[10px] bg-yellow-600/80 text-white font-bold px-2 py-0.5 rounded-full">{penaltyCount} penalizzati</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {allDrivers.map((d) => {
              const dId = String(d.id)
              const val = penalties[dId] ?? 0
              return (
                <div key={dId} className="flex items-center gap-1.5">
                  <span className="text-xs text-f1-gray font-semibold">{String(d.short_name)}</span>
                  <input
                    type="number"
                    min={0} max={20}
                    value={val || ''}
                    placeholder="0"
                    onChange={(e) => setPenalties(prev => ({ ...prev, [dId]: parseInt(e.target.value) || 0 }))}
                    className="w-12 bg-f1-gray-dark/70 border border-f1-gray-mid/60 rounded px-1.5 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Fastest Lap & Safety Car */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-2.5">Giro veloce</p>
            <select
              value={fastestLap}
              onChange={(e) => setFastestLap(e.target.value)}
              className="w-full bg-f1-gray-dark/70 border border-f1-gray-mid/60 hover:border-f1-red/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red transition-all duration-300"
            >
              <option value="">— Nessuno —</option>
              {allDrivers.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>{String(d.short_name)} — {String(d.name)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-f1-gray-dark/40 rounded-lg px-3 py-2.5 border border-f1-gray-mid/40">
            <input type="checkbox" id="safety_car_result" checked={safetyCar} onChange={(e) => setSafetyCar(e.target.checked)} className="w-4 h-4 accent-f1-red cursor-pointer rounded" />
            <label htmlFor="safety_car_result" className="text-sm text-f1-gray-light cursor-pointer font-semibold flex-1">Safety Car durante la gara</label>
          </div>
        </div>
      </div>

      {/* Summary before submit */}
      {(dnfCount > 0 || dsqCount > 0 || dncCount > 0) && (
        <div className="bg-f1-gray-dark/50 border border-white/10 rounded-lg p-3 text-xs text-f1-gray-light space-y-1">
          <p className="font-bold text-white uppercase tracking-wider text-[11px] mb-1">Riepilogo malus:</p>
          {dnfCount > 0 && <p className="text-orange-300">DNF ({dnfCount}): {dnf.join(', ')} → -10 pts ciascuno</p>}
          {dsqCount > 0 && <p className="text-red-300">DSQ ({dsqCount}): {dsq.join(', ')} → -15 pts ciascuno</p>}
          {dncCount > 0 && <p className="text-purple-300">DNC ({dncCount}): {dnc.join(', ')} → 0 pts, sostituzione panchina attiva</p>}
        </div>
      )}

      <Button
        type="submit"
        loading={pending}
        variant="danger"
        className="w-full bg-gradient-to-r from-f1-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold shadow-lg hover:shadow-[0_0_20px_rgba(232,0,45,0.4)] transition-all duration-300"
        size="lg"
      >
        {isCompleted ? 'Aggiorna risultati e ricalcola punteggi' : 'Conferma risultati e calcola punteggi'}
      </Button>
    </form>
  )
}
