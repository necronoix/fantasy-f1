# Fantasy F1 - Project Structure Overview

```
fanta F1/
├── .env.example                 # Environment variables template
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore rules
├── .prettierrc                  # Prettier code formatting
├── README.md                    # Project documentation
├── PROJECT_STRUCTURE.md         # This file
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js configuration
├── jest.config.ts               # Jest testing configuration
├── postcss.config.mjs           # PostCSS configuration
├── tailwind.config.ts           # Tailwind CSS configuration
│
├── src/
│   ├── middleware.ts            # Next.js auth middleware
│   ├── app/
│   │   ├── layout.tsx           # Root layout component
│   │   ├── page.tsx             # Homepage (landing page)
│   │   └── globals.css          # Global styles with F1 theme
│   │
│   ├── lib/
│   │   ├── types.ts             # All TypeScript interfaces and types
│   │   ├── utils.ts             # Utility functions (formatting, helpers)
│   │   ├── scoring.ts           # Scoring engine logic
│   │   │
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client initialization
│   │   │   ├── server.ts        # Server Supabase client initialization
│   │   │   └── middleware.ts    # Authentication middleware
│   │   │
│   │   └── __tests__/
│   │       └── scoring.test.ts  # Jest tests for scoring engine
│   │
│   └── components/              # React components (directory for future components)
│
└── supabase/
    └── migrations/              # Database migration files (directory for future)
```

## File Descriptions

### Root Configuration Files

- **package.json**: NPM dependencies and build/dev scripts
- **tsconfig.json**: TypeScript compiler options with path aliases (@/*)
- **next.config.ts**: Next.js configuration with server actions
- **jest.config.ts**: Jest testing framework configuration
- **postcss.config.mjs**: PostCSS with Tailwind plugin
- **tailwind.config.ts**: Tailwind CSS with F1 custom colors and animations
- **.eslintrc.json**: ESLint extends Next.js core-web-vitals
- **.prettierrc**: Code formatting rules (100 char width, 2 space tabs)
- **.env.example**: Template for environment variables
- **.gitignore**: Git ignore patterns

### Source Files

#### src/middleware.ts
- Next.js middleware for route protection
- Redirects unauthenticated users from protected routes

#### src/app/layout.tsx
- Root layout with Toaster for notifications
- Sets up metadata (title, description, theme color)
- Wraps app with react-hot-toast

#### src/app/page.tsx
- Landing page with hero section
- Shows "Formula Fantasy" headline with F1 red accent
- Login/Signup buttons
- Quick stats cards (4 pilots, 200 budget, 5 max players, 24 GPs)

#### src/app/globals.css
- Base Tailwind CSS imports
- F1-themed custom styles
- Scrollbar styling (red on hover)
- Animation definitions
- Bid flash animation
- Position badge colors

#### src/lib/types.ts
- Complete TypeScript interfaces for:
  - **Auth**: Profile, UserRole
  - **League**: League, LeagueMember, LeagueSettings
  - **Driver/Team**: Driver, Team, GrandPrix
  - **Auction**: AuctionState, Bid, AuctionType, AuctionStatus
  - **Roster**: RosterEntry, AcquiredVia
  - **Scoring**: ScoringRules, ScoringRulesData, GpScore, ScoreBreakdown
  - **GP Management**: GpSelection, GpResults, GpPredictions, GpResultsData
  - **Trades**: Trade, TradeOffer, TradeStatus
  - **UI Helpers**: StandingsEntry, AuctionBidEvent

#### src/lib/utils.ts
- **cn()**: Merge Tailwind classes with clsx + tailwind-merge
- **formatDate()**: Format dates with Italian locale
- **formatDateTime()**: Format dates with time
- **timeFromNow()**: "2 ore fa" style relative time
- **isLocked()**: Check if date has passed
- **getTimerSeconds()**: Calculate auction countdown
- **formatCredits()**: Format budget display ("200cr")
- **getPositionSuffix()**: Get position suffix ("1°", "2°", "3°")
- **generateLeagueCode()**: Generate 6-char league join codes
- **getTradesMonthKey()**: Get current month key ("2026-03")
- **DEFAULT_SCORING_RULES**: F1-standard scoring configuration

#### src/lib/scoring.ts
- **computeGpScore()**: Calculate total points for a GP
  - Qualifying points based on position
  - Race points with DNF/DSQ/DNC handling
  - Sprint points (if applicable)
  - Fastest lap bonus
  - Penalty positions deduction
  - Captain multiplier (2x)
  - Prediction bonus points (pole, winner, fastest lap, podium)
- **validateAuctionBid()**: Validates bid amounts with constraints
- **validateTrade()**: Validates trade credit adjustments

#### src/lib/__tests__/scoring.test.ts
- Jest tests for scoring engine
- Tests for:
  - Basic driver points calculation
  - DNF malus application
  - Prediction points (pole, winner, podium)
  - Auction bid validation
  - Trade validation

#### src/lib/supabase/client.ts
- Browser-side Supabase client initialization
- Uses createBrowserClient from @supabase/ssr

#### src/lib/supabase/server.ts
- Server-side Supabase client initialization
- Handles cookie storage for auth persistence
- Used in Server Components and API routes

#### src/lib/supabase/middleware.ts
- Auth session update middleware
- Refreshes Supabase session on each request
- Returns redirect to /login for protected routes without auth

### Documentation

- **README.md**: Full project documentation including:
  - Feature overview
  - Tech stack
  - Getting started guide
  - Database schema overview
  - F1 color theme palette
  - Scoring rules
  - Development roadmap
  
- **PROJECT_STRUCTURE.md**: This file - detailed structure documentation

## Key Features Implemented

### Completed
- Complete TypeScript type definitions
- Tailwind CSS with F1 dark theme
- Scoring calculation engine with tests
- Authentication middleware
- Supabase integration setup
- Next.js 14 App Router configuration
- Homepage landing page

### To Be Implemented
- Authentication pages (login, signup, password reset)
- League creation and management UI
- Auction interface with real-time bidding
- Roster management
- GP selection and prediction forms
- Standings and scoring displays
- Trading interface
- User profiles and settings
- Admin panel for result submission

## Color Theme

### Primary Colors
- **F1 Red**: #E8002D (primary action, accents)
- **F1 Red Dark**: #B30022 (hover states)
- **F1 Black**: #15151E (main background)

### Secondary Colors
- **Black Light**: #1E1E2E (cards, dropdowns)
- **Gray Dark**: #2A2A3A (borders)
- **Gray Mid**: #3A3A4A (hover backgrounds)
- **Gray**: #6B6B7B (secondary text)
- **Gray Light**: #9B9BAB (disabled, subtle)
- **White**: #FFFFFF (primary text)
- **Silver**: #C0C0C0 (accents)

## Dependencies Overview

### Production
- **next**: 14.2.5 - React framework
- **react/react-dom**: ^18 - UI library
- **@supabase/supabase-js**: Database and auth
- **date-fns**: Date manipulation with localization
- **tailwindcss**: Utility-first CSS
- **lucide-react**: Icon library
- **zustand**: State management
- **react-hot-toast**: Notifications
- **zod**: Schema validation
- **clsx/tailwind-merge**: CSS class utilities

### Development
- **typescript**: ^5 - Type safety
- **tailwindcss**: CSS framework
- **jest**: Testing framework
- **@types/***: Type definitions
- **eslint**: Code linting
- **autoprefixer**: CSS vendor prefixes

## Scripts

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Run Jest tests
```

## Next Steps

1. **Authentication**: Create login/signup pages with Supabase Auth
2. **Leagues**: Build league creation and joining flows
3. **Auctions**: Implement real-time auction bidding with WebSockets
4. **Scoring**: Create GP selection and prediction pages
5. **Dashboard**: Build main dashboard with standings and rosters
6. **Admin**: Create result submission interface

## Notes

- All paths use `/sessions/determined-awesome-darwin/mnt/fanta F1/` as root
- Tailwind CSS configured with F1 color palette in theme.extend.colors.f1
- TypeScript strict mode enabled
- Italian locale used for date formatting
- Tests use Jest with ts-jest for TypeScript support
