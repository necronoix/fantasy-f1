/**
 * Official GP results import.
 *
 * Jolpica (Ergast successor): qualifying order, race classification, DNF/DSQ,
 * fastest lap. OpenF1: safety car deployments (Jolpica does not track them).
 *
 * GPs are matched by date + country, never by round number: the app calendar
 * keeps cancelled GPs (Bahrain, Saudi Arabia), so its round numbers drift from
 * the official ones.
 */
import type { GpResultsData } from '@/lib/types'

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'
const OPENF1_BASE = 'https://api.openf1.org/v1'
const DAY_MS = 86_400_000
const MAX_DATE_DRIFT_DAYS = 3

export interface DriverRow {
  id: string
  name: string
  short_name: string
  number: number
}

export interface UnmappedDriver {
  number: number
  code: string
  name: string
}

export interface OfficialResults {
  raceName: string
  jolpicaRound: number
  qualifyingAvailable: boolean
  raceAvailable: boolean
  /** null = OpenF1 had no data for this race, so it could not be determined */
  safetyCar: boolean | null
  results: GpResultsData
  unmapped: UnmappedDriver[]
}

interface JolpicaRace {
  round: string
  date: string
  raceName: string
  Circuit?: { Location?: { country?: string } }
}

/* ── Driver matching ─────────────────────────────────────── */

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Resolves an API driver to our driver id. Order: code → full name → number →
 * unique surname. Name lookups are needed for admin-created substitutes, which
 * carry a placeholder number (900+).
 */
export function buildDriverMatcher(drivers: DriverRow[]) {
  const byCode = new Map(drivers.map(d => [d.short_name.toUpperCase(), d]))
  const byNumber = new Map(drivers.map(d => [Number(d.number), d]))
  const byName = new Map(drivers.map(d => [normalize(d.name), d]))
  const bySurname = new Map<string, DriverRow | null>()
  for (const d of drivers) {
    const surname = normalize(d.name).split(/\s+/).pop()
    if (!surname) continue
    bySurname.set(surname, bySurname.has(surname) ? null : d)
  }

  return (code: string, number: number, fullName: string): DriverRow | null => {
    const name = normalize(fullName ?? '')
    const surname = name.split(/\s+/).pop() ?? ''
    return (
      (code ? byCode.get(code.toUpperCase()) : undefined) ??
      (name ? byName.get(name) : undefined) ??
      byNumber.get(Number(number)) ??
      (surname ? bySurname.get(surname) ?? undefined : undefined) ??
      null
    )
  }
}

/* ── GP ↔ official round matching ────────────────────────── */

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function resolveJolpicaRace(
  season: number,
  gp: { date: string; country?: string | null }
): Promise<JolpicaRace | null> {
  const data = (await fetchJson(`${JOLPICA_BASE}/${season}.json?limit=40`)) as
    | { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } }
    | null
  const races = data?.MRData?.RaceTable?.Races ?? []
  if (races.length === 0) return null

  const gpTime = new Date(gp.date).getTime()
  const byDate = races
    .map(r => ({ r, drift: Math.abs(new Date(r.date).getTime() - gpTime) / DAY_MS }))
    .filter(x => x.drift <= MAX_DATE_DRIFT_DAYS)
    .sort((a, b) => a.drift - b.drift)
  if (byDate.length > 0) return byDate[0].r

  // Rescheduled GP (e.g. moved by a week): fall back to a unique country match
  if (gp.country) {
    const country = normalize(gp.country)
    const sameCountry = races.filter(r => normalize(r.Circuit?.Location?.country ?? '') === country)
    if (sameCountry.length === 1) return sameCountry[0]
  }
  return null
}

/* ── Safety car (OpenF1) ─────────────────────────────────── */

async function fetchSafetyCar(raceDate: string): Promise<boolean | null> {
  const day = new Date(raceDate).getTime()
  const from = new Date(day - DAY_MS).toISOString().slice(0, 10)
  const to = new Date(day + 2 * DAY_MS).toISOString().slice(0, 10)
  const sessions = await fetchJson(
    `${OPENF1_BASE}/sessions?session_type=Race&session_name=Race&date_start>=${from}&date_start<=${to}`
  )
  if (!Array.isArray(sessions) || sessions.length === 0) return null

  const sessionKey = sessions[sessions.length - 1].session_key
  const messages = await fetchJson(`${OPENF1_BASE}/race_control?session_key=${sessionKey}&category=SafetyCar`)
  if (!Array.isArray(messages)) return null

  // Only a full safety car counts; VSC messages start with "VIRTUAL"
  return messages.some(m => /^SAFETY CAR DEPLOYED/i.test(String(m.message ?? '')))
}

/* ── Main import ─────────────────────────────────────────── */

interface JolpicaDriver { code?: string; givenName?: string; familyName?: string }
interface JolpicaQualRow { number: string; position: string; Driver: JolpicaDriver }
interface JolpicaRaceRow {
  number: string
  position: string
  positionText: string
  Driver: JolpicaDriver
  FastestLap?: { rank?: string }
}

const fullName = (d: JolpicaDriver) => `${d.givenName ?? ''} ${d.familyName ?? ''}`.trim()

export async function fetchOfficialResults(
  season: number,
  gp: { date: string; country?: string | null },
  drivers: DriverRow[]
): Promise<OfficialResults | null> {
  const race = await resolveJolpicaRace(season, gp)
  if (!race) return null
  const round = Number(race.round)

  const [qualData, raceData, safetyCar] = await Promise.all([
    fetchJson(`${JOLPICA_BASE}/${season}/${round}/qualifying.json?limit=40`),
    fetchJson(`${JOLPICA_BASE}/${season}/${round}/results.json?limit=40`),
    fetchSafetyCar(race.date),
  ])

  const qualRows: JolpicaQualRow[] =
    (qualData as any)?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults ?? []
  const raceRows: JolpicaRaceRow[] =
    (raceData as any)?.MRData?.RaceTable?.Races?.[0]?.Results ?? []

  const match = buildDriverMatcher(drivers)
  const unmapped = new Map<string, UnmappedDriver>()
  const resolve = (row: { number: string; Driver: JolpicaDriver }) => {
    const d = match(row.Driver.code ?? '', Number(row.number), fullName(row.Driver))
    if (!d) {
      const code = row.Driver.code ?? ''
      unmapped.set(code || row.number, { number: Number(row.number), code, name: fullName(row.Driver) })
    }
    return d?.id ?? null
  }

  const qualifying_order = qualRows
    .slice()
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(q => resolve(q))
    .filter((id): id is string => id !== null)
    .map((driver_id, i) => ({ driver_id, position: i + 1 }))

  // Same shape the admin form produces: classified finishers in order,
  // then DNF, DSQ and DNC appended with trailing positions.
  const finishers: string[] = []
  const dnf: string[] = []
  const dsq: string[] = []
  const dnc: string[] = []
  let fastestLapId: string | null = null
  for (const r of raceRows.slice().sort((a, b) => Number(a.position) - Number(b.position))) {
    const id = resolve(r)
    if (!id) continue
    const pt = r.positionText
    if (/^\d+$/.test(pt)) finishers.push(id)
    else if (pt === 'D' || pt === 'E') dsq.push(id)
    else if (pt === 'W' || pt === 'F') dnc.push(id)
    else dnf.push(id) // 'R' retired, 'N' not classified
    if (r.FastestLap?.rank === '1') fastestLapId = id
  }

  const race_order: GpResultsData['race_order'] = [
    ...finishers.map(driver_id => ({
      driver_id, dnf: false, dsq: false, dnc: false,
      fastest_lap: driver_id === fastestLapId, penalty_positions: 0,
    })),
    ...dnf.map(driver_id => ({ driver_id, dnf: true, dsq: false, dnc: false, fastest_lap: false, penalty_positions: 0 })),
    ...dsq.map(driver_id => ({ driver_id, dnf: false, dsq: true, dnc: false, fastest_lap: false, penalty_positions: 0 })),
    ...dnc.map(driver_id => ({ driver_id, dnf: false, dsq: false, dnc: true, fastest_lap: false, penalty_positions: 0 })),
  ].map((r, i) => ({ ...r, position: i + 1 }))

  return {
    raceName: race.raceName,
    jolpicaRound: round,
    qualifyingAvailable: qualRows.length > 0,
    raceAvailable: raceRows.length > 0,
    safetyCar,
    results: {
      qualifying_order,
      race_order,
      safety_car: safetyCar ?? false,
    },
    unmapped: [...unmapped.values()],
  }
}
