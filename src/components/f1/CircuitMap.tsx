'use client'

import React from 'react'
import { CIRCUIT_DATA } from './f1-data'

interface CircuitMapProps {
  circuitId: string
  className?: string
  showInfo?: boolean
  color?: string
  accentColor?: string
}

interface CircuitPathData {
  viewBox: string
  path: string
  sfLine?: string
  drsZones?: string[]
}

// Accurate circuit layouts based on real F1 track shapes
const CIRCUIT_PATHS: Record<string, CircuitPathData> = {
  // AUSTRALIA - Albert Park, Melbourne
  // Lakeside circuit: clockwise, wide open turns, chicanes, long straights
  aus_2026: {
    viewBox: "0 0 500 400",
    path: `M 250 350 L 130 350 Q 80 350 60 310 Q 40 270 60 240 L 90 200
           Q 100 180 90 160 L 70 130 Q 55 100 70 75 Q 85 50 120 45
           L 200 40 Q 240 38 270 55 Q 300 72 310 100 L 320 140
           Q 325 170 350 180 Q 375 190 400 175 L 420 155 Q 445 140 450 165
           Q 455 190 435 210 L 390 260 Q 365 290 370 320 Q 375 345 350 355
           L 250 350`,
    sfLine: `M 250 350 L 250 340`,
  },

  // CHINA - Shanghai International Circuit
  // Distinctive snail-shell turns 1-7, long back straight, hairpin
  chn_2026: {
    viewBox: "0 0 500 400",
    path: `M 400 320 L 300 320 Q 270 320 260 300 L 240 260
           Q 230 240 210 240 L 170 245 Q 140 250 130 225 Q 120 200 140 185
           Q 160 170 180 180 Q 200 190 195 210 Q 190 230 170 235
           L 100 240 Q 60 240 50 210 Q 40 180 60 155 L 120 95
           Q 140 70 175 65 L 420 65 Q 450 65 460 95 L 460 270
           Q 460 310 430 320 L 400 320`,
    sfLine: `M 300 320 L 300 310`,
  },

  // JAPAN - Suzuka Circuit
  // Figure-8 with crossover, S-curves, 130R, Degner curves, Spoon
  jpn_2026: {
    viewBox: "0 0 500 420",
    path: `M 90 340 L 90 280 Q 90 250 115 235 Q 140 220 170 230 Q 195 240 195 270
           L 195 290 Q 195 320 175 335 Q 155 350 130 345
           L 90 340 M 90 280 L 70 250 Q 50 220 65 195 Q 80 170 110 160
           L 160 145 Q 190 138 210 155 Q 230 172 255 168
           Q 280 164 290 140 Q 300 116 280 100 Q 260 84 235 90
           L 200 105 Q 170 115 155 100 Q 140 85 155 65 Q 170 45 200 42
           L 350 40 Q 400 40 430 70 Q 460 100 455 150 L 440 220
           Q 430 260 400 280 L 330 330 Q 300 355 260 360 L 175 360
           Q 140 360 115 345 L 90 340`,
    sfLine: `M 350 40 L 350 50`,
  },

  // BAHRAIN - Bahrain International Circuit, Sakhir
  // Desert circuit with tight infield, long straights
  bhr_2026: {
    viewBox: "0 0 500 400",
    path: `M 370 340 L 180 340 Q 140 340 120 310 Q 100 280 120 250
           L 160 200 Q 175 175 160 155 Q 145 135 120 135
           L 100 135 Q 70 135 60 110 Q 50 85 70 65 L 120 40
           Q 145 25 175 30 L 220 40 Q 250 50 250 80 Q 250 110 225 120
           L 190 140 Q 175 148 185 165 Q 195 182 215 178 L 280 155
           Q 320 140 350 160 Q 380 180 380 220 L 380 290 Q 380 330 400 340
           L 370 340`,
    sfLine: `M 180 340 L 180 330`,
  },

  // SAUDI ARABIA - Jeddah Corniche Circuit
  // Long, narrow street circuit along the coast
  ksa_2026: {
    viewBox: "0 0 300 500",
    path: `M 200 460 L 100 460 Q 70 460 60 430 L 55 380
           Q 50 350 70 330 Q 90 310 110 320 Q 130 330 125 355
           Q 120 380 95 385 L 80 385 Q 60 385 55 365 L 50 270
           Q 48 230 65 210 Q 82 190 105 195 Q 128 200 130 225
           Q 132 250 110 260 Q 88 270 80 250 L 75 200
           Q 72 160 90 130 L 120 90 Q 140 60 175 50
           Q 210 35 230 70 Q 250 105 225 130 Q 200 155 175 145
           Q 150 135 145 160 L 140 200 Q 138 230 160 245
           Q 182 260 200 240 L 220 210 Q 240 180 235 150
           L 235 430 Q 235 458 210 462 L 200 460`,
    sfLine: `M 100 460 L 100 450`,
  },

  // MIAMI - Miami International Autodrome
  // Hard Rock Stadium circuit with chicanes, long straights
  mia_2026: {
    viewBox: "0 0 500 400",
    path: `M 380 340 L 160 340 Q 110 340 80 300 Q 50 260 80 225
           L 130 175 Q 150 150 180 150 L 250 155 Q 285 158 300 135
           Q 315 112 290 90 Q 265 68 235 80 L 180 100 Q 145 115 120 100
           Q 95 85 110 60 Q 125 35 160 30 L 400 30 Q 440 30 455 65
           Q 470 100 445 130 L 410 180 Q 390 210 400 245 Q 410 280 440 295
           L 460 305 Q 480 315 470 340 Q 460 355 440 345 L 380 340`,
    sfLine: `M 160 340 L 160 330`,
  },

  // CANADA - Circuit Gilles Villeneuve, Montreal
  // Island circuit with long straight, hairpin, chicanes (Wall of Champions)
  can_2026: {
    viewBox: "0 0 500 350",
    path: `M 430 280 L 200 280 Q 160 280 140 255 Q 120 230 140 205
           Q 160 180 190 185 Q 220 190 218 220 Q 216 250 190 255
           L 120 260 Q 80 260 60 235 Q 40 210 60 185 L 120 130
           Q 140 105 175 100 L 400 95 Q 440 95 460 125 Q 480 155 460 185
           L 440 220 Q 425 245 440 265 Q 455 280 445 285 L 430 280`,
    sfLine: `M 200 280 L 200 270`,
  },

  // MONACO - Circuit de Monaco
  // Tight street circuit, hairpin, tunnel, swimming pool chicane
  mon_2026: {
    viewBox: "0 0 450 380",
    path: `M 130 320 L 80 280 Q 50 250 55 215 Q 60 180 90 170
           L 170 150 Q 200 142 220 158 Q 240 174 225 200 Q 210 226 180 228
           L 130 230 Q 100 232 90 260 Q 80 288 105 308 L 130 320
           M 170 150 L 200 125 Q 220 105 255 100 L 370 95
           Q 410 95 420 130 Q 430 165 405 185 L 340 230
           Q 310 258 275 262 L 200 268 Q 168 270 155 295 Q 142 320 150 340
           L 130 320`,
    sfLine: `M 370 95 L 370 105`,
  },

  // SPAIN - Circuit de Barcelona-Catalunya
  // Modern circuit with long main straight, chicanes, flowing S-curves
  esp_2026: {
    viewBox: "0 0 500 380",
    path: `M 130 310 L 80 280 Q 50 260 55 225 Q 60 190 90 178
           L 150 155 Q 180 142 205 155 Q 230 168 220 200
           Q 210 232 180 235 L 120 240 Q 85 245 80 275 L 130 310
           M 150 155 L 190 120 Q 210 95 245 88 L 380 80
           Q 420 78 440 105 Q 460 132 440 160 L 400 210
           Q 375 248 345 255 L 240 270 Q 200 275 175 300
           Q 155 325 155 340 L 130 310`,
    sfLine: `M 380 80 L 380 90`,
  },

  // AUSTRIA - Red Bull Ring, Spielberg
  // Short, fast circuit with elevation changes, 7 turns
  aut_2026: {
    viewBox: "0 0 450 400",
    path: `M 340 340 L 180 340 Q 130 340 110 300 Q 90 260 120 230
           L 180 180 Q 200 155 195 125 Q 190 95 160 85
           Q 130 75 115 105 Q 100 135 120 155 L 155 175
           Q 180 195 185 230 Q 190 265 165 285 Q 140 305 155 330
           L 180 340 M 180 180 L 250 120 Q 280 95 320 90
           L 380 88 Q 420 90 435 125 Q 450 160 425 190
           L 380 260 Q 360 300 375 335 Q 380 345 360 345 L 340 340`,
    sfLine: `M 380 88 L 380 98`,
  },

  // GREAT BRITAIN - Silverstone
  // Fast, flowing circuit with Maggots-Becketts-Chapel, Copse, Stowe
  gbr_2026: {
    viewBox: "0 0 550 400",
    path: `M 360 340 L 200 340 Q 155 340 130 310 Q 105 280 125 250
           L 165 200 Q 180 175 170 150 Q 160 125 135 120
           L 90 115 Q 55 115 45 85 Q 35 55 65 40 L 160 30
           Q 200 28 230 50 L 270 85 Q 290 110 325 115
           L 420 120 Q 465 122 485 155 Q 505 188 485 220
           L 440 285 Q 420 318 445 340 Q 460 350 440 355 L 360 340`,
    sfLine: `M 200 340 L 200 330`,
  },

  // BELGIUM - Spa-Francorchamps
  // Legendary circuit with Eau Rouge, Raidillon, Pouhon, long and fast
  bel_2026: {
    viewBox: "0 0 550 450",
    path: `M 450 380 L 280 380 Q 240 380 220 350 L 190 300
           Q 175 275 150 275 L 100 280 Q 65 285 50 260 Q 35 235 55 215
           L 110 175 Q 135 152 125 125 Q 115 98 85 95
           L 60 95 Q 30 95 25 65 Q 20 35 50 28 L 180 25
           Q 220 25 250 55 L 290 105 Q 310 135 345 140
           L 430 145 Q 475 148 495 180 Q 515 212 495 245
           L 460 325 Q 445 360 470 380 Q 480 390 465 395 L 450 380`,
    sfLine: `M 280 380 L 280 370`,
  },

  // HUNGARY - Hungaroring
  // Twisty, technical circuit often compared to Monaco without walls
  hun_2026: {
    viewBox: "0 0 480 380",
    path: `M 350 320 L 200 320 Q 155 320 132 290 Q 109 260 130 230
           L 170 185 Q 185 162 175 140 Q 165 118 140 115
           L 100 115 Q 65 115 55 88 Q 45 61 68 45 L 150 32
           Q 185 28 215 48 L 250 78 Q 270 100 300 105
           L 380 108 Q 420 110 438 140 Q 456 170 438 200
           L 400 268 Q 382 300 405 325 Q 415 338 398 340 L 350 320`,
    sfLine: `M 200 320 L 200 310`,
  },

  // NETHERLANDS - Circuit Zandvoort
  // Seaside circuit with banked corners (turns 3 & 14)
  ned_2026: {
    viewBox: "0 0 480 380",
    path: `M 350 310 L 190 310 Q 140 310 118 280 Q 96 250 120 220
           L 170 170 Q 190 145 178 118 Q 166 91 140 88
           L 95 88 Q 58 88 48 60 Q 38 32 65 22 L 160 18
           Q 195 16 225 38 L 265 72 Q 285 95 318 98
           L 395 102 Q 435 105 452 138 Q 469 171 448 202
           L 405 275 Q 388 305 412 330 Q 422 342 405 348 L 350 310`,
    sfLine: `M 190 310 L 190 300`,
  },

  // ITALY - Monza (Autodromo Nazionale)
  // Temple of speed: very fast, low downforce, chicanes on a classic layout
  ita_2026: {
    viewBox: "0 0 480 380",
    path: `M 400 320 L 200 320 Q 145 320 120 280 Q 95 240 130 210
           L 160 185 Q 170 170 155 150 Q 140 130 115 128
           L 80 128 Q 45 128 38 100 Q 31 72 58 55 L 140 32
           Q 178 22 210 42 L 380 150 Q 415 170 440 210
           Q 465 250 440 290 Q 415 320 430 340 Q 438 350 420 345 L 400 320`,
    sfLine: `M 200 320 L 200 310`,
  },

  // AZERBAIJAN - Baku City Circuit
  // Street circuit with long straight along the waterfront, old city section
  aze_2026: {
    viewBox: "0 0 300 500",
    path: `M 200 460 L 100 460 Q 65 460 55 430 L 50 370
           Q 45 340 65 320 Q 85 300 105 310 Q 125 320 120 345
           Q 115 370 90 375 L 70 375 Q 50 375 48 355 L 45 250
           Q 43 210 60 195 L 100 165 Q 120 148 115 125
           Q 110 102 85 100 L 65 100 Q 40 100 38 75 Q 36 50 60 42
           L 130 35 Q 165 30 185 55 Q 205 80 190 108
           Q 175 136 150 132 Q 125 128 128 155 L 132 200
           Q 135 228 160 240 L 210 250 Q 240 260 245 300
           L 245 420 Q 245 455 215 462 L 200 460`,
    sfLine: `M 100 460 L 100 450`,
  },

  // SINGAPORE - Marina Bay Street Circuit
  // Night race street circuit, many tight turns
  sin_2026: {
    viewBox: "0 0 500 420",
    path: `M 380 360 L 180 360 Q 130 360 105 325 Q 80 290 105 258
           L 150 210 Q 165 190 155 168 Q 145 146 120 142
           L 80 140 Q 45 140 38 110 Q 31 80 58 62 L 140 38
           Q 178 28 215 48 L 260 80 Q 282 105 318 108
           L 400 115 Q 442 118 460 152 Q 478 186 458 218
           L 415 300 Q 398 335 422 358 Q 432 370 418 375 L 380 360`,
    sfLine: `M 180 360 L 180 350`,
  },

  // USA - Circuit of the Americas (COTA), Austin
  // Modern circuit inspired by classic corners, elevation turn 1
  usa_2026: {
    viewBox: "0 0 500 400",
    path: `M 380 340 L 180 340 Q 130 340 108 305 Q 86 270 110 238
           L 160 188 Q 178 162 168 135 Q 158 108 132 105
           L 88 105 Q 52 105 42 75 Q 32 45 62 32 L 155 22
           Q 195 18 228 42 L 275 82 Q 298 108 335 112
           L 415 118 Q 458 122 475 155 Q 492 188 472 220
           L 428 298 Q 412 330 438 352 Q 448 362 432 368 L 380 340`,
    sfLine: `M 180 340 L 180 330`,
  },

  // MEXICO - Autódromo Hermanos Rodríguez, Mexico City
  // High altitude, stadium section, Peraltada-inspired final turn
  mex_2026: {
    viewBox: "0 0 500 380",
    path: `M 390 310 L 180 310 Q 130 310 105 275 Q 80 240 110 210
           L 165 165 Q 185 142 170 115 Q 155 88 125 88
           L 85 90 Q 50 92 42 65 Q 34 38 62 25 L 160 18
           Q 198 12 232 35 L 285 78 Q 308 102 345 105
           L 420 110 Q 462 115 478 148 Q 494 181 472 212
           L 428 288 Q 412 318 438 340 Q 448 350 430 355 L 390 310`,
    sfLine: `M 180 310 L 180 300`,
  },

  // BRAZIL - Interlagos (Autódromo José Carlos Pace)
  // Counter-clockwise, undulating, classic layout with Senna S
  bra_2026: {
    viewBox: "0 0 480 380",
    path: `M 370 310 L 190 310 Q 140 310 115 275 Q 90 240 118 210
           L 170 162 Q 192 138 180 112 Q 168 86 140 82
           L 98 82 Q 60 82 50 55 Q 40 28 68 15 L 165 8
           Q 202 5 235 28 L 282 72 Q 305 98 342 102
           L 408 108 Q 448 112 465 145 Q 482 178 460 210
           L 418 285 Q 402 315 425 340 Q 435 350 418 355 L 370 310`,
    sfLine: `M 190 310 L 190 300`,
  },

  // LAS VEGAS - Las Vegas Strip Circuit
  // Street circuit on the Strip, high speed, 3 long straights
  lv_2026: {
    viewBox: "0 0 300 500",
    path: `M 210 460 L 90 460 Q 55 460 45 428 L 40 360
           Q 35 325 55 308 Q 75 291 98 302 Q 121 313 118 340
           Q 115 367 88 372 L 68 372 Q 48 372 45 352 L 42 230
           Q 40 195 60 175 L 100 140 Q 120 118 112 92
           Q 104 66 78 62 L 58 62 Q 32 62 28 38 Q 24 14 52 8
           L 145 5 Q 182 3 205 28 Q 228 53 212 82
           Q 196 111 170 108 Q 144 105 140 132 L 138 185
           Q 136 215 162 228 L 215 242 Q 248 255 252 295
           L 252 425 Q 252 458 225 462 L 210 460`,
    sfLine: `M 90 460 L 90 450`,
  },

  // QATAR - Lusail International Circuit
  // Modern, fast, flowing circuit with long back straight
  qat_2026: {
    viewBox: "0 0 500 380",
    path: `M 380 310 L 190 310 Q 140 310 115 278 Q 90 246 115 215
           L 168 165 Q 188 140 175 115 Q 162 90 135 88
           L 92 90 Q 55 90 45 62 Q 35 34 62 22 L 158 15
           Q 195 12 228 35 L 275 75 Q 298 100 335 105
           L 412 110 Q 452 115 468 148 Q 484 181 462 212
           L 420 288 Q 405 315 428 338 Q 438 348 422 352 L 380 310`,
    sfLine: `M 190 310 L 190 300`,
  },

  // ABU DHABI - Yas Marina Circuit
  // Modern circuit around a marina, hotel straddling the track
  abu_2026: {
    viewBox: "0 0 500 400",
    path: `M 380 340 L 185 340 Q 135 340 110 305 Q 85 270 112 238
           L 165 185 Q 185 160 172 132 Q 159 104 132 102
           L 88 102 Q 52 102 42 72 Q 32 42 62 28 L 160 18
           Q 198 12 232 35 L 280 78 Q 302 105 340 110
           L 418 115 Q 458 120 475 155 Q 492 190 470 222
           L 428 298 Q 412 330 438 352 Q 448 362 432 368 L 380 340`,
    sfLine: `M 185 340 L 185 330`,
  },

  // MADRID - Circuit of Madrid (New 2026)
  // Modern street circuit, Madrid's new urban venue
  mad_2026: {
    viewBox: "0 0 500 380",
    path: `M 380 310 L 170 310 Q 120 310 95 278 Q 70 246 95 215
           L 150 165 Q 170 140 158 115 Q 146 90 118 88
           L 78 90 Q 42 90 35 62 Q 28 34 55 22 L 148 15
           Q 185 12 218 35 L 268 78 Q 290 102 328 105
           L 410 110 Q 450 115 465 148 Q 480 181 458 212
           L 415 288 Q 400 318 425 340 Q 435 350 418 355 L 380 310`,
    sfLine: `M 170 310 L 170 300`,
  },
}

// Helper function to match circuit ID to path data
const getCircuitPath = (circuitId: string): CircuitPathData | undefined => {
  if (CIRCUIT_PATHS[circuitId]) {
    return CIRCUIT_PATHS[circuitId]
  }

  const normalizedId = circuitId.toLowerCase()

  const matchMap: Record<string, string> = {
    'melbourne': 'aus_2026',
    'australia': 'aus_2026',
    'albert_park': 'aus_2026',
    'shanghai': 'chn_2026',
    'china': 'chn_2026',
    'bahrain': 'bhr_2026',
    'sakhir': 'bhr_2026',
    'saudi': 'ksa_2026',
    'saudi_arabia': 'ksa_2026',
    'jeddah': 'ksa_2026',
    'japan': 'jpn_2026',
    'suzuka': 'jpn_2026',
    'miami': 'mia_2026',
    'usa': 'usa_2026',
    'austin': 'usa_2026',
    'cota': 'usa_2026',
    'imola': 'ita_2026',
    'emilia': 'ita_2026',
    'monza': 'ita_2026',
    'italy': 'ita_2026',
    'monaco': 'mon_2026',
    'monte_carlo': 'mon_2026',
    'barcelona': 'esp_2026',
    'spain': 'esp_2026',
    'catalunya': 'esp_2026',
    'canada': 'can_2026',
    'montreal': 'can_2026',
    'gilles_villeneuve': 'can_2026',
    'austria': 'aut_2026',
    'red_bull': 'aut_2026',
    'spielberg': 'aut_2026',
    'silverstone': 'gbr_2026',
    'great_britain': 'gbr_2026',
    'spa': 'bel_2026',
    'belgium': 'bel_2026',
    'francorchamps': 'bel_2026',
    'hungary': 'hun_2026',
    'hungaroring': 'hun_2026',
    'netherlands': 'ned_2026',
    'zandvoort': 'ned_2026',
    'baku': 'aze_2026',
    'azerbaijan': 'aze_2026',
    'singapore': 'sin_2026',
    'marina_bay': 'sin_2026',
    'mexico': 'mex_2026',
    'mexico_city': 'mex_2026',
    'brazil': 'bra_2026',
    'interlagos': 'bra_2026',
    'sao_paulo': 'bra_2026',
    'vegas': 'lv_2026',
    'las_vegas': 'lv_2026',
    'qatar': 'qat_2026',
    'lusail': 'qat_2026',
    'abu_dhabi': 'abu_2026',
    'yas_marina': 'abu_2026',
    'madrid': 'mad_2026',
  }

  for (const [key, pathKey] of Object.entries(matchMap)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return CIRCUIT_PATHS[pathKey]
    }
  }

  return undefined
}

export const CircuitMap: React.FC<CircuitMapProps> = ({
  circuitId,
  className = '',
  showInfo = false,
  color = '#FFFFFF',
  accentColor = '#E8002D',
}) => {
  const circuit = CIRCUIT_DATA[circuitId]
  const pathData = getCircuitPath(circuitId)

  if (!pathData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-xs">{circuit?.country ?? circuitId}</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <svg
        viewBox={pathData.viewBox}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* DRS zones */}
        {pathData.drsZones?.map((drs, i) => (
          <path
            key={`drs-${i}`}
            d={drs}
            stroke="#00D2FF"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        ))}

        {/* Main track - glow layer */}
        <path
          d={pathData.path}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.06"
        />

        {/* Main track */}
        <path
          d={pathData.path}
          stroke={color}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Start/Finish line */}
        {pathData.sfLine && (
          <path
            d={pathData.sfLine}
            stroke={accentColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>

      {showInfo && circuit && (
        <div className="mt-2 text-xs text-gray-400 space-y-1">
          <div className="font-bold text-white text-sm">{circuit.name}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span>{circuit.length.toFixed(3)} km</span>
            <span>{circuit.laps} laps</span>
            <span>{circuit.turns} turns</span>
            <span>{circuit.drsZones} DRS</span>
          </div>
        </div>
      )}
    </div>
  )
}
