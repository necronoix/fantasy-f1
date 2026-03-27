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

  // ─── AUSTRALIA — Albert Park, Melbourne ────────────────────────────
  // Clockwise around a lake. Roughly square with chicane sections,
  // fast opening sector, hairpin at T9, sweeping final sector.
  aus_2026: {
    viewBox: "0 0 500 400",
    path: `M 312 348 L 155 348 Q 105 348 84 316 Q 62 282 86 255
           L 122 220 Q 138 200 128 178 Q 116 155 90 150
           L 64 148 Q 38 146 34 118 Q 30 90 56 74
           L 116 48 Q 148 36 182 44 L 232 57
           Q 268 70 270 104 Q 272 138 244 150
           L 208 162 Q 182 172 188 198 Q 196 226 226 232
           L 298 235 Q 336 235 358 212 Q 382 188 412 192
           Q 445 196 452 226 Q 458 256 436 272
           L 395 308 Q 370 335 385 352 Q 395 362 376 360 L 312 348`,
    sfLine: `M 155 348 L 155 336`,
  },

  // ─── CHINA — Shanghai International Circuit ────────────────────────
  // Distinctive 270° "snail" hairpin at T1-6, long back straight,
  // tight infield chicane, fast final sector.
  chn_2026: {
    viewBox: "0 0 500 400",
    path: `M 412 328 L 298 328 Q 264 328 250 306 L 228 266
           Q 218 244 194 240 L 152 242 Q 120 244 108 220
           Q 96 196 114 178 Q 134 160 158 170
           Q 182 180 178 207 Q 174 235 148 240
           L 86 246 Q 50 248 38 218 Q 26 186 46 160
           L 112 94 Q 135 66 172 60
           L 428 60 Q 464 60 474 93 L 474 280
           Q 474 316 442 328 L 412 328`,
    sfLine: `M 298 328 L 298 316`,
  },

  // ─── JAPAN — Suzuka Circuit ────────────────────────────────────────
  // Iconic FIGURE-8: the track physically crosses itself at the bridge.
  // Upper-right loop: T1 First Corner + S-curves + Degner.
  // Lower-left loop: Hairpin + Spoon + 130R + Casio Triangle.
  // The two CROSSING segments are: L 280 205 → L 220 215 (under bridge)
  //   and L 220 200 → L 280 210 (over bridge). They intersect at ≈(265,207).
  jpn_2026: {
    viewBox: "0 0 500 420",
    path: `M 350 372 L 418 350 Q 464 322 468 272
           Q 472 220 450 185 Q 425 148 390 138
           Q 355 126 325 148 Q 294 168 284 196
           Q 282 200 280 205 L 220 215
           Q 198 222 184 244 Q 168 268 157 298
           Q 144 332 118 350 Q 90 364 68 345
           Q 46 326 55 298 Q 68 265 96 250
           Q 126 234 152 225 Q 180 214 208 202
           L 220 200 L 280 210
           Q 306 216 320 240 Q 336 265 340 302
           Q 344 336 350 372`,
    sfLine: `M 350 372 L 360 364`,
  },

  // ─── BAHRAIN — Bahrain International Circuit, Sakhir ───────────────
  // Desert circuit: three wide straights, tight infield hairpin complex.
  bhr_2026: {
    viewBox: "0 0 500 400",
    path: `M 375 342 L 176 342 Q 136 342 116 310
           Q 96 276 118 248 L 162 198
           Q 178 174 162 150 Q 145 126 118 126
           L 96 126 Q 66 126 56 100
           Q 46 74 68 54 L 122 37
           Q 148 22 180 28 L 228 42
           Q 260 54 260 86 Q 260 118 232 130
           L 194 144 Q 174 154 186 174
           Q 198 194 220 190 L 288 165
           Q 330 148 360 168 Q 392 190 392 232
           L 392 298 Q 392 336 410 346 L 375 342`,
    sfLine: `M 176 342 L 176 330`,
  },

  // ─── SAUDI ARABIA — Jeddah Corniche Circuit ────────────────────────
  // Narrow, fast street circuit along the coast. Portrait orientation.
  ksa_2026: {
    viewBox: "0 0 300 500",
    path: `M 202 458 L 100 458 Q 66 458 55 426
           L 49 368 Q 43 338 64 316 Q 86 294 108 307
           Q 130 320 124 348 Q 118 376 92 381
           L 72 381 Q 50 381 46 358 L 40 252
           Q 38 212 58 193 L 96 162
           Q 115 144 108 118 Q 100 93 74 90
           L 53 90 Q 29 90 27 65 Q 24 40 50 33
           L 122 26 Q 158 20 178 50
           Q 198 80 181 110 Q 163 140 136 132
           Q 108 123 112 152 L 118 200
           Q 122 230 148 244 L 210 254
           Q 244 265 247 305 L 247 420
           Q 247 456 218 462 L 202 458`,
    sfLine: `M 100 458 L 100 446`,
  },

  // ─── MIAMI — Miami International Autodrome ─────────────────────────
  // Flows around Hard Rock Stadium. Mix of chicanes and medium-speed turns.
  mia_2026: {
    viewBox: "0 0 500 400",
    path: `M 382 336 L 162 336 Q 110 336 80 294
           Q 50 252 80 220 L 132 170
           Q 152 148 182 148 L 254 152
           Q 290 156 304 132 Q 318 108 292 88
           Q 265 68 235 80 L 176 100
           Q 140 115 116 100 Q 90 84 108 57
           Q 126 30 163 26 L 404 26
           Q 444 26 458 63 Q 472 100 446 132
           L 408 182 Q 388 212 400 248
           Q 412 283 444 298 L 465 308
           Q 484 318 472 342 Q 460 358 440 348 L 382 336`,
    sfLine: `M 162 336 L 162 324`,
  },

  // ─── CANADA — Circuit Gilles Villeneuve, Montreal ──────────────────
  // Island circuit. Long main straight, Wall of Champions hairpin at end.
  can_2026: {
    viewBox: "0 0 500 350",
    path: `M 432 278 L 198 278 Q 158 278 138 252
           Q 118 226 138 200 Q 158 174 190 180
           Q 222 186 220 218 Q 218 249 192 254
           L 118 260 Q 78 260 58 234
           Q 38 208 58 183 L 122 126
           Q 142 100 178 96 L 402 94
           Q 442 94 462 124 Q 482 154 462 184
           L 440 220 Q 424 246 441 265
           Q 456 280 444 284 L 432 278`,
    sfLine: `M 198 278 L 198 266`,
  },

  // ─── MONACO — Circuit de Monaco ────────────────────────────────────
  // Legendary tight street circuit. The Loews hairpin loop is clearly
  // visible: the path spirals into the hairpin and back out.
  mon_2026: {
    viewBox: "0 0 450 380",
    path: `M 86 328 L 356 328 Q 400 328 415 294
           Q 430 260 413 235 Q 395 210 368 205
           L 328 205 Q 296 205 280 182
           Q 264 157 274 128 Q 285 100 313 93
           Q 343 86 366 104 Q 394 125 390 160
           Q 385 196 354 208 L 315 220
           Q 280 232 264 263 Q 248 294 220 306
           Q 192 318 168 306 Q 140 292 138 264
           Q 136 233 158 218 Q 180 202 205 212
           Q 232 224 232 255 Q 232 284 208 297
           Q 182 312 156 300 Q 128 287 125 260
           Q 122 230 145 216 L 86 328`,
    sfLine: `M 86 328 L 86 316`,
  },

  // ─── SPAIN — Circuit de Barcelona-Catalunya ────────────────────────
  // Long main straight, slow T1, flowing S-curves through the infield.
  esp_2026: {
    viewBox: "0 0 500 380",
    path: `M 130 308 L 79 278 Q 49 256 54 220
           Q 59 183 90 173 L 150 150
           Q 182 138 207 154 Q 232 170 220 202
           Q 208 234 178 237 L 118 241
           Q 82 246 78 276 L 130 308
           M 150 150 L 190 116 Q 211 92 247 85
           L 383 78 Q 422 76 442 106
           Q 462 136 440 164 L 398 214
           Q 372 250 344 256 L 236 270
           Q 196 276 172 302 Q 152 326 152 341 L 130 308`,
    sfLine: `M 383 78 L 383 90`,
  },

  // ─── AUSTRIA — Red Bull Ring, Spielberg ────────────────────────────
  // Very COMPACT circuit (4.3 km, 10 turns). Steep elevation changes.
  aut_2026: {
    viewBox: "0 0 380 360",
    path: `M 294 305 L 164 305 Q 117 305 97 270
           Q 77 236 100 207 L 148 166
           Q 165 147 157 120 Q 148 92 120 86
           Q 90 79 76 108 Q 62 138 82 158
           L 118 178 Q 143 196 145 228
           Q 148 261 122 278 Q 95 297 108 320
           L 164 305 M 148 166 L 212 112
           Q 238 90 273 86 L 323 83
           Q 357 83 370 117 Q 382 152 360 178
           L 316 238 Q 300 266 312 298
           Q 318 310 306 312 L 294 305`,
    sfLine: `M 323 83 L 323 95`,
  },

  // ─── GREAT BRITAIN — Silverstone ───────────────────────────────────
  // Fast, flowing circuit. Famous Maggots-Becketts-Chapel complex.
  gbr_2026: {
    viewBox: "0 0 550 400",
    path: `M 362 335 L 199 335 Q 153 335 128 304
           Q 102 272 124 247 L 165 197
           Q 180 173 168 147 Q 155 121 128 117
           L 84 112 Q 47 112 41 80
           Q 34 48 66 37 L 163 27
           Q 202 24 233 49 L 273 84
           Q 294 112 327 117 L 426 121
           Q 469 123 489 158 Q 508 193 488 226
           L 442 288 Q 418 320 445 342
           Q 460 352 438 358 L 362 335`,
    sfLine: `M 199 335 L 199 323`,
  },

  // ─── BELGIUM — Circuit de Spa-Francorchamps ────────────────────────
  // One of the longest circuits. Iconic Eau Rouge, Kemmel straight, Pouhon.
  bel_2026: {
    viewBox: "0 0 550 450",
    path: `M 452 378 L 278 378 Q 238 378 218 348
           L 186 296 Q 172 268 148 268
           L 97 274 Q 62 278 46 252
           Q 29 225 51 204 L 109 163
           Q 133 141 122 114 Q 110 87 80 84
           L 56 84 Q 26 84 22 54
           Q 17 24 50 17 L 178 15
           Q 218 15 249 47 L 292 101
           Q 312 132 348 138 L 432 143
           Q 478 149 498 183 Q 519 217 498 250
           L 462 326 Q 446 360 471 378
           Q 482 390 467 395 L 452 378`,
    sfLine: `M 278 378 L 278 366`,
  },

  // ─── HUNGARY — Hungaroring ─────────────────────────────────────────
  // Twisty, technical "Monaco without walls". Very slow average speed.
  hun_2026: {
    viewBox: "0 0 480 380",
    path: `M 352 318 L 198 318 Q 152 318 130 287
           Q 108 256 130 226 L 172 180
           Q 188 158 177 136 Q 167 114 140 111
           L 99 111 Q 62 111 51 84
           Q 41 57 65 41 L 149 27
           Q 187 23 217 47 L 253 77
           Q 273 100 307 105 L 383 108
           Q 423 112 441 142 Q 459 172 441 205
           L 402 268 Q 382 300 406 325
           Q 416 338 399 341 L 352 318`,
    sfLine: `M 198 318 L 198 306`,
  },

  // ─── NETHERLANDS — Circuit Zandvoort ───────────────────────────────
  // Compact seaside circuit. Banked turns T3 (18°) and T14 (32°).
  ned_2026: {
    viewBox: "0 0 480 380",
    path: `M 348 307 L 188 307 Q 139 307 117 276
           Q 95 244 119 214 L 170 165
           Q 192 140 178 112 Q 164 84 137 82
           L 91 82 Q 54 82 43 55
           Q 31 27 62 18 L 158 13
           Q 197 10 226 37 L 264 71
           Q 284 96 318 100 L 396 105
           Q 437 108 453 142 Q 469 176 448 210
           L 404 276 Q 387 307 412 332
           Q 422 345 405 350 L 348 307`,
    sfLine: `M 188 307 L 188 295`,
  },

  // ─── ITALY — Autodromo Nazionale di Monza ──────────────────────────
  // "Temple of Speed". Oval park layout, two chicanes on the main straight.
  // Distinctive elongated oval feel.
  ita_2026: {
    viewBox: "0 0 500 380",
    path: `M 395 320 L 198 320 Q 144 320 118 280
           Q 92 238 125 208 L 155 185
           Q 163 172 148 152 Q 133 132 107 130
           L 70 130 Q 36 130 30 100
           Q 24 70 52 54 L 148 32
           Q 186 20 218 42 L 395 150
           Q 432 170 448 212 Q 464 254 444 292
           Q 422 330 445 350 Q 455 360 438 358 L 395 320`,
    sfLine: `M 198 320 L 198 308`,
  },

  // ─── AZERBAIJAN — Baku City Circuit ────────────────────────────────
  // Longest main straight in F1 (2.2 km). Narrow, twisting old city section.
  aze_2026: {
    viewBox: "0 0 300 500",
    path: `M 202 456 L 100 456 Q 64 456 53 425
           L 47 366 Q 41 336 62 314
           Q 83 292 106 306 Q 128 320 122 349
           Q 116 378 89 382 L 69 382
           Q 47 382 44 359 L 39 248
           Q 37 208 57 190 L 95 160
           Q 115 143 107 118 Q 99 93 72 90
           L 52 90 Q 28 90 26 65
           Q 22 40 49 33 L 122 26
           Q 158 20 178 49 Q 198 79 181 110
           Q 164 141 136 132 Q 109 123 112 153
           L 118 200 Q 122 230 148 244
           L 210 254 Q 244 265 247 304
           L 247 418 Q 247 455 218 461 L 202 456`,
    sfLine: `M 100 456 L 100 444`,
  },

  // ─── SINGAPORE — Marina Bay Street Circuit ─────────────────────────
  // Night race, many 90° turns around Marina Bay. Complex street layout.
  sin_2026: {
    viewBox: "0 0 500 420",
    path: `M 382 356 L 178 356 Q 127 356 101 320
           Q 75 283 101 250 L 148 202
           Q 163 182 152 158 Q 141 134 114 131
           L 74 129 Q 38 129 31 98
           Q 24 67 51 50 L 139 27
           Q 179 17 216 41 L 261 74
           Q 283 99 320 104 L 403 111
           Q 446 117 464 152 Q 482 188 460 223
           L 416 298 Q 398 332 422 356
           Q 432 369 417 376 L 382 356`,
    sfLine: `M 178 356 L 178 344`,
  },

  // ─── USA — Circuit of the Americas, Austin ─────────────────────────
  // Modern circuit. Steep elevation change at T1. Mix of fast/slow corners.
  usa_2026: {
    viewBox: "0 0 500 400",
    path: `M 380 337 L 178 337 Q 127 337 104 300
           Q 81 263 108 229 L 159 179
           Q 178 154 168 127 Q 157 100 130 98
           L 85 98 Q 49 98 39 67
           Q 28 36 60 23 L 154 13
           Q 195 8 229 37 L 276 77
           Q 299 104 337 110 L 417 117
           Q 460 122 477 157 Q 494 192 472 226
           L 428 298 Q 411 332 438 353
           Q 449 363 432 369 L 380 337`,
    sfLine: `M 178 337 L 178 325`,
  },

  // ─── MEXICO — Autódromo Hermanos Rodríguez ─────────────────────────
  // High altitude (2280 m). Long main straight. Peraltada stadium section.
  mex_2026: {
    viewBox: "0 0 500 380",
    path: `M 390 308 L 178 308 Q 127 308 102 272
           Q 76 235 108 205 L 165 162
           Q 185 138 170 110 Q 154 82 122 82
           L 80 84 Q 44 86 37 58
           Q 30 29 58 17 L 158 10
           Q 197 6 231 32 L 286 75
           Q 309 101 349 106 L 424 110
           Q 464 115 480 149 Q 495 183 472 216
           L 428 288 Q 411 320 438 341
           Q 449 353 430 357 L 390 308`,
    sfLine: `M 178 308 L 178 296`,
  },

  // ─── BRAZIL — Autódromo José Carlos Pace, Interlagos ───────────────
  // Counter-clockwise! Undulating circuit. Iconic Senna S at the start.
  bra_2026: {
    viewBox: "0 0 480 380",
    path: `M 368 308 L 188 308 Q 140 308 115 271
           Q 90 234 118 204 L 170 157
           Q 192 132 179 105 Q 167 78 139 76
           L 95 78 Q 57 78 46 50
           Q 35 22 65 10 L 165 4
           Q 204 1 237 28 L 284 72
           Q 308 98 347 103 L 414 108
           Q 455 113 471 148 Q 487 183 462 216
           L 418 288 Q 400 320 425 342
           Q 436 354 418 359 L 368 308`,
    sfLine: `M 188 308 L 188 296`,
  },

  // ─── LAS VEGAS — Las Vegas Strip Circuit ───────────────────────────
  // Three long straights (Las Vegas Blvd, Harmon, Koval). Portrait shape.
  // Very fast, high speed. Three 90-degree turn complexes.
  lv_2026: {
    viewBox: "0 0 320 520",
    path: `M 82 478 L 82 88
           Q 82 50 118 32 Q 158 13 198 34
           Q 238 55 238 92 L 238 432
           Q 238 470 205 486 Q 168 504 130 482
           Q 95 460 89 422 L 89 280
           Q 89 255 72 242 Q 52 228 36 238
           Q 16 250 18 272 Q 20 296 42 305
           L 64 312 Q 82 320 82 345 L 82 478`,
    sfLine: `M 82 478 L 94 478`,
  },

  // ─── QATAR — Lusail International Circuit ──────────────────────────
  // Modern, fast flowing outdoor circuit. Long back straight.
  qat_2026: {
    viewBox: "0 0 500 380",
    path: `M 382 308 L 188 308 Q 140 308 114 277
           Q 88 245 114 214 L 168 163
           Q 188 138 175 111 Q 161 83 133 82
           L 90 84 Q 53 86 42 58
           Q 31 28 60 18 L 158 12
           Q 196 9 229 35 L 278 75
           Q 301 101 340 106 L 416 111
           Q 457 116 473 150 Q 488 184 464 217
           L 421 291 Q 403 320 428 341
           Q 439 352 423 357 L 382 308`,
    sfLine: `M 188 308 L 188 296`,
  },

  // ─── ABU DHABI — Yas Marina Circuit ───────────────────────────────
  // Modern circuit around a marina. Hotel straddles the track at T19.
  abu_2026: {
    viewBox: "0 0 500 400",
    path: `M 380 338 L 185 338 Q 135 338 109 303
           Q 83 268 110 236 L 164 183
           Q 184 158 171 130 Q 158 102 131 100
           L 87 100 Q 51 100 40 70
           Q 29 40 61 26 L 160 16
           Q 199 10 233 35 L 281 79
           Q 303 106 342 111 L 419 117
           Q 460 122 477 157 Q 494 193 471 225
           L 428 299 Q 411 332 438 353
           Q 449 364 432 370 L 380 338`,
    sfLine: `M 185 338 L 185 326`,
  },

  // ─── MADRID — IFEMA Circuit, Madrid (NEW 2026) ─────────────────────
  // New street/permanent hybrid circuit. Urban section around IFEMA expo.
  mad_2026: {
    viewBox: "0 0 500 380",
    path: `M 378 308 L 168 308 Q 118 308 92 276
           Q 66 244 93 213 L 150 163
           Q 170 138 158 111 Q 145 82 116 82
           L 76 84 Q 40 86 32 57
           Q 24 28 54 17 L 148 10
           Q 188 7 222 34 L 272 76
           Q 295 102 333 107 L 410 112
           Q 452 117 468 152 Q 484 187 460 220
           L 416 292 Q 398 322 424 342
           Q 435 354 417 358 L 378 308`,
    sfLine: `M 168 308 L 168 296`,
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
