'use client'

import React from 'react'
import { CircuitMap } from './CircuitMap'
import { CIRCUIT_DATA } from './f1-data'

// Country flag emojis mapped by GP id
const COUNTRY_FLAGS: Record<string, string> = {
  aus_2026: '🇦🇺',
  chn_2026: '🇨🇳',
  jpn_2026: '🇯🇵',
  bhr_2026: '🇧🇭',
  ksa_2026: '🇸🇦',
  sau_2026: '🇸🇦',
  mia_2026: '🇺🇸',
  mon_2026: '🇲🇨',
  esp_2026: '🇪🇸',
  mad_2026: '🇪🇸',
  can_2026: '🇨🇦',
  aut_2026: '🇦🇹',
  gbr_2026: '🇬🇧',
  bel_2026: '🇧🇪',
  hun_2026: '🇭🇺',
  ned_2026: '🇳🇱',
  ita_2026: '🇮🇹',
  aze_2026: '🇦🇿',
  sin_2026: '🇸🇬',
  usa_2026: '🇺🇸',
  mex_2026: '🇲🇽',
  bra_2026: '🇧🇷',
  lv_2026: '🇺🇸',
  qat_2026: '🇶🇦',
  abu_2026: '🇦🇪',
}

interface GpHeaderProps {
  gpId: string
  round: number
  name: string
  circuit: string
  country: string
  date: string
  status: string
  hasSprint?: boolean
  isCompleted: boolean
}

export function GpHeader({ gpId, round, name, circuit, country, date, status, isCompleted }: GpHeaderProps) {
  const flag = COUNTRY_FLAGS[gpId] ?? '🏁'
  const circuitData = CIRCUIT_DATA[gpId]

  const dateFormatted = new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  const statusLabel = {
    upcoming: { label: 'IN ARRIVO', color: 'text-gray-400 border-gray-600 bg-gray-500/10' },
    qualifying: { label: 'QUALIFICHE', color: 'text-yellow-400 border-yellow-600 bg-yellow-500/10' },
    race: { label: 'GARA', color: 'text-red-400 border-red-600 bg-red-500/10' },
    completed: { label: 'COMPLETATO', color: 'text-green-400 border-green-600 bg-green-500/10' },
  }[status] ?? { label: status.toUpperCase(), color: 'text-gray-400 border-gray-600 bg-gray-500/10' }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-f1-red/30 f1-card f1-stripe"
         style={{
           background: 'linear-gradient(135deg, rgba(11, 30, 50, 0.8) 0%, rgba(22, 33, 62, 0.8) 50%, rgba(15, 52, 96, 0.8) 100%)',
           backdropFilter: 'blur(10px)'
         }}>

      {/* Top red accent stripe (3px gradient) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-f1-red via-red-500 to-transparent opacity-100" />
      <div className="absolute top-1 left-0 w-full h-0.5 bg-gradient-to-r from-f1-red/50 via-red-500/50 to-transparent opacity-80" />
      <div className="absolute top-2 left-0 w-full h-px bg-gradient-to-r from-f1-red/30 via-red-500/30 to-transparent opacity-60" />

      {/* Ambient glow effect */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-f1-red/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-stretch gap-0 relative z-10">
        {/* Left content */}
        <div className="flex-1 p-5 md:p-7">
          {/* Round badge circle and flag */}
          <div className="flex items-start gap-4 mb-5">
            {/* Large round number in red circle with glow */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-f1-red/40 blur-2xl rounded-full" style={{ width: '80px', height: '80px' }} />
              <div className="relative w-20 h-20 bg-gradient-to-br from-f1-red to-red-700 rounded-full flex items-center justify-center border-2 border-red-400/50 shadow-[0_0_30px_rgba(232,0,45,0.6)]">
                <span className="text-white font-black text-3xl leading-none">R{round}</span>
              </div>
            </div>

            {/* Country flag prominent display */}
            <div className="flex items-center gap-3">
              <span className="text-6xl drop-shadow-lg">{flag}</span>
              <div className="h-20 w-px bg-gradient-to-b from-f1-red/50 to-transparent" />
            </div>

            {/* GP info */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs font-bold border-2 rounded-lg px-3 py-1.5 uppercase tracking-widest ${statusLabel.color} backdrop-blur-sm transition-all duration-300`}>
                  {statusLabel.label}
                </span>
                {false && (
                  <span className="text-xs font-bold border-2 border-yellow-500/50 text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-1.5 uppercase tracking-widest backdrop-blur-sm">
                    ⚡ SPRINT
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">{name}</h1>
              <p className="text-f1-gray-light text-sm font-semibold mt-2 uppercase tracking-wider">{circuit}</p>
            </div>
          </div>

          {/* Date display with Italian formatting */}
          <div className="mb-5 flex items-center gap-2 text-f1-gray-light">
            <span className="text-lg">📅</span>
            <span className="font-semibold text-sm">{dateFormatted}</span>
          </div>

          {/* Stats grid - glassmorphism boxes */}
          {circuitData && (
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'GIRI', value: circuitData.laps, unit: '' },
                { label: 'DISTANZA', value: circuitData.length.toFixed(2), unit: 'km' },
                { label: 'CURVE', value: circuitData.turns, unit: '' },
                { label: 'DRS', value: circuitData.drsZones, unit: 'zone' },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-xl p-3 text-center border border-white/20 backdrop-blur-md transition-all duration-300 hover:border-f1-red/60 hover:shadow-[0_0_15px_rgba(232,0,45,0.3)] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-f1-red/0 to-f1-red/0 group-hover:from-f1-red/20 group-hover:to-f1-red/5 transition-all duration-300 rounded-xl" />
                  <div className="relative z-10">
                    <div className="text-white font-black text-xl leading-none drop-shadow-sm">{stat.value}</div>
                    <div className="text-f1-gray-light text-[9px] font-bold tracking-wider uppercase mt-1.5">{stat.label}</div>
                    {stat.unit && <div className="text-f1-gray text-[8px] mt-0.5 font-medium">{stat.unit}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Circuit map with subtle border */}
        <div className="hidden md:flex items-center justify-center w-56 lg:w-72 p-4 relative">
          <div className="absolute inset-0 bg-gradient-to-l from-f1-red/5 to-transparent rounded-lg" />
          <div className="relative w-full h-48 bg-gradient-to-br from-f1-black-light/60 to-f1-black-light/30 border-2 border-f1-red/40 rounded-xl p-3 backdrop-blur-sm overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-gradient-radial from-f1-red/15 to-transparent opacity-50 pointer-events-none rounded-xl" />
            <CircuitMap
              circuitId={gpId}
              color="rgba(255,255,255,0.9)"
              accentColor="#E8002D"
              className="w-full h-full relative z-10"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
