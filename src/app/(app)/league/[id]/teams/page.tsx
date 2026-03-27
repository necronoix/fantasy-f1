import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { redirect } from 'next/navigation'
import { Car } from 'lucide-react'
import { DriverListInteractive } from '@/components/f1/DriverInfoModal'

interface Props {
  params: Promise<{ id: string }>
}

type Risk = 'Basso' | 'Medio-basso' | 'Medio' | 'Medio-alto' | 'Alto' | 'Molto alto'
type Tier = 'S' | 'A' | 'B+' | 'B' | 'C' | 'D'

interface TeamData {
  id: string
  name: string
  emoji: string
  color: string
  status: string
  trend: string
  risk: Risk
  indicators: string[]
  tier: Tier
  stars: number
  strategy: string
  drivers: Array<{ name: string; note: string }>
}

const TEAMS: TeamData[] = [
  {
    id: 'mercedes',
    name: 'Mercedes',
    emoji: '⚪',
    color: '#00D2BE',
    status: 'Dominante',
    trend: 'Prestazione + affidabilità top',
    risk: 'Basso',
    indicators: [
      '2 doppiette in 2 gare',
      '0 ritiri',
      'Miglior conversione punti del campionato',
    ],
    tier: 'S',
    stars: 5,
    strategy: 'Base del roster',
    drivers: [
      { name: 'George Russell', note: 'costanza elite' },
      { name: 'Kimi Antonelli', note: 'ceiling altissimo' },
    ],
  },
  {
    id: 'ferrari',
    name: 'Ferrari',
    emoji: '🔴',
    color: '#DC0000',
    status: 'Seconda forza',
    trend: 'Stabilità competitiva',
    risk: 'Medio-basso',
    indicators: [
      'Sempre in top-4',
      'Nessun errore strategico rilevante',
      'Gap prestazionale contenuto',
    ],
    tier: 'A',
    stars: 4,
    strategy: 'Team di accumulo punti',
    drivers: [
      { name: 'Charles Leclerc', note: 'rendimento costante' },
      { name: 'Lewis Hamilton', note: 'gestione gara eccellente' },
    ],
  },
  {
    id: 'haas',
    name: 'Haas F1 Team',
    emoji: '⚪',
    color: '#B6BABD',
    status: 'Miglior sorpresa',
    trend: 'Efficienza operativa',
    risk: 'Medio',
    indicators: [
      'Nessun errore grave',
      'Ottimo sfruttamento opportunità',
      'Performance costante in gara',
    ],
    tier: 'B+',
    stars: 3,
    strategy: 'Value team',
    drivers: [
      { name: 'Oliver Bearman', note: 'scorer solido' },
      { name: 'Esteban Ocon', note: 'ritmo nascosto' },
    ],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    emoji: '🔷',
    color: '#0090FF',
    status: 'Midfield stabile',
    trend: 'Crescita progressiva',
    risk: 'Medio',
    indicators: [
      'Miglioramento evidente tra gare',
      'Affidabilità positiva',
      'Ritmo competitivo',
    ],
    tier: 'B+',
    stars: 3,
    strategy: 'Team affidabile da rotazione',
    drivers: [
      { name: 'Pierre Gasly', note: 'costanza' },
      { name: 'Franco Colapinto', note: 'trend positivo' },
    ],
  },
  {
    id: 'racing-bulls',
    name: 'Racing Bulls',
    emoji: '🔷',
    color: '#6692FF',
    status: 'Midfield efficiente',
    trend: 'Opportunismo competitivo',
    risk: 'Medio',
    indicators: [
      'Buone rimonte',
      'Strategia efficace',
      'Ritmo medio stabile',
    ],
    tier: 'B',
    stars: 3,
    strategy: 'Value pick',
    drivers: [
      { name: 'Liam Lawson', note: 'rimonta affidabile' },
      { name: 'Arvid Lindblad', note: 'aggressività utile' },
    ],
  },
  {
    id: 'redbull',
    name: 'Red Bull Racing',
    emoji: '🔵',
    color: '#3671C6',
    status: 'Instabile',
    trend: 'Picchi elevati ma incoerenti',
    risk: 'Medio-alto',
    indicators: [
      'Velocità elevata',
      'Ritiri rilevanti',
      'Performance imprevedibile',
    ],
    tier: 'B',
    stars: 2,
    strategy: 'Team da scommessa',
    drivers: [
      { name: 'Max Verstappen', note: 'carry potential' },
      { name: 'Isack Hadjar', note: 'rookie volatile' },
    ],
  },
  {
    id: 'mclaren',
    name: 'McLaren',
    emoji: '🟠',
    color: '#FF8000',
    status: 'Veloce ma instabile',
    trend: 'Potenziale non convertito',
    risk: 'Alto',
    indicators: [
      'Qualifiche competitive',
      '2 DNS nello stesso weekend',
      'Problemi tecnici critici',
    ],
    tier: 'B',
    stars: 2,
    strategy: 'Pick ad alto rischio',
    drivers: [
      { name: 'Lando Norris', note: 'velocità pura' },
      { name: 'Oscar Piastri', note: 'talento ma fragile' },
    ],
  },
  {
    id: 'williams',
    name: 'Williams',
    emoji: '🔵',
    color: '#37BEDD',
    status: 'Fondo-midfield',
    trend: 'Segnali intermittenti',
    risk: 'Medio',
    indicators: [
      'Qualifiche deboli',
      'Rimonte occasionali',
      'Prestazioni irregolari',
    ],
    tier: 'C',
    stars: 2,
    strategy: 'Situazionale',
    drivers: [
      { name: 'Carlos Sainz', note: 'rimonta efficace' },
      { name: 'Alexander Albon', note: 'incostante' },
    ],
  },
  {
    id: 'audi',
    name: 'Audi',
    emoji: '⚫',
    color: '#999999',
    status: 'Fragile',
    trend: 'Problemi tecnici frequenti',
    risk: 'Alto',
    indicators: [
      'Ritmo discreto',
      'Affidabilità scarsa',
      'Ritiri multipli',
    ],
    tier: 'C',
    stars: 1,
    strategy: 'Evitare',
    drivers: [
      { name: 'Nico Hulkenberg', note: 'esperienza' },
      { name: 'Gabriel Bortoleto', note: 'potenziale instabile' },
    ],
  },
  {
    id: 'cadillac',
    name: 'Cadillac',
    emoji: '🟡',
    color: '#D4AF37',
    status: 'Bassa competitività',
    trend: 'Difficoltà strutturale',
    risk: 'Alto',
    indicators: [
      'Zero punti',
      'Ritmo basso',
      'Recuperi limitati',
    ],
    tier: 'D',
    stars: 1,
    strategy: 'Non utilizzare',
    drivers: [
      { name: 'Sergio Perez', note: '' },
      { name: 'Valtteri Bottas', note: '' },
    ],
  },
  {
    id: 'aston-martin',
    name: 'Aston Martin',
    emoji: '🟢',
    color: '#358C75',
    status: 'Ultima forza',
    trend: 'Problemi tecnici gravi',
    risk: 'Molto alto',
    indicators: [
      'Zero punti',
      'Ritiri frequenti',
      'Performance insufficiente',
    ],
    tier: 'D',
    stars: 1,
    strategy: 'Evitare',
    drivers: [
      { name: 'Fernando Alonso', note: 'talento non convertito' },
      { name: 'Lance Stroll', note: 'rendimento basso' },
    ],
  },
]

/* ── Helpers ─────────────────────────────────────────────── */
const TIER_STYLE: Record<Tier, string> = {
  'S': 'bg-f1-red text-white',
  'A': 'bg-amber-500 text-black',
  'B+': 'bg-blue-500 text-white',
  'B': 'bg-blue-700 text-white',
  'C': 'bg-f1-gray-mid text-f1-gray-light',
  'D': 'bg-f1-gray-dark text-f1-gray',
}

const RISK_STYLE: Record<Risk, string> = {
  'Basso': 'text-emerald-400',
  'Medio-basso': 'text-lime-400',
  'Medio': 'text-yellow-400',
  'Medio-alto': 'text-orange-400',
  'Alto': 'text-red-400',
  'Molto alto': 'text-red-500',
}

function Stars({ n, color }: { n: number; color: string }) {
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{ color: i <= n ? color : undefined }}
          className={i <= n ? 'text-base leading-none' : 'text-base leading-none text-f1-gray-dark'}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function TeamCard({ team }: { team: TeamData }) {
  return (
    <div
      className="bg-f1-black-light rounded-xl overflow-hidden border border-f1-gray-dark flex flex-col"
      style={{ borderTopColor: team.color, borderTopWidth: '3px' }}
    >
      {/* ── Header ── */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-white text-sm uppercase tracking-widest">
            {team.name}
          </h2>
          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${TIER_STYLE[team.tier]}`}>
            Tier&nbsp;{team.tier}
          </span>
        </div>

        {/* Status / Trend / Rischio */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-f1-gray-dark/60 rounded-lg p-2.5">
            <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-1">Stato</p>
            <p className="text-[11px] font-bold text-white leading-tight">{team.status}</p>
          </div>
          <div className="bg-f1-gray-dark/60 rounded-lg p-2.5">
            <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-1">Trend</p>
            <p className="text-[11px] font-bold text-white leading-tight">{team.trend}</p>
          </div>
          <div className="bg-f1-gray-dark/60 rounded-lg p-2.5">
            <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-1">Rischio</p>
            <p className={`text-[11px] font-bold leading-tight ${RISK_STYLE[team.risk]}`}>{team.risk}</p>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-f1-gray-dark/70 mx-4" />

      {/* ── Key indicators ── */}
      <div className="px-4 pt-3 pb-3">
        <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-2">
          Indicatori chiave
        </p>
        <ul className="space-y-1">
          {team.indicators.map((ind, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-f1-gray-light">
              <span style={{ color: team.color }} className="text-xs leading-5 flex-shrink-0">▸</span>
              {ind}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Fantasy eval ── */}
      <div className="mx-4 mb-3 rounded-lg border border-f1-gray-dark bg-f1-gray-dark/30 p-3">
        <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-2">
          Valutazione Fantasy
        </p>
        <div className="flex items-center justify-between gap-2">
          <Stars n={team.stars} color={team.color} />
          <p className="text-[11px] text-f1-gray-light text-right italic leading-tight">
            {team.strategy}
          </p>
        </div>
      </div>

      {/* ── Drivers (interactive) ── */}
      <div className="px-4 pb-4 mt-auto">
        <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-2">
          Piloti <span className="normal-case font-normal text-f1-gray/60">— tocca per info</span>
        </p>
        <DriverListInteractive
          drivers={team.drivers}
          teamColor={team.color}
          teamName={team.name}
        />
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────── */
export default async function TeamsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('league_members')
    .select('role')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect(`/league/${id}`)
  const isAdmin = (membership as Record<string, unknown>).role === 'admin'

  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-f1-red/10 border border-f1-red/20">
          <Car className="w-5 h-5 text-f1-red" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Scuderie 2026</h1>
          <p className="text-f1-gray text-sm">Analisi costruttori · Guida fantasy</p>
        </div>
      </div>

      <LeagueNav leagueId={id} isAdmin={isAdmin} />

      {/* ── Tier Legend ── */}
      <div className="bg-f1-black-light rounded-xl border border-f1-gray-dark p-3">
        <p className="text-[9px] font-bold text-f1-gray uppercase tracking-widest mb-2.5">
          Legenda Tier Fantasy
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['S', 'Dominante — base obbligatoria'],
              ['A', 'Solido — ottimo value'],
              ['B+', 'Buono — da considerare'],
              ['B', 'Volatile — con riserve'],
              ['C', 'Medio — situazionale'],
              ['D', 'Evitare'],
            ] as [Tier, string][]
          ).map(([tier, desc]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${TIER_STYLE[tier]}`}>
                {tier}
              </span>
              <span className="text-[10px] text-f1-gray">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Teams Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEAMS.map(team => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-[10px] text-f1-gray pb-2">
        Dati aggiornati alle prime 2 gare del Mondiale 2026 · Aggiornamento continuo
      </p>

    </div>
  )
}
