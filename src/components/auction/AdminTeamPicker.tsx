'use client'

import { startTeamAuction } from '@/app/actions/team-auction'
import { Button } from '@/components/ui/Button'
import { useTransition } from 'react'
import toast from 'react-hot-toast'
import { TEAM_COLORS, TEAM_NAMES } from '@/components/f1/f1-data'

interface Props {
  leagueId: string
  takenTeamIds: string[]
}

const ALL_TEAM_IDS = [
  'ferrari_2026',
  'redbull_2026',
  'mclaren_2026',
  'mercedes_2026',
  'astonmartin_2026',
  'williams_2026',
  'alpine_2026',
  'haas_2026',
  'racingbulls_2026',
  'audi_2026',
  'cadillac_2026',
]

export function AdminTeamPicker({ leagueId, takenTeamIds }: Props) {
  const [pending, startTransition] = useTransition()

  function handleStart(teamId: string) {
    startTransition(async () => {
      const result = await startTeamAuction(leagueId, teamId)
      if (result?.error) toast.error(result.error)
      else toast.success('Asta scuderia avviata!')
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-f1-gray mb-3">
        Seleziona una scuderia per avviare l&apos;asta. Ogni giocatore può avere massimo 1 scuderia.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_TEAM_IDS.map((teamId) => {
          const isTaken = takenTeamIds.includes(teamId)
          const color = TEAM_COLORS[teamId] ?? '#888'
          const name = TEAM_NAMES[teamId] ?? teamId

          return (
            <button
              key={teamId}
              type="button"
              disabled={pending || isTaken}
              onClick={() => handleStart(teamId)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                isTaken
                  ? 'opacity-40 cursor-not-allowed border-f1-gray-dark bg-f1-gray-dark/30'
                  : 'border-f1-gray-mid hover:border-f1-red cursor-pointer bg-f1-black-light hover:bg-f1-gray-dark/50'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{name}</p>
                {isTaken && (
                  <p className="text-xs text-f1-gray">Assegnata</p>
                )}
              </div>
              {!isTaken && (
                <span className="text-xs text-f1-gray-light font-semibold">Avvia</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
