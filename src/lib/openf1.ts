/**
 * OpenF1 API client
 * Free API for real-time and historical F1 data
 * Docs: https://openf1.org
 */

const BASE_URL = 'https://api.openf1.org/v1'

/* ── Types ── */
export interface OpenF1Session {
  session_key: number
  session_name: string // "Qualifying", "Race", "Sprint", "Practice 1", etc.
  session_type: string // "Qualifying", "Race", etc.
  date_start: string
  date_end: string
  circuit_short_name: string
  country_name: string
  year: number
  meeting_key: number
}

export interface OpenF1Position {
  session_key: number
  driver_number: number
  position: number
  date: string // ISO timestamp
}

export interface OpenF1Driver {
  session_key: number
  driver_number: number
  full_name: string
  name_acronym: string // "VER", "NOR", etc.
  team_name: string
}

/* ── API Functions ── */

/**
 * Get the latest qualifying session for a given year
 */
export async function getLatestQualifyingSession(year: number = 2026): Promise<OpenF1Session | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/sessions?year=${year}&session_type=Qualifying&order=-date_start&limit=1`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data[0] ?? null
  } catch {
    return null
  }
}

/**
 * Get a specific qualifying session by meeting key
 */
export async function getQualifyingSession(meetingKey: number): Promise<OpenF1Session | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/sessions?meeting_key=${meetingKey}&session_type=Qualifying`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data[0] ?? null
  } catch {
    return null
  }
}

/**
 * Get current positions for a session
 * Returns the latest position for each driver
 */
export async function getSessionPositions(sessionKey: number): Promise<OpenF1Position[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/position?session_key=${sessionKey}`,
      { cache: 'no-store' } // Always fetch fresh during live
    )
    if (!res.ok) return []
    const data: OpenF1Position[] = await res.json()

    // OpenF1 returns all position updates — get only the latest per driver
    const latestByDriver = new Map<number, OpenF1Position>()
    for (const pos of data) {
      const existing = latestByDriver.get(pos.driver_number)
      if (!existing || new Date(pos.date) > new Date(existing.date)) {
        latestByDriver.set(pos.driver_number, pos)
      }
    }

    return [...latestByDriver.values()].sort((a, b) => a.position - b.position)
  } catch {
    return []
  }
}

/**
 * Get drivers for a session (for mapping driver_number to names)
 */
export async function getSessionDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/drivers?session_key=${sessionKey}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/**
 * Get all sessions for a meeting (race weekend)
 */
export async function getMeetingSessions(meetingKey: number): Promise<OpenF1Session[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/sessions?meeting_key=${meetingKey}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/**
 * Search sessions by country/circuit
 */
export async function findSession(
  year: number,
  sessionType: string,
  countryName?: string
): Promise<OpenF1Session | null> {
  try {
    let url = `${BASE_URL}/sessions?year=${year}&session_type=${sessionType}`
    if (countryName) url += `&country_name=${encodeURIComponent(countryName)}`
    url += '&order=-date_start&limit=1'

    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    return data[0] ?? null
  } catch {
    return null
  }
}
