# Fantasy F1 - Dark Mode Theme & Design System

## Brand Identity

The application uses the official **Formula 1** color scheme in a dark mode design, inspired by the FIA and Liberty Media visual identity.

### Primary Color Palette

```
F1 Red (Primary Action)
├── Hex: #E8002D
├── RGB: 232, 0, 45
├── Usage: Buttons, links, accents, highlights, hover states
└── CSS: bg-f1-red, text-f1-red, border-f1-red

F1 Red Dark (Hover/Focus)
├── Hex: #B30022
├── RGB: 179, 0, 34
├── Usage: Hover buttons, active states, darker accents
└── CSS: bg-f1-red-dark, hover:bg-f1-red-dark

F1 Black (Background)
├── Hex: #15151E
├── RGB: 21, 21, 30
├── Usage: Main page background
└── CSS: bg-f1-black

F1 Black Light (Cards/Containers)
├── Hex: #1E1E2E
├── RGB: 30, 30, 46
├── Usage: Card backgrounds, dropdowns, modals
└── CSS: bg-f1-black-light

F1 Gray Dark (Borders/Dividers)
├── Hex: #2A2A3A
├── RGB: 42, 42, 58
├── Usage: Border colors, subtle dividers
└── CSS: border-f1-gray-dark

F1 Gray Mid (Interactive Hover)
├── Hex: #3A3A4A
├── RGB: 58, 58, 74
├── Usage: Hover backgrounds, active states, subtle fills
└── CSS: bg-f1-gray-mid, hover:bg-f1-gray-mid

F1 Gray (Secondary Text)
├── Hex: #6B6B7B
├── RGB: 107, 107, 123
├── Usage: Secondary labels, less important text
└── CSS: text-f1-gray

F1 Gray Light (Disabled/Subtle)
├── Hex: #9B9BAB
├── RGB: 155, 155, 171
├── Usage: Disabled text, subtle hints, tooltips
└── CSS: text-f1-gray-light

F1 White (Primary Text)
├── Hex: #FFFFFF
├── RGB: 255, 255, 255
├── Usage: Main text, primary content
└── CSS: text-f1-white, text-white

F1 Silver (Secondary Accent)
├── Hex: #C0C0C0
├── RGB: 192, 192, 192
├── Usage: Secondary accents, metallic elements
└── CSS: text-f1-silver
```

## Layout Structure

### Header/Navigation
```css
.f1-header {
  background: linear-gradient(135deg, #E8002D 0%, #B30022 100%);
  /* Red gradient from light to dark */
}
```

### Card Component
```css
.f1-card {
  @apply bg-f1-black-light 
         border border-f1-gray-dark 
         rounded-xl 
         p-4;
}
```

### Buttons

**Primary Button** (Call to Action)
```css
.btn-primary {
  @apply bg-f1-red 
         hover:bg-f1-red-dark 
         text-white 
         font-bold 
         py-2 px-4 
         rounded-lg
         transition-colors;
}
```

**Secondary Button** (Alternative)
```css
.btn-secondary {
  @apply border border-f1-gray-mid 
         hover:border-f1-red 
         text-white 
         font-bold 
         py-2 px-4 
         rounded-lg
         transition-colors;
}
```

### Input Fields
```css
input, textarea, select {
  @apply bg-f1-black-light 
         border border-f1-gray-mid 
         rounded-lg 
         px-3 py-2 
         text-white
         placeholder-f1-gray-light
         focus:border-f1-red 
         focus:outline-none;
}
```

## Animations & Effects

### Pulse Red (Auction Activity)
```css
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 0, 45, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(232, 0, 45, 0); }
}

.pulse-red {
  animation: pulse-red 1s ease-in-out infinite;
}
```

### Bid Flash (New Bid Feedback)
```css
@keyframes bid-flash {
  0% { background-color: rgba(232, 0, 45, 0.3); }
  100% { background-color: transparent; }
}

.bid-flash {
  animation: bid-flash 0.6s ease-out;
}
```

### Timer Countdown Bar
```css
.timer-bar {
  transition: width linear;
  /* Animates width from full to empty with linear timing */
}
```

## Typography

### Font Stack
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

### Text Styles

**Heading 1** (Logo/Main Title)
```css
h1 {
  font-size: 2.25rem;    /* text-4xl */
  font-weight: 900;      /* font-black */
  letter-spacing: -0.03em;  /* tracking-tight */
}
/* e.g., "FORMULA FANTASY" */
```

**Heading 2** (Section Headers)
```css
h2 {
  font-size: 1.875rem;   /* text-3xl */
  font-weight: 700;      /* font-bold */
  color: #FFFFFF;
}
```

**Body** (Main Content)
```css
p {
  font-size: 1rem;       /* text-base */
  line-height: 1.5;      /* leading-relaxed */
  color: #FFFFFF;
}
```

**Label** (Form Labels & Small Text)
```css
label, small {
  font-size: 0.875rem;   /* text-sm */
  text-transform: uppercase;
  letter-spacing: 0.05em;  /* tracking-wide */
  color: #9B9BAB;        /* text-f1-gray-light */
}
```

### Text Colors

| Usage | Color | Class |
|-------|-------|-------|
| Primary Content | #FFFFFF | `text-white` |
| Secondary Content | #9B9BAB | `text-f1-gray-light` |
| Disabled Text | #6B6B7B | `text-f1-gray` |
| Action/Link | #E8002D | `text-f1-red` |
| Success | #00D26A | `text-green-500` |
| Error | #FF4444 | `text-red-500` |
| Warning | #FFA500 | `text-orange-500` |

## UI Components

### Badge (F1 Label)
```tsx
<div className="inline-flex items-center gap-2 bg-f1-red px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
  Fantasy F1 2026
</div>
```

### Stat Card
```tsx
<div className="bg-f1-black-light border border-f1-gray-dark rounded-xl p-4 text-center">
  <div className="text-3xl font-black text-f1-red">25</div>
  <div className="text-xs text-f1-gray-light mt-1 uppercase tracking-wide">points</div>
</div>
```

### Active Auction Card
```tsx
<div className="f1-card animate-pulse-red">
  <div className="flex justify-between items-start">
    <div>
      <div className="text-sm text-f1-gray-light">LEADING BID</div>
      <div className="text-2xl font-black text-f1-red">120cr</div>
    </div>
    <div className="text-sm text-f1-gray">30s left</div>
  </div>
</div>
```

### Position Badge (Race Results)
```tsx
{/* 1st place */}
<span className="pos-1 font-black">1°</span>

{/* 2nd place */}
<span className="pos-2 font-bold">2°</span>

{/* 3rd place */}
<span className="pos-3 font-bold">3°</span>
```

### Scrollbar Styling
```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #15151E;
}

::-webkit-scrollbar-thumb {
  background: #3A3A4A;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #E8002D;  /* F1 Red on hover */
}
```

## Responsive Design

### Breakpoints (Tailwind Default)
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Mobile-First Approach
```tsx
{/* Stack on mobile, row on larger screens */}
<div className="flex flex-col md:flex-row gap-4">
  {/* Items */}
</div>

{/* Text sizes */}
<h1 className="text-4xl md:text-6xl">
  Title
</h1>
```

## Accessibility

- **Color Contrast**: Red (#E8002D) on Black (#15151E) has sufficient contrast
- **Focus States**: Red border on focus for all interactive elements
- **Semantic HTML**: Proper use of button, a, input, label elements
- **ARIA Labels**: Used for complex components

## Dark Mode Notes

- No light mode variant in this version
- All colors optimized for dark background viewing
- Reduced eye strain with dark theme
- Battery-friendly on OLED displays
- Authentic F1 aesthetic (all F1 broadcasts are dark-themed)

## Print Styles (If Needed)

```css
@media print {
  body {
    background: white;
    color: black;
  }
  .f1-card {
    border: 1px solid black;
  }
}
```

## Tools for Testing Colors

- **WCAG Contrast Checker**: Check text contrast ratios
- **Chrome DevTools**: Inspect colors in live application
- **Figma**: Design mockups with exact hex values
- **Coolors.co**: Palette visualization

## Brand Usage

This dark F1 theme:
- Is NOT official Formula 1 branding
- Is inspired by F1's color palette
- Uses similar red and black aesthetic
- Is for Fantasy F1 fan project (non-commercial)

See README.md disclaimer: "Non affiliato a Formula 1 o FIA"
