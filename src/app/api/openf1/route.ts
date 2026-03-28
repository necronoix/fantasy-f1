import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getLatestQualifying, getQualifyingByRound } from '@/lib/openf1'

/**
 * GET /api/openf1
 * GET /api/openf1?round=4           → specific round
 * GET /api/openf1?season=2026&round=2  → specific season + round
 *
 * Returns qualifying positions mapped to our driver IDs
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const roundParam = searchParams.get('round')
  const season = searchParams.get('season') ?? 'current'

  try {
    // Fetch qualifying data from Jolpica API
    const { race, results } = roundParam
      ? await getQualifyingByRound(season, Number(roundParam))
      : await getLatestQualifying(season)

    if (!race || results.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna qualifica trovata', positions: [] },
        { status: 404 }
      )
    }

    // Get driver mapping from our DB (by number AND by short_name/code)
    const admin = createAdminClient()
    const { data: drivers } = await admin
      .from('drivers')
      .select('id, name, short_name, number')
      .eq('season_id', 2026)
      .eq('active', true)

    const numberToDriver = new Map(
      (drivers ?? []).map(d => [d.number, { id: d.id, name: d.name, short_name: d.short_name }])
    )
    const codeToDriver = new Map(
      (drivers ?? []).map(d => [d.short_name, { id: d.id, name: d.name, short_name: d.short_name }])
    )

    // Map API results to our driver IDs (try code first, then number)
    const mapped = results.map(r => {
      const byCode = codeToDriver.get(r.driver_code)
      const byNumber = numberToDriver.get(r.driver_number)
      const driver = byCode ?? byNumber

      return {
        driver_id: driver?.id ?? null,
        driver_name: driver?.name ?? r.driver_name,
        short_name: driver?.short_name ?? r.driver_code,
        driver_number: r.driver_number,
        driver_code: r.driver_code,
        position: r.position,
        q1_time: r.q1_time,
        q2_time: r.q2_time,
        q3_time: r.q3_time,
        constructor: r.constructor_name,
        mapped: !!driver,
      }
    }).sort((a, b) => a.position - b.position)

    const unmapped = mapped.filter(m => !m.mapped)

    return NextResponse.json({
      race: {
        name: race.raceName,
        round: race.round,
        season: race.season,
        circuit: race.circuitName,
        country: race.country,
        date: race.date,
      },
      positions: mapped,
      total: mapped.length,
      unmapped_count: unmapped.length,
      unmapped_drivers: unmapped.map(u => ({ number: u.driver_number, code: u.driver_code, name: u.driver_name })),
      fetched_at: new Date().toISOString(),
      source: 'jolpica',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore nel fetch dati qualifica', details: String(error) },
      { status: 500 }
    )
  }
}
