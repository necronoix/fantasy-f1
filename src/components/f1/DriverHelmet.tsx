'use client'

import React from 'react'

interface Props {
  driverId: string
  size?: number
  className?: string
}

// Stable ID generator - no Math.random() to avoid hydration mismatch
function sid(driverId: string, suffix: string) {
  return `hm-${driverId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${suffix}`
}

// ──────────────────────────────────────────────────────────────────────────────
// 2025/2026 Realistic F1 Driver Helmet Designs
// Each design includes: base color, accents, patterns, visor tint, and detailed SVG path data
// ──────────────────────────────────────────────────────────────────────────────

interface HelmetPattern {
  type: 'stripe' | 'band' | 'geometric' | 'gradient-zone' | 'accent'
  paths: string[]        // SVG path data
  fill?: string
  colors?: string[]      // for gradients
  opacity?: number
}

interface HelmetDesign {
  baseGradient: {
    color1: string       // primary color
    color2: string       // secondary color (darker)
  }
  visor: {
    tint: string         // visor tint color
    reflection: string   // reflection highlight
  }
  patterns: HelmetPattern[]
  chinColor: string
  domeAccent?: string   // accent color for top dome
  description: string
}

const DESIGNS: Record<string, HelmetDesign> = {
  // Max Verstappen – Red Bull – Dutch flag (red/white/blue) with orange/yellow lion
  VER: {
    baseGradient: { color1: '#1a2d6e', color2: '#0d1b4a' },
    visor: { tint: '#1a4a8a', reflection: '#5599ff' },
    patterns: [
      // Orange diagonal swoosh (left side)
      {
        type: 'stripe',
        paths: ['M 20 45 Q 35 35 50 50 L 55 60 Q 40 55 25 60 Z'],
        fill: '#FF6B00',
        opacity: 0.95,
      },
      // Yellow accent stripe through middle
      {
        type: 'stripe',
        paths: ['M 48 40 L 62 50 L 60 58 L 46 48 Z'],
        fill: '#FFD700',
        opacity: 0.9,
      },
      // Orange accent lower
      {
        type: 'stripe',
        paths: ['M 35 55 L 55 65 L 52 70 L 32 60 Z'],
        fill: '#FF8800',
        opacity: 0.85,
      },
      // Blue accent top rear
      {
        type: 'band',
        paths: ['M 60 20 Q 75 25 80 38 L 75 40 Q 65 28 55 25 Z'],
        fill: '#1a2d6e',
        opacity: 0.6,
      },
    ],
    chinColor: '#FF6B00',
    domeAccent: '#0d1b4a',
    description: 'Max Verstappen - Red Bull Racing',
  },

  // Lewis Hamilton – Ferrari – All yellow (Modena Yellow) with red touches
  HAM: {
    baseGradient: { color1: '#FFD700', color2: '#FFC700' },
    visor: { tint: '#1a3a1a', reflection: '#44aa44' },
    patterns: [
      // Red accent on left side
      {
        type: 'stripe',
        paths: ['M 15 40 Q 25 35 30 50 L 35 55 Q 25 48 20 52 Z'],
        fill: '#CC0000',
        opacity: 0.8,
      },
      // Red accent bottom
      {
        type: 'band',
        paths: ['M 20 65 L 80 65 L 80 70 L 20 70 Z'],
        fill: '#CC0000',
        opacity: 0.7,
      },
      // Dark accent stripe (Ferrari Rosso Corsa area)
      {
        type: 'stripe',
        paths: ['M 55 30 Q 70 28 75 38 L 75 45 Q 65 40 50 42 Z'],
        fill: '#990000',
        opacity: 0.6,
      },
    ],
    chinColor: '#FFD700',
    domeAccent: '#FFC700',
    description: 'Lewis Hamilton - Ferrari',
  },

  // Charles Leclerc – Ferrari – Red/white geometric pattern (Monaco)
  LEC: {
    baseGradient: { color1: '#CC0000', color2: '#990000' },
    visor: { tint: '#1a1a3a', reflection: '#6688ff' },
    patterns: [
      // White vertical stripe left
      {
        type: 'stripe',
        paths: ['M 25 30 L 35 30 L 33 70 L 23 70 Z'],
        fill: '#FFFFFF',
        opacity: 0.85,
      },
      // Yellow accent stripe middle
      {
        type: 'stripe',
        paths: ['M 48 35 L 58 35 L 56 68 L 46 68 Z'],
        fill: '#FFD700',
        opacity: 0.8,
      },
      // White accent bottom
      {
        type: 'band',
        paths: ['M 20 60 L 80 60 L 80 67 L 20 67 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Dark red top accent
      {
        type: 'band',
        paths: ['M 30 15 Q 50 10 70 18 L 68 25 Q 50 20 32 22 Z'],
        fill: '#660000',
        opacity: 0.7,
      },
    ],
    chinColor: '#FFD700',
    domeAccent: '#CC0000',
    description: 'Charles Leclerc - Ferrari',
  },

  // Lando Norris – McLaren – Papaya orange with blue accents and artistic flourishes
  NOR: {
    baseGradient: { color1: '#FF6B00', color2: '#cc4400' },
    visor: { tint: '#001133', reflection: '#0055ff' },
    patterns: [
      // Bold blue swoosh left
      {
        type: 'stripe',
        paths: ['M 15 40 Q 35 30 45 50 L 48 60 Q 30 55 18 58 Z'],
        fill: '#0033aa',
        opacity: 0.9,
      },
      // Blue accent top
      {
        type: 'band',
        paths: ['M 50 15 Q 70 18 75 28 L 72 32 Q 60 25 45 22 Z'],
        fill: '#002288',
        opacity: 0.85,
      },
      // Blue lower accent
      {
        type: 'stripe',
        paths: ['M 60 55 L 80 60 L 78 68 L 58 65 Z'],
        fill: '#0044CC',
        opacity: 0.8,
      },
      // Bright orange-yellow accent
      {
        type: 'stripe',
        paths: ['M 30 50 L 45 45 L 48 55 L 35 60 Z'],
        fill: '#FF9944',
        opacity: 0.85,
      },
    ],
    chinColor: '#FF8800',
    domeAccent: '#cc4400',
    description: 'Lando Norris - McLaren F1 Team',
  },

  // Oscar Piastri – McLaren – Papaya/blue/pink gradient with Australian flag
  PIA: {
    baseGradient: { color1: '#FF6B00', color2: '#993300' },
    visor: { tint: '#001122', reflection: '#0066ff' },
    patterns: [
      // White chevron pattern
      {
        type: 'geometric',
        paths: ['M 40 28 L 60 28 L 65 45 L 58 60 L 42 60 L 35 45 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Blue horizontal band middle
      {
        type: 'band',
        paths: ['M 25 48 L 75 48 L 75 56 L 25 56 Z'],
        fill: '#0044cc',
        opacity: 0.8,
      },
      // Pink accent
      {
        type: 'stripe',
        paths: ['M 15 35 Q 30 30 40 38 L 42 48 Q 28 42 17 45 Z'],
        fill: '#FF1493',
        opacity: 0.7,
      },
      // Blue top accent
      {
        type: 'band',
        paths: ['M 45 10 Q 65 12 75 20 L 72 28 Q 60 22 50 20 Z'],
        fill: '#003399',
        opacity: 0.75,
      },
    ],
    chinColor: '#cc4400',
    domeAccent: '#FF1493',
    description: 'Oscar Piastri - McLaren F1 Team',
  },

  // George Russell – Mercedes – Silver/teal with geometric star patterns
  RUS: {
    baseGradient: { color1: '#C0C0C0', color2: '#888888' },
    visor: { tint: '#002222', reflection: '#00DDCC' },
    patterns: [
      // Teal diagonal swoosh
      {
        type: 'stripe',
        paths: ['M 15 35 Q 40 25 60 48 L 63 58 Q 40 65 18 52 Z'],
        fill: '#00D2BE',
        opacity: 0.9,
      },
      // Dark teal accent
      {
        type: 'stripe',
        paths: ['M 50 32 Q 70 35 75 45 L 72 50 Q 60 42 45 40 Z'],
        fill: '#00a599',
        opacity: 0.85,
      },
      // White side band right
      {
        type: 'band',
        paths: ['M 70 25 L 80 25 L 80 65 L 70 65 Z'],
        fill: '#FFFFFF',
        opacity: 0.7,
      },
      // Teal accent top dome
      {
        type: 'band',
        paths: ['M 40 12 Q 60 10 75 18 L 72 25 Q 58 18 42 20 Z'],
        fill: '#00D2BE',
        opacity: 0.65,
      },
    ],
    chinColor: '#00D2BE',
    domeAccent: '#00a599',
    description: 'George Russell - Mercedes-AMG Petronas',
  },

  // Carlos Sainz – Ferrari – Red with Spanish blue and orange accents
  SAI: {
    baseGradient: { color1: '#CC0000', color2: '#880000' },
    visor: { tint: '#111133', reflection: '#4455ff' },
    patterns: [
      // Blue swoosh left side
      {
        type: 'stripe',
        paths: ['M 10 45 Q 30 35 45 50 L 48 60 Q 28 58 13 58 Z'],
        fill: '#002299',
        opacity: 0.9,
      },
      // Orange diagonal accent middle
      {
        type: 'stripe',
        paths: ['M 50 40 Q 65 38 70 50 L 68 58 Q 55 55 48 55 Z'],
        fill: '#FFAA00',
        opacity: 0.8,
      },
      // White top band
      {
        type: 'band',
        paths: ['M 25 18 Q 50 15 75 20 L 73 26 Q 50 22 27 24 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Dark red accent
      {
        type: 'band',
        paths: ['M 20 65 L 80 65 L 80 70 L 20 70 Z'],
        fill: '#660000',
        opacity: 0.7,
      },
    ],
    chinColor: '#002299',
    domeAccent: '#880000',
    description: 'Carlos Sainz - Ferrari',
  },

  // Kimi Antonelli – Mercedes – Teal/silver with modern geometric accents
  ANT: {
    baseGradient: { color1: '#00D2BE', color2: '#00a090' },
    visor: { tint: '#001a1a', reflection: '#00eedd' },
    patterns: [
      // Silver diagonal stripe
      {
        type: 'stripe',
        paths: ['M 15 30 Q 40 20 65 45 L 67 55 Q 42 70 18 50 Z'],
        fill: '#C0C0C0',
        opacity: 0.85,
      },
      // White accent stripe
      {
        type: 'stripe',
        paths: ['M 55 35 Q 70 33 75 45 L 73 50 Q 62 43 50 45 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Teal side band
      {
        type: 'band',
        paths: ['M 70 40 L 82 40 L 82 65 L 70 65 Z'],
        fill: '#00D2BE',
        opacity: 0.65,
      },
      // Dark teal top accent
      {
        type: 'band',
        paths: ['M 35 10 Q 60 8 75 16 L 72 23 Q 55 16 37 18 Z'],
        fill: '#00a090',
        opacity: 0.7,
      },
    ],
    chinColor: '#C0C0C0',
    domeAccent: '#00a090',
    description: 'Kimi Antonelli - Mercedes-AMG Petronas',
  },

  // Fernando Alonso – Aston Martin – Blue with Spanish red accents
  ALO: {
    baseGradient: { color1: '#00275a', color2: '#001433' },
    visor: { tint: '#001a33', reflection: '#0088ff' },
    patterns: [
      // Spanish red chevron
      {
        type: 'geometric',
        paths: ['M 38 25 L 62 25 L 68 45 L 62 65 L 38 65 L 32 45 Z'],
        fill: '#FF0000',
        opacity: 0.85,
      },
      // Gold accent stripe
      {
        type: 'stripe',
        paths: ['M 50 30 L 60 30 L 58 58 L 48 58 Z'],
        fill: '#FFD700',
        opacity: 0.7,
      },
      // Bright blue accent right
      {
        type: 'band',
        paths: ['M 65 35 L 78 35 L 78 60 L 65 60 Z'],
        fill: '#007bff',
        opacity: 0.7,
      },
      // Blue top accent
      {
        type: 'band',
        paths: ['M 40 12 Q 60 10 75 18 L 72 24 Q 58 17 42 19 Z'],
        fill: '#0055aa',
        opacity: 0.65,
      },
    ],
    chinColor: '#FF0000',
    domeAccent: '#001433',
    description: 'Fernando Alonso - Aston Martin F1 Team',
  },

  // Lance Stroll – Aston Martin – Dark green with bright accents
  STR: {
    baseGradient: { color1: '#005538', color2: '#003322' },
    visor: { tint: '#001a0d', reflection: '#33cc77' },
    patterns: [
      // Bright green diagonal swoosh
      {
        type: 'stripe',
        paths: ['M 18 40 Q 40 28 60 48 L 63 58 Q 40 68 20 58 Z'],
        fill: '#00AA55',
        opacity: 0.9,
      },
      // Light green accent
      {
        type: 'stripe',
        paths: ['M 55 35 Q 72 38 78 48 L 75 53 Q 65 45 50 42 Z'],
        fill: '#AADDBB',
        opacity: 0.75,
      },
      // Dark green accent lower
      {
        type: 'band',
        paths: ['M 15 58 L 85 58 L 85 64 L 15 64 Z'],
        fill: '#003322',
        opacity: 0.65,
      },
      // Bright green top
      {
        type: 'band',
        paths: ['M 35 12 Q 60 9 78 18 L 75 26 Q 58 18 37 21 Z'],
        fill: '#00AA55',
        opacity: 0.7,
      },
    ],
    chinColor: '#00AA55',
    domeAccent: '#003322',
    description: 'Lance Stroll - Aston Martin F1 Team',
  },

  // Yuki Tsunoda – Racing Bulls – Dark blue/red Japanese theme
  TSU: {
    baseGradient: { color1: '#1e3a8a', color2: '#0d1f4d' },
    visor: { tint: '#001133', reflection: '#3366ff' },
    patterns: [
      // Red swoosh left
      {
        type: 'stripe',
        paths: ['M 12 42 Q 35 32 50 50 L 53 60 Q 32 62 15 58 Z'],
        fill: '#CC0000',
        opacity: 0.9,
      },
      // White stripe accent
      {
        type: 'stripe',
        paths: ['M 48 38 Q 65 35 72 45 L 70 52 Q 60 42 45 45 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Red horizontal band bottom
      {
        type: 'band',
        paths: ['M 20 62 L 80 62 L 80 68 L 20 68 Z'],
        fill: '#CC0000',
        opacity: 0.8,
      },
      // Blue top accent
      {
        type: 'band',
        paths: ['M 40 12 Q 60 10 75 18 L 72 25 Q 58 18 42 20 Z'],
        fill: '#0d1f4d',
        opacity: 0.6,
      },
    ],
    chinColor: '#CC0000',
    domeAccent: '#0d1f4d',
    description: 'Yuki Tsunoda - Racing Bulls',
  },

  // Liam Lawson – Red Bull – Dark blue with pink/white New Zealand theme
  LAW: {
    baseGradient: { color1: '#1e3a8a', color2: '#0d1f4d' },
    visor: { tint: '#001133', reflection: '#4466ff' },
    patterns: [
      // Pink chevron pattern
      {
        type: 'geometric',
        paths: ['M 35 28 L 65 28 L 70 45 L 65 62 L 35 62 L 30 45 Z'],
        fill: '#FF1493',
        opacity: 0.85,
      },
      // White accent stripe
      {
        type: 'stripe',
        paths: ['M 48 32 L 62 32 L 60 58 L 46 58 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Orange accent
      {
        type: 'stripe',
        paths: ['M 25 50 Q 40 48 50 55 L 48 62 Q 35 58 23 60 Z'],
        fill: '#FFAA00',
        opacity: 0.7,
      },
      // Dark blue accent right
      {
        type: 'band',
        paths: ['M 68 30 L 80 30 L 80 62 L 68 62 Z'],
        fill: '#0d1f4d',
        opacity: 0.65,
      },
    ],
    chinColor: '#FF1493',
    domeAccent: '#0d1f4d',
    description: 'Liam Lawson - Oracle Red Bull Racing',
  },

  // Alex Albon – Williams – Dark blue with Thai red/white stripes
  ALB: {
    baseGradient: { color1: '#003580', color2: '#001d4a' },
    visor: { tint: '#001133', reflection: '#3366ff' },
    patterns: [
      // Thai red horizontal stripe
      {
        type: 'band',
        paths: ['M 15 42 L 85 42 L 85 50 L 15 50 Z'],
        fill: '#CC0000',
        opacity: 0.85,
      },
      // White horizontal stripe
      {
        type: 'band',
        paths: ['M 15 54 L 85 54 L 85 60 L 15 60 Z'],
        fill: '#FFFFFF',
        opacity: 0.8,
      },
      // Additional red stripe
      {
        type: 'band',
        paths: ['M 15 65 L 85 65 L 85 70 L 15 70 Z'],
        fill: '#CC0000',
        opacity: 0.75,
      },
      // White accent top
      {
        type: 'band',
        paths: ['M 30 12 Q 55 9 75 16 L 72 24 Q 55 17 32 20 Z'],
        fill: '#FFFFFF',
        opacity: 0.65,
      },
    ],
    chinColor: '#CC0000',
    domeAccent: '#001d4a',
    description: 'Alex Albon - Williams Racing',
  },

  // Pierre Gasly – Alpine – Blue with French flag colors (red/white/blue)
  GAS: {
    baseGradient: { color1: '#0033aa', color2: '#001e77' },
    visor: { tint: '#000a22', reflection: '#3355ff' },
    patterns: [
      // Red diagonal stripe left
      {
        type: 'stripe',
        paths: ['M 12 30 Q 30 22 45 42 L 48 52 Q 30 60 15 52 Z'],
        fill: '#CC0000',
        opacity: 0.9,
      },
      // White diagonal stripe middle
      {
        type: 'stripe',
        paths: ['M 45 32 Q 60 28 70 45 L 68 55 Q 52 60 42 52 Z'],
        fill: '#FFFFFF',
        opacity: 0.8,
      },
      // Red diagonal accent right
      {
        type: 'stripe',
        paths: ['M 65 50 Q 78 52 82 62 L 78 68 Q 65 65 60 60 Z'],
        fill: '#CC0000',
        opacity: 0.75,
      },
      // Blue top accent
      {
        type: 'band',
        paths: ['M 35 10 Q 60 8 76 16 L 73 24 Q 58 17 37 19 Z'],
        fill: '#0044CC',
        opacity: 0.7,
      },
    ],
    chinColor: '#CC0000',
    domeAccent: '#001e77',
    description: 'Pierre Gasly - Alpine F1 Team',
  },

  // Jack Doohan – Alpine – Blue with Australian elements
  DOO: {
    baseGradient: { color1: '#0033aa', color2: '#001e77' },
    visor: { tint: '#000a22', reflection: '#3355ff' },
    patterns: [
      // Pink accent diagonal
      {
        type: 'stripe',
        paths: ['M 15 35 Q 35 25 50 45 L 52 55 Q 32 62 17 50 Z'],
        fill: '#FF69B4',
        opacity: 0.85,
      },
      // White accent stripe
      {
        type: 'stripe',
        paths: ['M 48 38 Q 65 35 72 48 L 70 56 Q 58 48 45 50 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Blue accent side band
      {
        type: 'band',
        paths: ['M 68 30 L 82 30 L 82 65 L 68 65 Z'],
        fill: '#0044CC',
        opacity: 0.7,
      },
      // Pink accent top
      {
        type: 'band',
        paths: ['M 40 12 Q 60 10 75 18 L 72 25 Z'],
        fill: '#FF69B4',
        opacity: 0.65,
      },
    ],
    chinColor: '#FF69B4',
    domeAccent: '#001e77',
    description: 'Jack Doohan - Alpine F1 Team',
  },

  // Gabriel Bortoleto – Audi/Sauber – Green/yellow (Brazil) Senna-inspired
  BOR: {
    baseGradient: { color1: '#00aa44', color2: '#006622' },
    visor: { tint: '#001a0a', reflection: '#33ee66' },
    patterns: [
      // White diagonal stripe (Senna homage)
      {
        type: 'stripe',
        paths: ['M 15 28 Q 40 18 65 42 L 68 52 Q 42 68 18 52 Z'],
        fill: '#FFFFFF',
        opacity: 0.9,
      },
      // Bright green accent
      {
        type: 'stripe',
        paths: ['M 50 35 Q 68 32 75 45 L 73 52 Q 62 42 45 45 Z'],
        fill: '#00cc55',
        opacity: 0.85,
      },
      // Yellow horizontal accent
      {
        type: 'band',
        paths: ['M 18 60 L 82 60 L 82 66 L 18 66 Z'],
        fill: '#FFD700',
        opacity: 0.8,
      },
      // Green top accent
      {
        type: 'band',
        paths: ['M 35 10 Q 60 8 78 16 L 75 24 Q 58 16 37 18 Z'],
        fill: '#00aa44',
        opacity: 0.75,
      },
    ],
    chinColor: '#FFD700',
    domeAccent: '#006622',
    description: 'Gabriel Bortoleto - Audi/Sauber',
  },

  // Oliver Bearman – Haas – Black/white/red geometric
  BEA: {
    baseGradient: { color1: '#1a1a1a', color2: '#0d0d0d' },
    visor: { tint: '#0a0000', reflection: '#ff3300' },
    patterns: [
      // Red side band left
      {
        type: 'band',
        paths: ['M 10 25 L 30 25 L 28 72 L 8 72 Z'],
        fill: '#CC0000',
        opacity: 0.9,
      },
      // White diagonal stripe
      {
        type: 'stripe',
        paths: ['M 40 35 Q 55 28 65 45 L 63 55 Q 48 62 38 55 Z'],
        fill: '#FFFFFF',
        opacity: 0.8,
      },
      // Red diagonal stripe lower
      {
        type: 'stripe',
        paths: ['M 60 50 Q 75 52 80 62 L 77 68 Q 65 62 55 60 Z'],
        fill: '#CC0000',
        opacity: 0.85,
      },
      // Red top accent
      {
        type: 'band',
        paths: ['M 35 12 Q 60 10 75 18 L 72 25 Q 58 17 37 20 Z'],
        fill: '#CC0000',
        opacity: 0.7,
      },
    ],
    chinColor: '#CC0000',
    domeAccent: '#0d0d0d',
    description: 'Oliver Bearman - Haas F1 Team',
  },

  // Isack Hadjar – Racing Bulls – Red Bull blue/red theme
  HAD: {
    baseGradient: { color1: '#1e3a8a', color2: '#0d1f4d' },
    visor: { tint: '#001133', reflection: '#4466ff' },
    patterns: [
      // Red swoosh
      {
        type: 'stripe',
        paths: ['M 10 40 Q 35 30 55 50 L 58 60 Q 32 65 12 60 Z'],
        fill: '#AA0000',
        opacity: 0.9,
      },
      // Gold accent stripe
      {
        type: 'stripe',
        paths: ['M 52 40 Q 68 37 75 48 L 73 55 Q 62 45 48 48 Z'],
        fill: '#FFD700',
        opacity: 0.8,
      },
      // Dark blue accent side
      {
        type: 'band',
        paths: ['M 68 28 L 82 28 L 82 65 L 68 65 Z'],
        fill: '#0d1f4d',
        opacity: 0.7,
      },
      // Red accent bottom
      {
        type: 'band',
        paths: ['M 20 64 L 80 64 L 80 70 L 20 70 Z'],
        fill: '#AA0000',
        opacity: 0.75,
      },
    ],
    chinColor: '#AA0000',
    domeAccent: '#0d1f4d',
    description: 'Isack Hadjar - Racing Bulls',
  },

  // Esteban Ocon – Haas – Blue/grey with pink accents
  OCO: {
    baseGradient: { color1: '#1a3a4a', color2: '#0d1f2d' },
    visor: { tint: '#000a1a', reflection: '#3366ff' },
    patterns: [
      // Pink swoosh
      {
        type: 'stripe',
        paths: ['M 12 42 Q 35 32 50 50 L 52 60 Q 30 62 14 58 Z'],
        fill: '#FF69B4',
        opacity: 0.9,
      },
      // White diagonal accent
      {
        type: 'stripe',
        paths: ['M 48 38 Q 65 35 73 48 L 71 56 Q 60 46 45 50 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Blue side band
      {
        type: 'band',
        paths: ['M 70 30 L 82 30 L 82 65 L 70 65 Z'],
        fill: '#002288',
        opacity: 0.7,
      },
      // Grey accent top
      {
        type: 'band',
        paths: ['M 35 10 Q 60 8 75 16 L 72 24 Q 55 16 37 18 Z'],
        fill: '#555555',
        opacity: 0.65,
      },
    ],
    chinColor: '#FF69B4',
    domeAccent: '#0d1f2d',
    description: 'Esteban Ocon - Haas F1 Team',
  },

  // Franco Colapinto – Cadillac – Blue/white (Argentine) colors
  COL: {
    baseGradient: { color1: '#003fac', color2: '#002277' },
    visor: { tint: '#000a22', reflection: '#4488ff' },
    patterns: [
      // White horizontal band upper
      {
        type: 'band',
        paths: ['M 15 38 L 85 38 L 85 46 L 15 46 Z'],
        fill: '#FFFFFF',
        opacity: 0.85,
      },
      // Light blue horizontal band
      {
        type: 'band',
        paths: ['M 15 52 L 85 52 L 85 59 L 15 59 Z'],
        fill: '#66AAFF',
        opacity: 0.8,
      },
      // White accent lower
      {
        type: 'band',
        paths: ['M 15 64 L 85 64 L 85 70 L 15 70 Z'],
        fill: '#FFFFFF',
        opacity: 0.75,
      },
      // Light blue top accent
      {
        type: 'band',
        paths: ['M 30 12 Q 55 10 75 17 L 72 25 Q 55 18 32 20 Z'],
        fill: '#66AAFF',
        opacity: 0.7,
      },
    ],
    chinColor: '#FFFFFF',
    domeAccent: '#002277',
    description: 'Franco Colapinto - Cadillac F1',
  },

  // Nico Hülkenberg – Audi – Black/red with white accents
  HUL: {
    baseGradient: { color1: '#1a1a1a', color2: '#0d0d0d' },
    visor: { tint: '#1a0000', reflection: '#ff4400' },
    patterns: [
      // Red diagonal stripe left
      {
        type: 'stripe',
        paths: ['M 15 28 Q 35 18 50 40 L 52 50 Q 35 60 17 52 Z'],
        fill: '#FF3300',
        opacity: 0.9,
      },
      // White diagonal stripe middle
      {
        type: 'stripe',
        paths: ['M 48 35 Q 65 30 72 45 L 70 54 Q 58 50 45 50 Z'],
        fill: '#FFFFFF',
        opacity: 0.8,
      },
      // Red diagonal accent right
      {
        type: 'stripe',
        paths: ['M 65 50 Q 78 53 82 63 L 78 68 Q 65 63 60 58 Z'],
        fill: '#FF3300',
        opacity: 0.85,
      },
      // Red top accent
      {
        type: 'band',
        paths: ['M 35 10 Q 60 8 76 16 L 73 24 Q 58 16 37 19 Z'],
        fill: '#FF3300',
        opacity: 0.75,
      },
    ],
    chinColor: '#FF3300',
    domeAccent: '#0d0d0d',
    description: 'Nico Hülkenberg - Audi F1',
  },
}

// Fallback generic design
const DEFAULT_DESIGN: HelmetDesign = {
  baseGradient: { color1: '#333333', color2: '#111111' },
  visor: { tint: '#111133', reflection: '#5566ff' },
  patterns: [
    {
      type: 'stripe',
      paths: ['M 20 35 Q 40 25 65 50 L 65 60 Q 40 70 20 60 Z'],
      fill: '#888888',
      opacity: 0.7,
    },
  ],
  chinColor: '#555555',
  domeAccent: '#111111',
  description: 'Default F1 Helmet',
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component - realistic side-profile helmet with proper 3D shape
// ──────────────────────────────────────────────────────────────────────────────

export function DriverHelmet({ driverId, size = 56, className = '' }: Props) {
  const design = DESIGNS[driverId] ?? DEFAULT_DESIGN
  const id = sid(driverId, 'hm')

  const baseGradId = `${id}-base-grad`
  const shineGradId = `${id}-shine`
  const visorGradId = `${id}-visor`
  const shadowGradId = `${id}-shadow`
  const clipId = `${id}-clip`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
      aria-label={`${driverId} helmet`}
    >
      <defs>
        {/* Main dome gradient for 3D effect */}
        <radialGradient id={baseGradId} cx="35%" cy="25%" r="70%" fx="30%" fy="20%">
          <stop offset="0%" stopColor={design.baseGradient.color1} stopOpacity="1" />
          <stop offset="50%" stopColor={design.baseGradient.color1} stopOpacity="1" />
          <stop offset="100%" stopColor={design.baseGradient.color2} stopOpacity="1" />
        </radialGradient>

        {/* Bright highlight shine */}
        <radialGradient id={shineGradId} cx="32%" cy="22%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Visor gradient with tint and reflection */}
        <linearGradient id={visorGradId} x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={design.visor.reflection} stopOpacity="0.8" />
          <stop offset="35%" stopColor={design.visor.tint} stopOpacity="0.85" />
          <stop offset="100%" stopColor={design.visor.tint} stopOpacity="1" />
        </linearGradient>

        {/* Drop shadow */}
        <radialGradient id={shadowGradId} cx="50%" cy="92%" r="55%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Clipping path for dome (realistic helmet shape) */}
        <clipPath id={clipId}>
          <path d="M 20 50 Q 15 40 20 25 Q 35 15 50 14 Q 65 15 80 25 Q 85 40 80 50 L 78 60 Q 50 65 22 60 Z" />
        </clipPath>
      </defs>

      {/* Drop shadow ellipse at bottom */}
      <ellipse cx="50" cy="94" rx="26" ry="4" fill={`url(#${shadowGradId})`} />

      {/* Chin/neck section - colored and shaped */}
      <path
        d="M 22 58 Q 50 75 78 58 L 82 72 Q 50 88 18 72 Z"
        fill={design.chinColor}
        opacity="0.85"
      />
      <path
        d="M 28 60 Q 50 72 72 60 L 74 68 Q 50 82 26 68 Z"
        fill="#ffffff"
        opacity="0.06"
      />

      {/* Main helmet dome - smooth 3D ellipse */}
      <ellipse cx="50" cy="40" rx="34" ry="36" fill={`url(#${baseGradId})`} />

      {/* Pattern layer - clipped to dome */}
      <g clipPath={`url(#${clipId})`}>
        {design.patterns.map((pattern, idx) => (
          <g key={idx}>
            {pattern.paths.map((pathData, pidx) => (
              <path
                key={pidx}
                d={pathData}
                fill={pattern.fill}
                opacity={pattern.opacity ?? 0.8}
              />
            ))}
          </g>
        ))}
      </g>

      {/* 3D shine/highlight layer */}
      <ellipse cx="50" cy="40" rx="34" ry="36" fill={`url(#${shineGradId})`} />

      {/* Helmet dome outline for definition */}
      <ellipse
        cx="50"
        cy="40"
        rx="34"
        ry="36"
        fill="none"
        stroke="#000000"
        strokeWidth="1.2"
        opacity="0.35"
      />

      {/* Top aero bump / ventilation area */}
      <ellipse cx="50" cy="18" rx="12" ry="8" fill="#000000" opacity="0.25" />
      <rect x="44" y="12" width="12" height="2.5" rx="1" fill="#000000" opacity="0.3" />

      {/* Visor frame - dark base structure */}
      <path
        d="M 24 48 Q 26 42 34 38 Q 50 34 66 38 Q 74 42 76 48 Q 74 58 50 62 Q 26 58 24 48 Z"
        fill="#0a0a0a"
        opacity="0.98"
      />

      {/* Visor glass with gradient and reflection */}
      <path
        d="M 27 48 Q 29 43 37 40 Q 50 37 63 40 Q 71 43 73 48 Q 71 56 50 59 Q 29 56 27 48 Z"
        fill={`url(#${visorGradId})`}
        opacity="0.88"
      />

      {/* Visor upper reflection highlight */}
      <path
        d="M 35 42 Q 50 40 65 42 Q 58 39 50 38 Q 42 39 35 42 Z"
        fill="#ffffff"
        opacity="0.32"
      />

      {/* Visor secondary shine glint */}
      <ellipse cx="40" cy="50" rx="4.5" ry="2" fill="#ffffff" opacity="0.1" />

      {/* Driver ID label - bold and centered on chin */}
      <text
        x="50"
        y="68"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="5.5"
        fontFamily="'Arial', 'Helvetica', sans-serif"
        fontWeight="900"
        letterSpacing="0.3"
        fill="#ffffff"
        opacity="0.95"
      >
        {driverId}
      </text>
    </svg>
  )
}
