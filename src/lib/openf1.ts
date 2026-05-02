/**
 * F1 Data API client
 *
 * Primary: OpenF1 — free, real-time, has 2026 live data
 * Docs: https://openf1.org
 *
 * Fallback: Jolpica (Ergast replacement) — free, post-session data
 * Docs: https://github.com/jolpica/jolpica-f1
 */

const OPENF1_BASE = 'https://api.openf1.org/v1'
const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'

/* ── Types ── */
export interface QualifyingResult {
  driver_number: number
  driver_code: string // "VER", "NOR", etc.
  driver_name: string // "Max Verstappen"
  position: number
  constructor_name: string
  q1_time?: string
  q2_time?: string
  q3_time?: string
}

export interface RaceInfo {
  season: string
  round: string
  raceName: string
  circuitName: string
  country: string
  date: string
}

/* ── OpenF1 Functions ── */

/**
 * Get qualifying results from OpenF1 by finding the session for a specific date range
 */
export async function getOpenF1Qualifying(qualifyingDate: string): Promise<{
  race: RaceInfo | null
  results: QualifyingResult[]
  source: 'openf1'
}> {
  try {
    // Find qualifying session near the given date
    const dateObj = new Date(qualifyingDate)
    const dayBefore = new Date(dateObj.getTime() - 2 * 86400000).toISOString().split('T')[0]
    const dayAfter = new Date(dateObj.getTime() + 2 * 86400000).toISOString().split('T')[0]

    const sessionsRes = await fetch(
      `${OPENF1_BASE}/sessions?session_type=Qualifying&date_start>=${dayBefore}&date_start<=${dayAfter}`,
      { cache: 'no-store' }
    )
    if (!sessionsRes.ok) return { race: null, results: [], source: 'openf1' }

    const sessions = await sessionsRes.json()
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { race: null, results: [], source: 'openf1' }
    }

    // Take the last qualifying session (in case of sprint weekend with multiple)
    const session = sessions[sessions.length - 1]
    const sessionKey = session.session_key

    // Get final positions from the position endpoint
    const posRes = await fetch(
      `${OPENF1_BASE}/position?session_key=${sessionKey}`,
      { cache: 'no-store' }
    )
    if (!posRes.ok) return { race: null, results: [], source: 'openf1' }

    const positionData = await posRes.json()
    if (!Array.isArray(positionData) || positionData.length === 0) {
      return { race: null, results: [], source: 'openf1' }
    }

    // Get the LAST position entry for each driver (final qualifying result)
    const lastPositions = new Map<number, number>()
    for (const p of positionData) {
      lastPositions.set(p.driver_number, p.position)
    }

    // Get driver info from OpenF1
    const driversRes = await fetch(
      `${OPENF1_BASE}/drivers?session_key=${sessionKey}`,
      { cache: 'no-store' }
    )
    const driversData = driversRes.ok ? await driversRes.json() : []
    const driverInfo = new Map<number, { name: string; code: string; team: string }>()
    if (Array.isArray(driversData)) {
      for (const d of driversData) {
        driverInfo.set(d.driver_number, {
          name: d.full_name ?? `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim(),
          code: d.name_acronym ?? '',
          team: d.team_name ?? '',
        })
      }
    }

    // Build results
    const results: QualifyingResult[] = []
    for (const [driverNumber, position] of lastPositions) {
      const info = driverInfo.get(driverNumber)
      results.push({
        driver_number: driverNumber,
        driver_code: info?.code ?? '',
        driver_name: info?.name ?? `Driver #${driverNumber}`,
        position,
        constructor_name: info?.team ?? '',
      })
    }

    results.sort((a, b) => a.position - b.position)

    return {
      race: {
        season: String(session.year ?? new Date().getFullYear()),
        round: String(session.meeting_key ?? '?'),
        raceName: session.meeting_name ?? session.circuit_short_name ?? 'Unknown GP',
        circuitName: session.circuit_short_name ?? '',
        country: session.country_name ?? '',
        date: session.date_start?.split('T')[0] ?? qualifyingDate,
      },
      results,
      source: 'openf1',
    }
  } catch (e) {
    console.error('[OpenF1] Error fetching qualifying:', e)
    return { race: null, results: [], source: 'openf1' }
  }
}

/* ── Jolpica Functions (fallback) ── */

/**
 * Get qualifying results for the latest race of the season
 */
export async function getLatestQualifying(season: string = 'current'): Promise<{
  race: RaceInfo | null
  results: QualifyingResult[]
}> {
  try {
    const res = await fetch(
      `${JOLPICA_BASE}/${season}/last/qualifying.json`,
      { cache: 'no-store' }
    )
    if (!res.ok) return { race: null, results: [] }

    const data = await res.json()
    const races = data?.MRData?.RaceTable?.Races ?? []
    if (races.length === 0) return { race: null, results: [] }

    const race = races[0]
    return {
      race: parseJolpicaRace(race),
      results: parseJolpicaResults(race.QualifyingResults ?? []),
    }
  } catch {
    return { race: null, results: [] }
  }
}

/**
 * Get qualifying results for a specific round
 */
export async function getQualifyingByRound(season: string, round: number): Promise<{
  race: RaceInfo | null
  results: QualifyingResult[]
}> {
  try {
    const res = await fetch(
      `${JOLPICA_BASE}/${season}/${round}/qualifying.json`,
      { cache: 'no-store' }
    )
    if (!res.ok) return { race: null, results: [] }

    const data = await res.json()
    const races = data?.MRData?.RaceTable?.Races ?? []
    if (races.length === 0) return { race: null, results: [] }

    const race = races[0]
    return {
      race: parseJolpicaRace(race),
      results: parseJolpicaResults(race.QualifyingResults ?? []),
    }
  } catch {
    return { race: null, results: [] }
  }
}

/* ── Jolpica Helpers ── */

function parseJolpicaRace(race: Record<string, unknown>): RaceInfo {
  return {
    season: String(race.season ?? ''),
    round: String(race.round ?? ''),
    raceName: String(race.raceName ?? ''),
    circuitName: String((race.Circuit as Record<string, unknown>)?.circuitName ?? ''),
    country: String(
      ((race.Circuit as Record<string, unknown>)?.Location as Record<string, unknown>)?.country ?? ''
    ),
    date: String(race.date ?? ''),
  }
}

function parseJolpicaResults(qualResults: Array<Record<string, unknown>>): QualifyingResult[] {
  return qualResults.map((q) => ({
    driver_number: Number(q.number),
    driver_code: String((q.Driver as Record<string, unknown>)?.code ?? ''),
    driver_name: `${(q.Driver as Record<string, unknown>)?.givenName ?? ''} ${(q.Driver as Record<string, unknown>)?.familyName ?? ''}`.trim(),
    position: Number(q.position),
    constructor_name: String((q.Constructor as Record<string, unknown>)?.name ?? ''),
    q1_time: q.Q1 ? String(q.Q1) : undefined,
    q2_time: q.Q2 ? String(q.Q2) : undefined,
    q3_time: q.Q3 ? String(q.Q3) : undefined,
  }))
}

/**
 * Get all races for a season (to find round numbers)
 */
export async function getSeasonSchedule(season: string = 'current'): Promise<Array<{
  round: string
  raceName: string
  circuitId: string
  country: string
  date: string
}>> {
  try {
    const res = await fetch(
      `${JOLPICA_BASE}/${season}.json`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []

    const data = await res.json()
    const races = data?.MRData?.RaceTable?.Races ?? []
    return races.map((r: Record<string, unknown>) => ({
      round: String(r.round),
      raceName: String(r.raceName),
      circuitId: String((r.Circuit as Record<string, unknown>)?.circuitId ?? ''),
      country: String(
        (r.Circuit as Record<string, unknown>)?.Location
          ? ((r.Circuit as Record<string, unknown>).Location as Record<string, unknown>)?.country ?? ''
          : ''
      ),
      date: String(r.date),
    }))
  } catch {
    return []
  }
}
