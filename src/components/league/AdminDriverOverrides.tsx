'use client'

import { useState, useTransition } from 'react'
import { upsertGpDriverOverride, deleteGpDriverOverride } from '@/app/actions/gp'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Driver {
  id: string
  name: string
  short_name: string
  team?: { id: string; name: string } | null
}

interface Team {
  id: string
  name: string
  color?: string
}

interface Override {
  driver_id: string
  temp_team_id: string | null
  substitute_driver_id: string | null
  notes: string | null
  driver: Driver | null
  temp_team: Team | null
  substitute: Driver | null
}

interface GpOption {
  id: string
  name: string
  round: number
}

interface Props {
  leagueId: string
  allGps: GpOption[]
  allDrivers: Driver[]
  allTeams: Team[]
  initialOverrides: Record<string, Override[]> // gpId → overrides
}

export function AdminDriverOverrides({ leagueId, allGps, allDrivers, allTeams, initialOverrides }: Props) {
  const [selectedGpId, setSelectedGpId] = useState<string>('')
  const [overrides, setOverrides] = useState<Record<string, Override[]>>(initialOverrides)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  // Form state
  const [driverId, setDriverId] = useState('')
  const [tempTeamId, setTempTeamId] = useState<string>('__absent__')
  const [subMode, setSubMode] = useState<'none' | 'roster' | 'external'>('none')
  const [substituteDriverId, setSubstituteDriverId] = useState('')
  const [externalName, setExternalName] = useState('')
  const [notes, setNotes] = useState('')

  const currentOverrides = selectedGpId ? (overrides[selectedGpId] ?? []) : []
  const selectedGp = allGps.find(g => g.id === selectedGpId)
  const selectedDriver = allDrivers.find(d => d.id === driverId)
  const originalTeamName = selectedDriver?.team?.name ?? 'la sua scuderia'

  function resetForm() {
    setDriverId('')
    setTempTeamId('__absent__')
    setSubMode('none')
    setSubstituteDriverId('')
    setExternalName('')
    setNotes('')
    setShowForm(false)
  }

  function handleSave() {
    if (!selectedGpId || !driverId) return
    const resolvedTeamId = tempTeamId === '__absent__' ? null : tempTeamId
    const resolvedSubId = subMode === 'roster' ? (substituteDriverId || null) : null
    const resolvedExternal = subMode === 'external' ? externalName.trim() : ''

    if (subMode === 'roster' && !resolvedSubId) {
      toast.error('Seleziona il pilota sostituto dalla lista')
      return
    }
    if (subMode === 'external' && !resolvedExternal) {
      toast.error('Scrivi il nome del sostituto esterno')
      return
    }

    startTransition(async () => {
      const res = await upsertGpDriverOverride(
        leagueId, selectedGpId, driverId, resolvedTeamId, resolvedSubId, notes, resolvedExternal || undefined
      )
      if (res?.error) { toast.error(res.error); return }
      toast.success('Override salvato')
      // Optimistic update
      const driver = allDrivers.find(d => d.id === driverId) ?? null
      const team = resolvedTeamId ? (allTeams.find(t => t.id === resolvedTeamId) ?? null) : null
      const sub = resolvedSubId
        ? (allDrivers.find(d => d.id === resolvedSubId) ?? null)
        : (resolvedExternal
            ? { id: 'sub-esterno', name: `${resolvedExternal} (esterno)`, short_name: resolvedExternal.slice(0, 3).toUpperCase() }
            : null)
      const newOv: Override = {
        driver_id: driverId,
        temp_team_id: resolvedTeamId,
        substitute_driver_id: sub?.id ?? null,
        notes: notes || null,
        driver,
        temp_team: team,
        substitute: sub,
      }
      setOverrides(prev => {
        const existing = (prev[selectedGpId] ?? []).filter(o => o.driver_id !== driverId)
        return { ...prev, [selectedGpId]: [...existing, newOv] }
      })
      resetForm()
    })
  }

  function handleDelete(ovDriverId: string) {
    if (!selectedGpId) return
    startTransition(async () => {
      const res = await deleteGpDriverOverride(leagueId, selectedGpId, ovDriverId)
      if (res?.error) { toast.error(res.error); return }
      toast.success('Override rimosso')
      setOverrides(prev => ({
        ...prev,
        [selectedGpId]: (prev[selectedGpId] ?? []).filter(o => o.driver_id !== ovDriverId),
      }))
    })
  }

  const existingDriverIds = new Set(currentOverrides.map(o => o.driver_id))
  const regularDrivers = allDrivers.filter(d => !d.id.startsWith('sub-'))

  return (
    <div className="space-y-4">
      {/* GP selector */}
      <div>
        <label className="text-xs text-f1-gray uppercase tracking-widest font-bold block mb-1.5">
          Seleziona GP
        </label>
        <select
          value={selectedGpId}
          onChange={e => { setSelectedGpId(e.target.value); setShowForm(false) }}
          className="w-full bg-f1-black border border-f1-gray-dark rounded-lg px-3 py-2 text-white text-sm focus:border-f1-red outline-none"
        >
          <option value="">— scegli un GP —</option>
          {allGps.map(gp => (
            <option key={gp.id} value={gp.id}>
              R{gp.round} · {gp.name}
            </option>
          ))}
        </select>
      </div>

      {selectedGpId && (
        <>
          {/* Existing overrides */}
          {currentOverrides.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-f1-gray uppercase tracking-widest font-bold">Override attivi</p>
              {currentOverrides.map(ov => (
                <div key={ov.driver_id} className="flex items-center gap-3 p-3 rounded-lg border border-f1-gray-dark bg-f1-black-light">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">
                        {ov.driver?.name ?? ov.driver_id}
                      </span>
                      <span className="text-f1-gray text-xs">
                        ({ov.driver?.team?.name ?? '?'})
                      </span>
                      <ArrowRight className="w-3 h-3 text-f1-gray flex-shrink-0" />
                      {ov.temp_team_id
                        ? <Badge variant="yellow">guida per {ov.temp_team?.name ?? ov.temp_team_id}</Badge>
                        : <Badge variant="gray">non corre questo GP</Badge>
                      }
                    </div>
                    {ov.substitute_driver_id && (
                      <p className="text-xs text-f1-gray mt-1">
                        Al suo posto in {ov.driver?.team?.name ?? 'scuderia'}:{' '}
                        <span className="text-white font-semibold">{ov.substitute?.name ?? ov.substitute_driver_id}</span>
                      </p>
                    )}
                    {ov.notes && (
                      <p className="text-xs text-f1-gray mt-0.5 italic">{ov.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(ov.driver_id)}
                    disabled={pending}
                    className="text-red-400 hover:text-red-300 p-1 transition-colors flex-shrink-0"
                    title="Rimuovi override"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentOverrides.length === 0 && !showForm && (
            <p className="text-f1-gray text-xs text-center py-2">Nessun override per {selectedGp?.name}</p>
          )}

          {/* Add override form */}
          {showForm ? (
            <div className="border border-f1-gray-dark rounded-lg p-4 space-y-4 bg-f1-black-light">
              <p className="text-xs font-bold uppercase tracking-widest text-f1-gray">Nuovo override</p>

              {/* Step 1: driver */}
              <div>
                <label className="text-xs text-white font-semibold mb-0.5 block">
                  1 · Quale pilota titolare è coinvolto?
                </label>
                <p className="text-[11px] text-f1-gray mb-1.5">
                  Il pilota della stagione che cambia scuderia per questo GP oppure non corre
                  (es. Lawson che passa in Red Bull, o Hadjar infortunato).
                </p>
                <select
                  value={driverId}
                  onChange={e => setDriverId(e.target.value)}
                  className="w-full bg-f1-black border border-f1-gray-dark rounded-lg px-3 py-2 text-white text-sm focus:border-f1-red outline-none"
                >
                  <option value="">— seleziona pilota —</option>
                  {regularDrivers
                    .filter(d => !existingDriverIds.has(d.id))
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.team?.name ?? '?'})
                      </option>
                    ))}
                </select>
              </div>

              {/* Step 2: where does he race */}
              <div>
                <label className="text-xs text-white font-semibold mb-0.5 block">
                  2 · In questo GP dove corre?
                </label>
                <p className="text-[11px] text-f1-gray mb-1.5">
                  Scegli la scuderia per cui gareggia in questo GP, oppure «Non corre».
                  I suoi punti scuderia andranno al proprietario della scuderia scelta.
                </p>
                <select
                  value={tempTeamId}
                  onChange={e => setTempTeamId(e.target.value)}
                  className="w-full bg-f1-black border border-f1-gray-dark rounded-lg px-3 py-2 text-white text-sm focus:border-f1-red outline-none"
                >
                  <option value="__absent__">Non corre questo GP</option>
                  {allTeams.map(t => (
                    <option key={t.id} value={t.id}>Corre per: {t.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 3: substitute in the vacated seat */}
              <div>
                <label className="text-xs text-white font-semibold mb-0.5 block">
                  3 · Chi prende il suo posto in {originalTeamName}?
                </label>
                <p className="text-[11px] text-f1-gray mb-1.5">
                  Il pilota che occupa il sedile lasciato libero. Può essere un pilota già in lista
                  oppure un sostituto esterno (riserva) che scrivi a mano — quest'ultimo darà punti
                  solo alla scuderia, non potrà essere comprato dai giocatori.
                </p>
                <div className="flex gap-2 mb-2">
                  {([
                    ['none', 'Nessuno'],
                    ['roster', 'Pilota in lista'],
                    ['external', 'Sostituto esterno'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSubMode(mode)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                        subMode === mode
                          ? 'border-f1-red text-white bg-f1-red/20'
                          : 'border-f1-gray-dark text-f1-gray hover:border-f1-gray-mid'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {subMode === 'roster' && (
                  <select
                    value={substituteDriverId}
                    onChange={e => setSubstituteDriverId(e.target.value)}
                    className="w-full bg-f1-black border border-f1-gray-dark rounded-lg px-3 py-2 text-white text-sm focus:border-f1-red outline-none"
                  >
                    <option value="">— seleziona pilota —</option>
                    {regularDrivers
                      .filter(d => d.id !== driverId)
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.team?.name ?? '?'})
                        </option>
                      ))}
                  </select>
                )}
                {subMode === 'external' && (
                  <input
                    type="text"
                    value={externalName}
                    onChange={e => setExternalName(e.target.value)}
                    placeholder="es. Yuki Tsunoda"
                    className="w-full bg-f1-black border border-f1-gray-dark rounded-lg px-3 py-2 text-white text-sm focus:border-f1-red outline-none placeholder:text-f1-gray"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-white font-semibold mb-1 block">
                  Note <span className="text-f1-gray font-normal">(opzionale)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="es. infortunio Hadjar, Lawson promosso in Red Bull"
                  className="w-full bg-f1-black border border-f1-gray-dark rounded-lg px-3 py-2 text-white text-sm focus:border-f1-red outline-none placeholder:text-f1-gray"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} loading={pending} disabled={!driverId}>
                  Salva override
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm} disabled={pending}>
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm text-f1-red hover:text-white transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              Aggiungi override pilota
            </button>
          )}

          {/* Info box */}
          <div className="text-xs text-f1-gray bg-f1-black-light border border-f1-gray-dark rounded-lg p-3 space-y-1">
            <p className="font-semibold text-white">Come funzionano i punti:</p>
            <p>• <span className="text-green-400">Punti pilota (rosa)</span>: NON cambiano mai — chi ha il pilota in rosa e lo schiera continua a ricevere i suoi punti, in qualunque scuderia corra</p>
            <p>• <span className="text-yellow-400">Punti scuderia</span>: seguono la scuderia reale del GP — se Lawson corre per Red Bull, i suoi punti scuderia vanno a chi possiede Red Bull</p>
            <p>• <span className="text-blue-400">Sostituto esterno</span>: dà punti solo alla scuderia in cui corre; non entra mai nell'asta e nessun giocatore può possederlo</p>
            <p className="text-f1-gray-mid pt-1">
              Esempio completo: Hadjar (Red Bull) infortunato → override 1: Hadjar «non corre». Lawson (Racing Bulls) lo
              sostituisce → override 2: Lawson «corre per Red Bull», e al suo posto in Racing Bulls sostituto esterno «Tsunoda».
            </p>
          </div>
        </>
      )}
    </div>
  )
}
