import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOpenF1Qualifying, getLatestQualifying, getQualifyingByRound } from '@/lib/openf1'

/**
 * GET /api/openf1
 * GET /api/openf1?gpId=mia_2026      → looks up qualifying_date, uses OpenF1
 * GET /api/openf1?round=4             → specific round (Jolpica fallback)
 * GET /api/openf1?season=2026&round=2 → specific season + round
 *
 * Returns qualifying positions mapped to our driver IDs.
 * Strategy: OpenF1 (primary, real-time) → Jolpica (fallback, post-session)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const gpIdParam = searchParams.get('gpId')
  const roundParam = searchParams.get('round')
  const season = searchParams.get('season') ?? 'current'

  try {
    const admin = createAdminClient()

    // ── Step 1: Resolve qualifying date from DB if gpId is provided ──
    let qualifyingDate: string | null = null
    let gpRound: number | null = roundParam ? Number(roundParam) : null

    if (gpIdParam) {
      const { data: gp } = await admin
        .from('grands_prix')
        .select('qualifying_date, round')
        .eq('id', gpIdParam)
        .single()
      if (gp) {
        qualifyingDate = String(gp.qualifying_date)
        gpRound = Number(gp.round)
      }
    }

    // ── Step 2: Try OpenF1 first (if we have a qualifying date) ──
    let race = null
    let results: Awaited<ReturnType<typeof getOpenF1Qualifying>>['results'] = []
    let source = 'jolpica'

    if (qualifyingDate) {
      console.log(`[API/openf1] Trying OpenF1 with qualifying date: ${qualifyingDate}`)
      const openf1 = await getOpenF1Qualifying(qualifyingDate)
      if (openf1.results.length > 0) {
        race = openf1.race
        results = openf1.results
        source = 'openf1'
        console.log(`[API/openf1] OpenF1 returned ${results.length} results`)
      } else {
        console.log('[API/openf1] OpenF1 returned no results, falling back to Jolpica')
      }
    }

    // ── Step 3: Fall back to Jolpica if OpenF1 had no data ──
    if (results.length === 0) {
      console.log(`[API/openf1] Trying Jolpica (round=${gpRound}, season=${season})`)
      const jolpica = gpRound
        ? await getQualifyingByRound(season, gpRound)
        : await getLatestQualifying(season)
      race = jolpica.race
      results = jolpica.results
      source = 'jolpica'
    }

    if (!race || results.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna qualifica trovata', positions: [] },
        { status: 404 }
      )
    }

    // Get driver mapping from our DB (by number AND by short_name/code)
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
      source,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore nel fetch dati qualifica', details: String(error) },
      { status: 500 }
    )
  }
}
