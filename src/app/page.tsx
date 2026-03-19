import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-f1-black flex flex-col relative overflow-hidden">
      {/* Background watermark pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/ff1-watermark.svg)',
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 200px',
          opacity: 0.6,
        }}
      />

      {/* Radial glow behind logo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,0,45,0.12) 0%, rgba(232,0,45,0.04) 40%, transparent 70%)',
        }}
      />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center relative z-10">
        {/* FF1 Logo */}
        <div className="mb-6 relative">
          <div className="relative">
            <Image
              src="/ff1-logo.svg"
              alt="Fantasy F1 Logo"
              width={480}
              height={240}
              priority
              className="drop-shadow-[0_0_40px_rgba(232,0,45,0.3)] w-[340px] md:w-[480px] h-auto"
            />
          </div>
        </div>

        {/* Season badge */}
        <div className="inline-flex items-center gap-2 bg-f1-red/20 border border-f1-red/40 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse" />
          Stagione 2026
        </div>

        <p className="text-f1-gray-light text-lg md:text-xl max-w-md mx-auto mb-10 leading-relaxed">
          Crea la tua lega privata, partecipa all&apos;asta, gestisci la tua scuderia e scala la classifica.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link
            href="/login"
            className="flex-1 bg-gradient-to-r from-f1-red to-f1-red-dark hover:from-red-600 hover:to-red-800 text-white font-black py-4 px-6 rounded-xl text-center transition-all duration-300 uppercase tracking-wider shadow-[0_0_20px_rgba(232,0,45,0.3)] hover:shadow-[0_0_30px_rgba(232,0,45,0.5)] hover:-translate-y-0.5"
          >
            Accedi
          </Link>
          <Link
            href="/signup"
            className="flex-1 border-2 border-f1-gray-mid/50 hover:border-f1-red/60 text-white font-bold py-4 px-6 rounded-xl text-center transition-all duration-300 uppercase tracking-wider backdrop-blur-sm hover:-translate-y-0.5"
          >
            Registrati
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          {[
            { label: 'Piloti per rosa', value: '4' },
            { label: 'Budget asta', value: '200' },
            { label: 'Max giocatori', value: '5' },
            { label: 'GP stagione', value: '24' },
          ].map((stat) => (
            <div key={stat.label} className="bg-f1-black-light/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center hover:border-f1-red/30 transition-all duration-300 group">
              <div className="text-3xl font-black text-f1-red group-hover:drop-shadow-[0_0_8px_rgba(232,0,45,0.5)] transition-all">{stat.value}</div>
              <div className="text-xs text-f1-gray-light mt-1 uppercase tracking-wide font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 border-t border-f1-gray-dark/50 py-6 text-center text-f1-gray text-sm backdrop-blur-sm">
        Fantasy F1 © 2026 — Non affiliato a Formula 1 o FIA
      </footer>
    </main>
  )
}
