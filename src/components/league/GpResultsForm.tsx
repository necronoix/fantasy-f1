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
  hasSprintRace: boolean
}

export function GpResultsForm({ leagueId, gpId, allDrivers, hasSprintRace }: Props) {
  const [pending, startTransition] = useTransition()
  const positions = Array.from({ length: allDrivers.length }, (_, i) => i + 1)

  // Qualifying
  const [qualOrder, setQualOrder] = useState<string[]>(Array(22).fill(''))
  // Race
  const [raceOrder, setRaceOrder] = useState<string[]>(Array(22).fill(''))
  const [dnf, setDnf] = useState<string[]>([])
  const [dsq, setDsq] = useState<string[]>([])
  const [fastestLap, setFastestLap] = useState<string>('')
  // Sprint
  const [sprintOrder, setSprintOrder] = useState<string[]>(Array(22).fill(''))

  function toggleFlag(arr: string[], setArr: (v: string[]) => void, driverId: string) {
    setArr(arr.includes(driverId) ? arr.filter(d => d !== driverId) : [...arr, driverId])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const qualifyingOrder = qualOrder
      .filter(Boolean)
      .map((driverId, i) => ({ driver_id: driverId, position: i + 1 }))

    const raceOrderData = raceOrder
      .filter(Boolean)
      .map((driverId, i) => ({
        driver_id: driverId,
        position: i + 1,
        dnf: dnf.includes(driverId),
        dsq: dsq.includes(driverId),
        fastest_lap: driverId === fastestLap,
      }))

    const results: GpResultsData = {
      qualifying_order: qualifyingOrder,
      race_order: raceOrderData,
      ...(hasSprintRace && {
        sprint_order: sprintOrder.filter(Boolean).map((driverId, i) => ({
          driver_id: driverId,
          position: i + 1,
        })),
      }),
    }

    startTransition(async () => {
      const result = await submitGpResults(leagueId, gpId, results)
      if (result?.error) toast.error(result.error)
      else toast.success('Risultati salvati! Punteggi calcolati.')
    })
  }

  const DriverOrderSelect = ({
    label, order, setOrder, maxPos
  }: { label: string; order: string[]; setOrder: (v: string[]) => void; maxPos: number }) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-2">{label}</p>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {Array.from({ length: Math.min(maxPos, allDrivers.length) }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-f1-gray text-xs font-bold w-6 text-right flex-shrink-0">{i + 1}.</span>
            <select
              value={order[i] ?? ''}
              onChange={(e) => {
                const newOrder = [...order]
                newOrder[i] = e.target.value
                setOrder(newOrder)
              }}
              className="flex-1 bg-f1-gray-dark border border-f1-gray-mid rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-f1-red"
            >
              <option value="">—</option>
              {allDrivers.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>
                  {String(d.short_name)} — {String(d.name)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DriverOrderSelect label="Ordine qualifica (Top 10+)" order={qualOrder} setOrder={setQualOrder} maxPos={22} />
        <DriverOrderSelect label="Ordine gara" order={raceOrder} setOrder={setRaceOrder} maxPos={22} />
        {hasSprintRace && (
          <DriverOrderSelect label="Ordine sprint (Top 8)" order={sprintOrder} setOrder={setSprintOrder} maxPos={8} />
        )}
      </div>

      {/* Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-2">DNF (ritirati)</p>
          <div className="flex flex-wrap gap-1.5">
            {allDrivers.map((d) => (
              <button
                key={String(d.id)}
                type="button"
                onClick={() => toggleFlag(dnf, setDnf, String(d.id))}
                className={`text-xs px-2 py-1 rounded font-bold transition-colors ${dnf.includes(String(d.id)) ? 'bg-orange-700 text-white' : 'bg-f1-gray-dark text-f1-gray hover:text-white'}`}
              >
                {String(d.short_name)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-2">DSQ (squalificati)</p>
          <div className="flex flex-wrap gap-1.5">
            {allDrivers.map((d) => (
              <button
                key={String(d.id)}
                type="button"
                onClick={() => toggleFlag(dsq, setDsq, String(d.id))}
                className={`text-xs px-2 py-1 rounded font-bold transition-colors ${dsq.includes(String(d.id)) ? 'bg-red-800 text-white' : 'bg-f1-gray-dark text-f1-gray hover:text-white'}`}
              >
                {String(d.short_name)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-f1-gray-light mb-2">Giro veloce</p>
          <select
            value={fastestLap}
            onChange={(e) => setFastestLap(e.target.value)}
            className="w-full bg-f1-gray-dark border border-f1-gray-mid rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-f1-red"
          >
            <option value="">— Nessuno selezionato —</option>
            {allDrivers.map((d) => (
              <option key={String(d.id)} value={String(d.id)}>
                {String(d.short_name)} — {String(d.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" loading={pending} variant="danger" className="w-full" size="lg">
        Conferma risultati e calcola punteggi
      </Button>
    </form>
  )
}
