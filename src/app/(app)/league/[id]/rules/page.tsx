'use client'

import { useParams } from 'next/navigation'
import { LeagueNav } from '@/components/ui/LeagueNav'
import { Star, Zap, Target, Shield, AlertTriangle, TrendingUp, Trophy, Flag, Clock } from 'lucide-react'

export default function RulesPage() {
  const params = useParams()
  const leagueId = params.id as string

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden">
        <h1 className="text-2xl font-black relative z-10">Regolamento</h1>
        <p className="text-f1-gray text-sm relative z-10">Sistema di punteggio Fantasy F1 2026</p>
      </div>

      <LeagueNav leagueId={leagueId} />

      {/* Hero section */}
      <div className="relative bg-gradient-to-br from-f1-red/20 via-f1-black-light to-f1-black-light border border-f1-red/30 rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-f1-red/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-f1-red rounded-lg p-2">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Fantasy F1</h2>
              <p className="text-f1-red text-xs font-bold uppercase tracking-widest">Regolamento Ufficiale 2026</p>
            </div>
          </div>
          <p className="text-f1-gray-light text-sm leading-relaxed">
            Ogni giocatore gestisce una scuderia con 4 piloti e 1 team. Per ogni GP, scegli 3 titolari + 1 riserva e nomina un capitano per massimizzare i punti.
          </p>
        </div>
      </div>

      {/* Formazione */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Formazione</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <RuleRow icon="👥" title="Rosa" desc="4 piloti + 1 scuderia per giocatore, acquistati all'asta" />
            <RuleRow icon="⚡" title="Titolari" desc="Ogni GP scegli 3 piloti titolari su 4" />
            <RuleRow icon="🪑" title="Panchina" desc="1 pilota in riserva — entra in caso di DNC di un titolare" />
            <RuleRow icon="⭐" title="Capitano" desc="1 titolare designato capitano → i suoi punti vengono raddoppiati (×2)" />
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-3">
            <p className="text-blue-300 text-xs leading-relaxed">
              <strong className="text-blue-200">Sostituzione DNC:</strong> Se un titolare non parte (DNC), il pilota in panchina lo sostituisce automaticamente. Se il pilota con DNC era il capitano, il sostituto eredita il ruolo di capitano e il bonus ×2.
            </p>
          </div>
        </div>
      </section>

      {/* Punteggio Scuderia */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Punteggio Scuderia</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-f1-gray-light text-sm leading-relaxed">
            Ogni giocatore possiede anche <strong className="text-white">1 scuderia</strong> (team F1), che comprende i suoi 2 piloti ufficiali. La scuderia <strong className="text-white">non</strong> occupa uno slot pilota e non può essere scelta come capitano o messa in panchina.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <RuleRow icon="🏎️" title="Come funziona" desc="I punti scuderia sono la somma dei punti individuali dei 2 piloti del team, calcolati con gli stessi criteri standard (qualifica, gara, giro veloce, penalità, DNF/DSQ). NON si applica il moltiplicatore capitano." />
            <RuleRow icon="📊" title="Indipendente dalla rosa" desc="I punti scuderia si calcolano sempre sui 2 piloti del team reale, indipendentemente dai 4 piloti che hai in rosa. Anche se non possiedi quei piloti, ricevi i loro punti come punteggio scuderia." />
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mt-3">
            <p className="text-orange-300 text-xs leading-relaxed">
              <strong className="text-orange-200">Esempio:</strong> Se possiedi la Haas come scuderia, riceverai come punti scuderia la somma dei punti di Ocon e Bearman in quel GP — indipendentemente da quali piloti hai scelto nella tua rosa.
            </p>
          </div>
        </div>
      </section>

      {/* Qualifica */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Punti Qualifica</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-5 gap-2">
            {[
              { pos: 'P1', pts: 10 }, { pos: 'P2', pts: 9 }, { pos: 'P3', pts: 8 },
              { pos: 'P4', pts: 7 }, { pos: 'P5', pts: 6 }, { pos: 'P6', pts: 5 },
              { pos: 'P7', pts: 4 }, { pos: 'P8', pts: 3 }, { pos: 'P9', pts: 2 }, { pos: 'P10', pts: 1 },
            ].map(({ pos, pts }) => (
              <div key={pos} className="bg-f1-gray-dark/60 rounded-lg p-2.5 text-center">
                <div className="text-purple-400 text-[10px] font-bold uppercase">{pos}</div>
                <div className="text-white font-black text-lg">{pts}</div>
              </div>
            ))}
          </div>
          <p className="text-f1-gray text-xs mt-3 text-center">Dalla P11 in poi: 0 punti</p>
        </div>
      </section>

      {/* Gara */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Punti Gara</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-5 gap-2">
            {[
              { pos: 'P1', pts: 25 }, { pos: 'P2', pts: 18 }, { pos: 'P3', pts: 15 },
              { pos: 'P4', pts: 12 }, { pos: 'P5', pts: 10 }, { pos: 'P6', pts: 8 },
              { pos: 'P7', pts: 6 }, { pos: 'P8', pts: 4 }, { pos: 'P9', pts: 2 }, { pos: 'P10', pts: 1 },
            ].map(({ pos, pts }) => (
              <div key={pos} className="bg-f1-gray-dark/60 rounded-lg p-2.5 text-center">
                <div className="text-green-400 text-[10px] font-bold uppercase">{pos}</div>
                <div className="text-white font-black text-lg">{pts}</div>
              </div>
            ))}
          </div>
          <p className="text-f1-gray text-xs mt-3 text-center">Dalla P11 in poi: 0 punti</p>
        </div>
      </section>

      {/* Bonus & Malus */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Bonus & Malus</h3>
          </div>
        </div>
        <div className="p-5 space-y-2">
          <BonusRow label="Giro veloce" value="+5" color="green" />
          <BonusRow label="Posizioni guadagnate" value="+1 cad." color="green" desc="Per ogni posizione guadagnata dalla qualifica alla gara" />
          <BonusRow label="Capitano" value="×2" color="yellow" desc="Tutti i punti del capitano vengono raddoppiati" />
          <div className="h-px bg-f1-gray-dark my-2" />
          <BonusRow label="Penalità posizione" value="-1 cad." color="red" desc="Per ogni posizione di penalità applicata dai commissari" />
          <BonusRow label="DNF (ritiro)" value="-10" color="red" />
          <BonusRow label="DSQ (squalifica)" value="-15" color="red" />
          <BonusRow label="DNC (non partito)" value="0" color="gray" desc="Nessun malus — il panchinaro entra al suo posto" />
        </div>
      </section>

      {/* Pronostici */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-f1-red/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-f1-red" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Pronostici (Scommesse)</h3>
          </div>
        </div>
        <div className="p-5 space-y-2">
          <BonusRow label="Pole Position" value="+5" color="green" desc="Indovina chi farà la pole" />
          <BonusRow label="Vincitore Gara" value="+5" color="green" desc="Indovina il vincitore della gara" />
          <BonusRow label="Giro Veloce" value="+3" color="green" desc="Indovina chi farà il giro più veloce" />
          <BonusRow label="Safety Car" value="+3" color="green" desc="Indovina se ci sarà o meno la safety car" />
          <BonusRow label="Podio (2° e 3°)" value="+2 cad." color="green" desc="Indovina i piloti sul podio (escluso il 1° già coperto dal vincitore)" />
          <div className="bg-f1-red/10 border border-f1-red/20 rounded-xl p-4 mt-3">
            <p className="text-red-300 text-xs leading-relaxed">
              <strong className="text-red-200">Nota:</strong> Il pronostico del podio esclude il 1° classificato perché è già coperto dal pronostico del vincitore (+5 pt). Quindi il bonus podio (+2 pt ciascuno) si applica solo al 2° e 3° posto.
            </p>
          </div>
        </div>
      </section>

      {/* Deadline */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Scadenze</h3>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <RuleRow icon="🔒" title="Blocco selezioni" desc="Le formazioni e i pronostici si bloccano 1 ora prima dell'inizio della qualifica Q1" />
          <RuleRow icon="⏰" title="Orario Q1" desc="L'admin imposta l'orario esatto della qualifica per ogni GP" />
          <RuleRow icon="📝" title="Modifica" desc="Puoi cambiare capitano, panchina e pronostici fino al blocco" />
        </div>
      </section>

      {/* Esempio */}
      <section className="bg-f1-black-light border border-f1-gray-dark rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500/20 to-transparent px-5 py-3 border-b border-f1-gray-dark">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Esempio Punteggio</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="bg-f1-gray-dark/40 rounded-xl p-4 space-y-3 text-sm">
            <p className="text-f1-gray-light">
              <strong className="text-white">Scenario:</strong> Il tuo pilota si qualifica P5 e finisce la gara P3 con il giro veloce. È il tuo capitano.
            </p>
            <div className="space-y-1.5">
              <ExampleRow label="Qualifica P5" pts={6} />
              <ExampleRow label="Gara P3" pts={15} />
              <ExampleRow label="Giro veloce" pts={5} />
              <ExampleRow label="Posizioni guadagnate (5→3 = +2)" pts={2} />
              <div className="h-px bg-f1-gray-dark" />
              <ExampleRow label="Subtotale" pts={28} bold />
              <ExampleRow label="Capitano ×2" pts={56} bold highlight />
            </div>
            <p className="text-f1-gray text-xs mt-2">
              + eventuali punti pronostico se le scommesse risultano corrette
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-f1-gray text-xs">Fantasy F1 2026 — Regolamento v1.0</p>
      </div>
    </div>
  )
}

function RuleRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-f1-gray-dark/30 rounded-lg">
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-white font-bold text-sm">{title}</p>
        <p className="text-f1-gray-light text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function BonusRow({ label, value, color, desc }: { label: string; value: string; color: string; desc?: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400 bg-green-400/10',
    red: 'text-red-400 bg-red-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    gray: 'text-f1-gray bg-f1-gray-dark/50',
  }
  const cls = colorMap[color] ?? colorMap.gray
  return (
    <div className="flex items-center gap-3 p-2.5 bg-f1-gray-dark/30 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{label}</p>
        {desc && <p className="text-f1-gray text-[10px] leading-relaxed mt-0.5">{desc}</p>}
      </div>
      <span className={`font-black text-sm px-2.5 py-1 rounded-lg flex-shrink-0 ${cls}`}>
        {value}
      </span>
    </div>
  )
}

function ExampleRow({ label, pts, bold, highlight }: { label: string; pts: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? 'text-white font-bold' : 'text-f1-gray-light'}`}>{label}</span>
      <span className={`text-xs font-black ${highlight ? 'text-yellow-400 text-sm' : bold ? 'text-white' : 'text-f1-gray-light'}`}>
        {pts > 0 ? '+' : ''}{pts} pt
      </span>
    </div>
  )
}
