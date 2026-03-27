'use client'

import { useState } from 'react'
import { X, Zap, MapPin, TrendingUp, TrendingDown, Gamepad2, ChevronRight } from 'lucide-react'

/* ── Types ────────────────────────────────────────────────── */
interface DriverInfo {
  style: string
  specialistTracks: string[]
  strengths: string[]
  weaknesses: string[]
  fantasyTip: string
  ratings: {
    qualifying: number    // 1-5
    race: number
    rain: number
    overtaking: number
    consistency: number
  }
}

/* ── Driver database ─────────────────────────────────────── */
const DRIVER_DATA: Record<string, DriverInfo> = {
  'George Russell': {
    style: 'Tecnico e metodico. Massimizza ogni millesimo dall\'auto, eccezionale nel setup e nel feedback agli ingegneri.',
    specialistTracks: ['Monza', 'Silverstone', 'Spa', 'Suzuka'],
    strengths: ['Gestione gomme', 'Qualifiche', 'Passo gara costante'],
    weaknesses: ['Corpo a corpo ravvicinato'],
    fantasyTip: 'Capitano quasi obbligato: affidabile e veloce su ogni tipo di circuito. Priorità assoluta.',
    ratings: { qualifying: 5, race: 5, rain: 4, overtaking: 3, consistency: 5 },
  },
  'Kimi Antonelli': {
    style: 'Aggressivo e istintivo. Guida ad istinto con riflessi eccezionali, ricorda Hamilton nei suoi anni giovanili.',
    specialistTracks: ['Monaco', 'Baku', 'Monza'],
    strengths: ['Ceiling altissimo', 'Pioggia', 'Corpo a corpo'],
    weaknesses: ['Errori da rookie', 'Gestione pressione'],
    fantasyTip: 'Pick speculativo ma con enorme upside. Ottimo come panchina o capitano su circuiti casalinghi.',
    ratings: { qualifying: 4, race: 4, rain: 5, overtaking: 4, consistency: 3 },
  },
  'Charles Leclerc': {
    style: 'Esplosivo e aggressivo in qualifica. Il più forte uomo singolo sul giro secco dell\'intera griglia.',
    specialistTracks: ['Monaco', 'Baku', 'Spa', 'Monza'],
    strengths: ['Qualifiche assolute', 'Piste cittadine', 'Primo giro'],
    weaknesses: ['Gestione gara sotto pressione'],
    fantasyTip: 'Capitano ideale su GP cittadini e circuiti veloci. Quasi sempre in top-3 sul giro secco.',
    ratings: { qualifying: 5, race: 4, rain: 3, overtaking: 3, consistency: 4 },
  },
  'Lewis Hamilton': {
    style: 'Il più completo della storia. Legge la gara come nessun altro, maestro della gestione e dell\'adattamento.',
    specialistTracks: ['Silverstone', 'Interlagos', 'Hungaroring', 'Singapore'],
    strengths: ['Pioggia', 'Sorpassi', 'Gestione gomme', 'Gara lunga'],
    weaknesses: ['Nessuna rilevante'],
    fantasyTip: 'Capitano sicuro su piste tecniche e nei weekend con meteo variabile. Sempre da considerare.',
    ratings: { qualifying: 4, race: 5, rain: 5, overtaking: 5, consistency: 5 },
  },
  'Oliver Bearman': {
    style: 'Aggressivo e senza paura. Corre senza calcoli, va all\'attacco in ogni situazione.',
    specialistTracks: ['Jeddah', 'Melbourne'],
    strengths: ['Corpo a corpo', 'Primo giro', 'Ritmo gara'],
    weaknesses: ['Esperienza limitata', 'Gestione gomme in gara lunga'],
    fantasyTip: 'Value pick solido per Haas. Affidabile nei punti, buona scelta su circuiti dove si può attaccare.',
    ratings: { qualifying: 3, race: 4, rain: 3, overtaking: 4, consistency: 4 },
  },
  'Esteban Ocon': {
    style: 'Regolare e metodico. Non brillantissimo ma difficile da battere in gara, sa come portare a casa i punti.',
    specialistTracks: ['Bahrain', 'Qatar', 'Monaco'],
    strengths: ['Gestione gomme', 'Tattica', 'Costanza'],
    weaknesses: ['Qualifiche non eccellenti', 'Velocità di punta'],
    fantasyTip: 'Ottimo pick su piste dove la strategia fa la differenza. Buona scelta come panchina affidabile.',
    ratings: { qualifying: 3, race: 4, rain: 3, overtaking: 3, consistency: 5 },
  },
  'Pierre Gasly': {
    style: 'Tattico e intelligente. Eccelle nelle gare caotiche dove la lucidità fa la differenza.',
    specialistTracks: ['Monaco', 'Singapore', 'Azerbaijan'],
    strengths: ['Piste cittadine', 'Gare con safety car', 'Tattica'],
    weaknesses: ['Qualifiche su piste veloci', 'Ritmo su circuiti ad alta velocità'],
    fantasyTip: 'Ottimo su piste cittadine e GP caotici. Consideralo capitano su Monaco, Singapore, Baku.',
    ratings: { qualifying: 3, race: 4, rain: 4, overtaking: 3, consistency: 4 },
  },
  'Franco Colapinto': {
    style: 'Aggressivo e imprevedibile. Alta velocità di apprendimento, migliora gara dopo gara con entusiasmo.',
    specialistTracks: ['Montreal', 'Spa'],
    strengths: ['Corpo a corpo', 'Ritmo in crescita', 'Primo giro'],
    weaknesses: ['Esperienza', 'Costanza weekend'],
    fantasyTip: 'Pick speculativo su piste veloci. Trend positivo: monitorare per i prossimi GP.',
    ratings: { qualifying: 3, race: 3, rain: 3, overtaking: 4, consistency: 3 },
  },
  'Liam Lawson': {
    style: 'Combattivo e determinato. Non molla mai, specialista nelle rimonte e nei duelli ravvicinati.',
    specialistTracks: ['Montreal', 'Melbourne', 'Silverstone'],
    strengths: ['Sorpassi', 'Rimonte', 'Battaglie ruota a ruota'],
    weaknesses: ['Qualifiche (posizione di partenza)', 'Piste tecniche lente'],
    fantasyTip: 'Buon pick su piste con opportunità di sorpasso. Brilla quando parte indietro.',
    ratings: { qualifying: 3, race: 4, rain: 3, overtaking: 5, consistency: 3 },
  },
  'Arvid Lindblad': {
    style: 'Rookie aggressivo con grande talento grezzo. Stile istintivo, non si tira mai indietro.',
    specialistTracks: ['TBD (rookie)'],
    strengths: ['Aggressività', 'Rimonte', 'Passo gara'],
    weaknesses: ['Esperienza F1', 'Gestione pressione', 'Qualifiche'],
    fantasyTip: 'Wild card: rischio alto, reward potenzialmente alto. Monitorarlo nelle prime gare.',
    ratings: { qualifying: 2, race: 3, rain: 3, overtaking: 4, consistency: 2 },
  },
  'Max Verstappen': {
    style: 'Il più completo in assoluto. Domina ogni aspetto della guida — qualifica, gara, pioggia, gestione. Semplicemente il migliore.',
    specialistTracks: ['Tutti i circuiti'],
    strengths: ['Pioggia', 'Gestione gomme', 'Qualifiche', 'Gara', 'Adattabilità'],
    weaknesses: ['Nessuna rilevante'],
    fantasyTip: 'Capitano quasi sempre, indipendentemente dal circuito. Il miglior pick fantasy della griglia.',
    ratings: { qualifying: 5, race: 5, rain: 5, overtaking: 5, consistency: 5 },
  },
  'Isack Hadjar': {
    style: 'Aggressivo e talentuoso. Rookie con fame di vittoria, prende rischi calcolati e ha un alto ceiling.',
    specialistTracks: ['Baku', 'Montreal'],
    strengths: ['Corpo a corpo', 'Primo giro', 'Piste veloci'],
    weaknesses: ['Esperienza F1', 'Gestione under pressione', 'Pioggia'],
    fantasyTip: 'Speculativo: alto rischio/reward. Da usare quando Red Bull è in giornata di grazia.',
    ratings: { qualifying: 3, race: 3, rain: 2, overtaking: 4, consistency: 2 },
  },
  'Lando Norris': {
    style: 'Esplosivo e adrenalinico. Uno dei più veloci sul giro secco, eccellente nelle condizioni difficili.',
    specialistTracks: ['Bahrain', 'Miami', 'Zandvoort', 'Silverstone'],
    strengths: ['Qualifiche', 'Pioggia', 'Velocità pura'],
    weaknesses: ['Errori sotto pressione estrema', 'Affidabilità (macchina)'],
    fantasyTip: 'Capitano su piste veloci se la McLaren è affidabile. Alto ceiling ma monitorare i problemi tecnici.',
    ratings: { qualifying: 5, race: 4, rain: 5, overtaking: 4, consistency: 3 },
  },
  'Oscar Piastri': {
    style: 'Tecnico e metodico. Stile pulito e preciso, gestisce le gomme in modo esemplare senza sprechi.',
    specialistTracks: ['Singapore', 'Qatar', 'Melbourne'],
    strengths: ['Gestione gomme', 'Passo gara', 'Piste tecniche'],
    weaknesses: ['Qualifiche di punta', 'Affidabilità (macchina)'],
    fantasyTip: 'Ottimo come panchina o capitano alternativo su piste ad alto degrado gomme.',
    ratings: { qualifying: 4, race: 4, rain: 3, overtaking: 3, consistency: 4 },
  },
  'Carlos Sainz': {
    style: 'Completo e affidabilissimo. Uno degli all-rounder più solidi della griglia, si adatta a tutto.',
    specialistTracks: ['Singapore', 'Melbourne', 'Montreal', 'Monza'],
    strengths: ['Qualifiche', 'Adattabilità', 'Pioggia', 'Piste cittadine'],
    weaknesses: ['Rimonte dal fondo in gara'],
    fantasyTip: 'Uno dei pick più sicuri del midfield. Affidabilissimo su quasi ogni tipo di circuito.',
    ratings: { qualifying: 4, race: 4, rain: 4, overtaking: 3, consistency: 5 },
  },
  'Alexander Albon': {
    style: 'Eccellente nel traffico. Specialista nel difendere le posizioni e nel tirar fuori il massimo in gara.',
    specialistTracks: ['Baku', 'Singapore'],
    strengths: ['Difesa posizioni', 'Sorpassi nel traffico', 'Dure condizioni'],
    weaknesses: ['Qualifiche', 'Ritmo puro in macchina lenta'],
    fantasyTip: 'Situazionale: meglio su piste con safety car o GP caotici. Evitare in qualifica.',
    ratings: { qualifying: 3, race: 3, rain: 3, overtaking: 4, consistency: 3 },
  },
  'Nico Hulkenberg': {
    style: 'Veterano esperto e solido. Massimizza ogni weekend con intelligenza tattica e zero errori.',
    specialistTracks: ['Bahrain', 'Silverstone', 'Spa'],
    strengths: ['Tattica', 'Gestione gara', 'Esperienza'],
    weaknesses: ['Qualifiche top assolute', 'Ritmo nei circuiti lenti'],
    fantasyTip: 'Buon pick per la costanza in un midfield competitivo. Affidabile ma senza esplosività.',
    ratings: { qualifying: 3, race: 3, rain: 3, overtaking: 3, consistency: 5 },
  },
  'Gabriel Bortoleto': {
    style: 'Aggressivo e coraggioso. Ex campione F2, porta lo stesso spirito combattivo in F1.',
    specialistTracks: ['TBD (rookie)'],
    strengths: ['Corpo a corpo', 'Gare chaotiche', 'Potenziale grezzo'],
    weaknesses: ['Esperienza F1', 'Affidabilità macchina', 'Gestione gomme'],
    fantasyTip: 'Speculativo: da usare solo su piste dove può fare sorpassi. Dipende molto dall\'Audi.',
    ratings: { qualifying: 3, race: 3, rain: 2, overtaking: 4, consistency: 2 },
  },
  'Sergio Perez': {
    style: 'Maestro delle gomme. Nessuno gestisce le mescole come lui in gara lunga, specialista street circuit.',
    specialistTracks: ['Abu Dhabi', 'Bahrain', 'Baku', 'Singapore'],
    strengths: ['Gestione gomme', 'Piste cittadine', 'Gara lunga'],
    weaknesses: ['Qualifiche', 'Prestazione macchina nuova (Cadillac)'],
    fantasyTip: 'In un\'auto competitiva sarebbe top. Con Cadillac è situazionale: meglio su street circuit.',
    ratings: { qualifying: 3, race: 4, rain: 3, overtaking: 3, consistency: 4 },
  },
  'Valtteri Bottas': {
    style: 'Costante e professionale. Veterano affidabile che porta a casa quello che c\'è, senza sprechi.',
    specialistTracks: ['Spa', 'Monza'],
    strengths: ['Partenza', 'Costanza nel weekend'],
    weaknesses: ['Qualifiche (forma attuale)', 'Macchina poco competitiva'],
    fantasyTip: 'Valore fantasy molto basso con Cadillac. Da evitare quasi sempre.',
    ratings: { qualifying: 3, race: 3, rain: 3, overtaking: 3, consistency: 4 },
  },
  'Fernando Alonso': {
    style: 'Leggenda assoluta. La mente più brillante del paddock — sa fare di necessità virtù come nessun altro.',
    specialistTracks: ['Monaco', 'Hungaroring', 'Interlagos', 'Singapore'],
    strengths: ['Pioggia', 'Strategia', 'Difesa posizioni', 'Gestione'],
    weaknesses: ['Macchina attuale (Aston Martin)'],
    fantasyTip: 'Talento immenso sprecato su una macchina scarsa. Da usare solo se Aston Martin migliora drasticamente.',
    ratings: { qualifying: 4, race: 5, rain: 5, overtaking: 4, consistency: 4 },
  },
  'Lance Stroll': {
    style: 'Incostante ma con lampi di talento. Brilla in condizioni di bagnato o su piste specifiche.',
    specialistTracks: ['Baku'],
    strengths: ['Pioggia', 'Partenza', 'Baku'],
    weaknesses: ['Qualifiche', 'Costanza', 'Pressione'],
    fantasyTip: 'Da evitare quasi sempre. Unica eccezione: Baku in caso di pioggia.',
    ratings: { qualifying: 2, race: 2, rain: 4, overtaking: 2, consistency: 2 },
  },
}

const RATING_LABELS: Record<string, string> = {
  qualifying: 'Qualy',
  race: 'Gara',
  rain: 'Pioggia',
  overtaking: 'Sorpass.',
  consistency: 'Costanza',
}

/* ── Section helper ──────────────────────────────────────── */
function Section({
  icon,
  title,
  children,
  color = '#E8002D',
  small = false,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  color?: string
  small?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color }} className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'}>
          {icon}
        </span>
        <p className={`font-bold text-f1-gray uppercase tracking-widest ${small ? 'text-[8px]' : 'text-[9px]'}`}>
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */
interface Driver {
  name: string
  note: string
}

interface Props {
  drivers: Driver[]
  teamColor: string
  teamName: string
}

export function DriverListInteractive({ drivers, teamColor, teamName }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const info = selected ? (DRIVER_DATA[selected] ?? null) : null

  return (
    <>
      {/* Driver buttons */}
      <div className="space-y-1.5">
        {drivers.map((driver, i) => (
          <button
            key={i}
            onClick={() => setSelected(driver.name)}
            className="w-full flex items-center gap-2.5 bg-f1-gray-dark/40 hover:bg-f1-gray-dark/80 rounded-lg px-3 py-2 transition-all group text-left"
          >
            <div
              className="w-0.5 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: teamColor }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white group-hover:text-f1-gray-light truncate">
                {driver.name}
              </p>
              {driver.note && (
                <p className="text-[10px] text-f1-gray leading-tight">{driver.note}</p>
              )}
            </div>
            <ChevronRight className="w-3 h-3 text-f1-gray group-hover:text-f1-gray-light flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      {/* Modal overlay */}
      {selected && info && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          {/* Card */}
          <div
            className="relative w-full sm:max-w-sm bg-f1-black-light rounded-t-2xl sm:rounded-2xl border border-f1-gray-dark overflow-hidden max-h-[90vh] flex flex-col"
            style={{ borderTopColor: teamColor, borderTopWidth: '3px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 pb-3 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold text-f1-gray uppercase tracking-widest">
                    {teamName}
                  </p>
                  <h2 className="text-xl font-black text-white mt-0.5 leading-tight">{selected}</h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-f1-gray-dark transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-f1-gray" />
                </button>
              </div>

              {/* Rating bars */}
              <div className="grid grid-cols-5 gap-1.5 mt-3">
                {Object.entries(info.ratings).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="flex flex-col-reverse gap-[3px] items-center mb-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className="w-5 h-1.5 rounded-sm transition-all"
                          style={{ backgroundColor: i <= val ? teamColor : '#2A2A3A' }}
                        />
                      ))}
                    </div>
                    <p className="text-[8px] font-bold text-f1-gray uppercase tracking-wider">
                      {RATING_LABELS[key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-f1-gray-dark flex-shrink-0" />

            {/* Scrollable body */}
            <div className="overflow-y-auto px-4 py-4 space-y-4">

              {/* Driving style */}
              <Section icon={<Zap className="w-full h-full" />} title="Stile di guida" color={teamColor}>
                <p className="text-xs text-f1-gray-light leading-relaxed">{info.style}</p>
              </Section>

              {/* Specialist tracks */}
              <Section icon={<MapPin className="w-full h-full" />} title="Piste di eccellenza" color={teamColor}>
                <div className="flex flex-wrap gap-1.5">
                  {info.specialistTracks.map(t => (
                    <span
                      key={t}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-f1-gray-light"
                      style={{ borderColor: teamColor + '60', backgroundColor: teamColor + '15' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>

              {/* Strengths + Weaknesses */}
              <div className="grid grid-cols-2 gap-3">
                <Section icon={<TrendingUp className="w-full h-full" />} title="Punti forza" color="#22c55e" small>
                  <ul className="space-y-0.5">
                    {info.strengths.map(s => (
                      <li key={s} className="text-[10px] text-f1-gray-light flex items-start gap-1">
                        <span className="text-green-400 mt-px">▸</span>{s}
                      </li>
                    ))}
                  </ul>
                </Section>
                <Section icon={<TrendingDown className="w-full h-full" />} title="Punti deboli" color="#ef4444" small>
                  <ul className="space-y-0.5">
                    {info.weaknesses.map(w => (
                      <li key={w} className="text-[10px] text-f1-gray-light flex items-start gap-1">
                        <span className="text-red-400 mt-px">▸</span>{w}
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>

              {/* Fantasy tip */}
              <div
                className="rounded-xl p-3 border"
                style={{ borderColor: teamColor + '40', backgroundColor: teamColor + '10' }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: teamColor }} />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-f1-gray">
                    Consiglio Fantasy
                  </p>
                </div>
                <p className="text-xs text-f1-gray-light leading-relaxed">{info.fantasyTip}</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
