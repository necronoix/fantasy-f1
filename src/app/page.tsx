import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-f1-black flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-f1-red px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Fantasy F1 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            FORMULA
            <span className="text-f1-red"> FANTASY</span>
          </h1>
          <p className="text-f1-gray-light text-lg md:text-xl max-w-md mx-auto">
            Crea la tua lega privata, partecipa all&apos;asta, gestisci la tua scuderia e scala la classifica.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link
            href="/login"
            className="flex-1 bg-f1-red hover:bg-f1-red-dark text-white font-bold py-4 px-6 rounded-lg text-center transition-colors"
          >
            Accedi
          </Link>
          <Link
            href="/signup"
            className="flex-1 border border-f1-gray-mid hover:border-f1-red text-white font-bold py-4 px-6 rounded-lg text-center transition-colors"
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
            <div key={stat.label} className="bg-f1-black-light border border-f1-gray-dark rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-f1-red">{stat.value}</div>
              <div className="text-xs text-f1-gray-light mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-f1-gray-dark py-6 text-center text-f1-gray text-sm">
        Fantasy F1 © 2026 — Non affiliato a Formula 1 o FIA
      </footer>
    </main>
  )
}
