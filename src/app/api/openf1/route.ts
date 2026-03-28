import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getLatestQualifyingSession, getSessionPositions, findSession } from '@/lib/openf1'

/**
 * GET /api/openf1?session_key=...
 * or GET /api/openf1?country=Japan&year=2026
 * or GET /api/openf1 (latest qualifying)
 *
 * Returns qualifying positions mapped to our driver IDs
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sessionKeyParam = searchParams.get('session_key')
  const country = searchParams.get('country')
  const year = Number(searchParams.get('year') ?? 2026)

  try {
    // Resolve session key
    let sessionKey: number | null = null

    if (sessionKeyParam) {
      sessionKey = Number(sessionKeyParam)
    } else if (country) {
      const session = await findSession(year, 'Qualifying', country)
      sessionKey = session?.session_key ?? null
    } else {
      const session = await getLatestQualifyingSession(year)
      sessionKey = session?.session_key ?? null
    }

    if (!sessionKey) {
      return NextResponse.json(
        { error: 'Nessuna sessione di qualifica trovata', positions: [] },
        { status: 404 }
      )
    }

    // Fetch positions from OpenF1
    const positions = await getSessionPositions(sessionKey)

    if (positions.length === 0) {
      return NextResponse.json(
        { error: 'Nessun dato di posizione disponibile', session_key: sessionKey, positions: [] },
        { status: 200 }
      )
    }

    // Get driver number → driver_id mapping from our DB
    const admin = createAdminClient()
    const { data: drivers } = await admin
      .from('drivers')
      .select('id, name, short_name, number')
      .eq('season_id', 2026)
      .eq('active', true)

    const numberToDriver = new Map(
      (drivers ?? []).map(d => [d.number, { id: d.id, name: d.name, short_name: d.short_name }])
    )

    // Map OpenF1 positions to our driver IDs
    const mapped = positions
      .map(pos => {
        const driver = numberToDriver.get(pos.driver_number)
        return {
          driver_id: driver?.id ?? null,
          driver_name: driver?.name ?? `#${pos.driver_number}`,
          short_name: driver?.short_name ?? `#${pos.driver_number}`,
          driver_number: pos.driver_number,
          position: pos.position,
          timestamp: pos.date,
          mapped: !!driver,
        }
      })
      .sort((a, b) => a.position - b.position)

    const unmapped = mapped.filter(m => !m.mapped)

    return NextResponse.json({
      session_key: sessionKey,
      positions: mapped,
      total: mapped.length,
      unmapped_count: unmapped.length,
      unmapped_drivers: unmapped.map(u => u.driver_number),
      fetched_at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore nel fetch da OpenF1', details: String(error) },
      { status: 500 }
    )
  }
}
