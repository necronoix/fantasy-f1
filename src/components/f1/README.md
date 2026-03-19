# F1 SVG Assets Library

A comprehensive SVG component library for a Fantasy F1 Next.js app with realistic and distinct visual assets for all 2026 F1 drivers, teams, and circuits.

## Files Overview

### 1. `f1-data.ts` (420 lines)
Central data file containing all F1 2026 season information:

**Exports:**
- `TEAM_COLORS`: Primary hex color for each F1 team
- `TEAM_SECONDARY_COLORS`: Secondary/accent color for each team
- `TEAM_NAMES`: Full team names (Ferrari, Red Bull Racing, etc.)
- `DRIVER_TEAMS`: Maps driver codes to team IDs
- `DRIVER_HELMET_COLORS`: Detailed helmet colors for all 22 drivers
  - primary, secondary, accent, and visor colors
- `CIRCUIT_DATA`: Complete circuit information (22 tracks)
  - Name, country, track length, lap count, turn count, DRS zones

**Data Coverage:**
- 11 Teams (Ferrari, Red Bull, McLaren, Mercedes, etc.)
- 22 Drivers (LEC, HAM, VER, LAW, NOR, PIA, RUS, ANT, ALO, STR, SAI, ALB, GAS, COL, OCO, BEA, HAD, LIN, HUL, BOR, PER, BOT)
- 22 Circuits (Australia, China, Bahrain, Saudi Arabia, Miami, Monaco, Spain, Canada, Austria, GB, Belgium, Hungary, Netherlands, Italy, Azerbaijan, Singapore, USA, Mexico, Brazil, Las Vegas, Qatar, Abu Dhabi)

### 2. `DriverHelmet.tsx` (1080 lines)
React component rendering unique F1 helmet SVG designs for each driver.

**Props:**
- `driverId: string` - Driver code (e.g., "LEC", "VER")
- `size?: number` - SVG size in pixels (default: 100)
- `className?: string` - CSS class for styling

**Features:**
- 9 distinct helmet designs based on color schemes
- Gradient shading for realistic 3D effect
- Unique color combinations per driver
- Includes visor, chin bar, accent stripes, and ventilation details
- Driver initials displayed on helmet

**Design Types:**
1. Ferrari red with white/gold accents
2. Blue designs (Red Bull, Alpine, Mercedes, etc.)
3. Orange designs (McLaren)
4. Teal/Cyan (Mercedes)
5. Green (Aston Martin, Haas, other teams)
6. Light/white base designs
7. Dark blue/navy designs
8. Black with accent details
9. Racing Bulls light blue design

### 3. `CircuitMap.tsx` (182 lines)
React component rendering minimalist SVG circuit track layouts.

**Props:**
- `circuitId: string` - Circuit code (e.g., "aus_2026", "mon_2026")
- `className?: string` - CSS class
- `showInfo?: boolean` - Display circuit information overlay (default: false)
- `color?: string` - Stroke color (default: "#FFFFFF")

**Features:**
- Clean, minimalist track path designs
- Start/finish line indicators
- Track information display (optional)
- All 22 circuits from 2026 season
- Responsive SVG with aspect ratio preservation
- Checkered pattern for start/finish
- Kerbing effects with dashed lines

**Circuits Included:**
All major F1 tracks with recognizable layouts:
- Iconic curves: Monaco, Singapore, Spa, Silverstone
- Modern additions: Las Vegas, Miami, Saudi Arabia
- Technical layouts: Hungary, Baku, Mexico City
- Balanced designs: Australia, Canada, Japan alternatives

### 4. `TeamCarSilhouette.tsx` (148 lines)
React component rendering top-down F1 car silhouettes in team colors.

**Props:**
- `teamId: string` - Team ID (e.g., "ferrari_2026")
- `size?: number` - SVG size in pixels (default: 120)
- `className?: string` - CSS class

**Features:**
- Top-down view of F1 car
- Team primary and secondary colors
- Realistic F1 car elements:
  - Front and rear wings
  - Main chassis body
  - Cockpit opening with halo
  - Four wheels with tire details
  - Engine cover
  - Air intakes and aerodynamic details
- Gradient shading for depth
- Recognizable as modern F1 cars

### 5. `index.ts` (4 lines)
Barrel export file for clean imports:
```typescript
export { DriverHelmet } from './DriverHelmet'
export { CircuitMap } from './CircuitMap'
export { TeamCarSilhouette } from './TeamCarSilhouette'
export * from './f1-data'
```

## Usage Examples

### Import components:
```typescript
import { 
  DriverHelmet, 
  CircuitMap, 
  TeamCarSilhouette,
  TEAM_COLORS,
  DRIVER_HELMET_COLORS,
  CIRCUIT_DATA 
} from '@/components/f1'
```

### Display a driver helmet:
```typescript
<DriverHelmet driverId="LEC" size={120} />
```

### Display a circuit map:
```typescript
<CircuitMap 
  circuitId="mon_2026" 
  showInfo={true}
  color="#FFFFFF"
/>
```

### Display a team car:
```typescript
<TeamCarSilhouette teamId="ferrari_2026" size={150} />
```

### Access data:
```typescript
const ferrariColor = TEAM_COLORS['ferrari_2026'] // '#E8002D'
const lecHelmetColors = DRIVER_HELMET_COLORS['LEC']
const monacoData = CIRCUIT_DATA['mon_2026']
```

## Design Principles

### Helmets
- Each driver has a unique color scheme based on real-life inspirations
- Multiple design variations prevent repetition
- 3D effect achieved through SVG gradients
- Colors are consistent with team identity

### Circuits
- Clean, recognizable track layouts
- Minimal aesthetic similar to official FIA graphics
- Transparent background for integration
- Scalable SVG paths

### Cars
- Simplified but recognizable F1 silhouettes
- Team colors prominently featured
- Accurate F1 proportions
- Modern elements (Halo, winglets, etc.)

## Technical Details

- **Framework**: React with TypeScript
- **Styling**: SVG with inline gradients and opacity
- **Client-side**: All components use 'use client' directive
- **Performance**: Lightweight SVGs optimized for performance
- **Responsive**: All components scale based on size prop
- **Accessibility**: Semantic HTML and proper structure

## Color Reference

All 2026 F1 team colors are accurately represented from official team palettes.
Helmet colors are inspired by real driver liveries and preferences.

Total: 1,834 lines of production code
