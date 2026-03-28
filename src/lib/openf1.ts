/**
 * F1 Data API client
 * Uses Jolpica (Ergast replacement) — free, reliable, has 2026 data
 * Docs: https://github.com/jolpica/jolpica-f1
 *
 * Fallback: OpenF1 (currently down/no 2026 data)
 */

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

/* ── API Functions ── */

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
      race: {
        season: race.season,
        round: race.round,
        raceName: race.raceName,
        circuitName: race.Circuit?.circuitName ?? '',
        country: race.Circuit?.Location?.country ?? '',
        date: race.date,
      },
      results: (race.QualifyingResults ?? []).map((q: Record<string, unknown>) => ({
        driver_number: Number(q.number),
        driver_code: String((q.Driver as Record<string, unknown>)?.code ?? ''),
        driver_name: `${(q.Driver as Record<string, unknown>)?.givenName ?? ''} ${(q.Driver as Record<string, unknown>)?.familyName ?? ''}`.trim(),
        position: Number(q.position),
        constructor_name: String((q.Constructor as Record<string, unknown>)?.name ?? ''),
        q1_time: (q as Record<string, unknown>).Q1 ? String((q as Record<string, unknown>).Q1) : undefined,
        q2_time: (q as Record<string, unknown>).Q2 ? String((q as Record<string, unknown>).Q2) : undefined,
        q3_time: (q as Record<string, unknown>).Q3 ? String((q as Record<string, unknown>).Q3) : undefined,
      })),
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
      race: {
        season: race.season,
        round: race.round,
        raceName: race.raceName,
        circuitName: race.Circuit?.circuitName ?? '',
        country: race.Circuit?.Location?.country ?? '',
        date: race.date,
      },
      results: (race.QualifyingResults ?? []).map((q: Record<string, unknown>) => ({
        driver_number: Number(q.number),
        driver_code: String((q.Driver as Record<string, unknown>)?.code ?? ''),
        driver_name: `${(q.Driver as Record<string, unknown>)?.givenName ?? ''} ${(q.Driver as Record<string, unknown>)?.familyName ?? ''}`.trim(),
        position: Number(q.position),
        constructor_name: String((q.Constructor as Record<string, unknown>)?.name ?? ''),
        q1_time: (q as Record<string, unknown>).Q1 ? String((q as Record<string, unknown>).Q1) : undefined,
        q2_time: (q as Record<string, unknown>).Q2 ? String((q as Record<string, unknown>).Q2) : undefined,
        q3_time: (q as Record<string, unknown>).Q3 ? String((q as Record<string, unknown>).Q3) : undefined,
      })),
    }
  } catch {
    return { race: null, results: [] }
  }
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
      country: String((r.Circuit as Record<string, unknown>)?.Location
        ? ((r.Circuit as Record<string, unknown>).Location as Record<string, unknown>)?.country ?? ''
        : ''),
      date: String(r.date),
    }))
  } catch {
    return []
  }
}
