import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Called by Vercel cron every 3 days to prevent Supabase free-tier auto-pause.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('grands_prix')
      .select('id', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      ping: new Date().toISOString(),
      rows: count,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
