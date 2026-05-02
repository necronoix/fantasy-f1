import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    return (
      <div className="min-h-screen bg-f1-black relative">
        {/* FF1 watermark background */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'url(/ff1-watermark.svg)',
            backgroundRepeat: 'repeat',
            backgroundSize: '500px 250px',
            opacity: 0.5,
          }}
        />
        <div className="relative z-10">
          <Navbar displayName={profile?.display_name ?? user.email?.split('@')[0]} />
          <main className="max-w-5xl mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </div>
    )
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'digest' in e) {
      const digest = (e as { digest: string }).digest
      if (digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_REDIRECT')) throw e
    }
    console.error('[APP_LAYOUT_CRASH]', e)
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    return (
      <div className="min-h-screen bg-black text-white p-8 space-y-4">
        <h1 className="text-xl font-black text-red-400">DEBUG: Errore App Layout</h1>
        <pre className="text-xs text-white bg-red-900/30 p-4 rounded-lg overflow-auto whitespace-pre-wrap">{msg}</pre>
      </div>
    )
  }
}
