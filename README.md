# 🏎️ Fantasy F1 — Asta & Lega

Web app Fantasy Formula 1 con sistema asta live per leghe private.
**Stagione 2026 · 11 team · 22 piloti · 24 GP**

## Stack Tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database + Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Hosting | Vercel (free tier) |
| Stile | Tailwind CSS (tema F1 dark) |

## Funzionalità

- ✅ **Autenticazione** via Supabase Auth
- ✅ **Creazione lega** con codice invito
- ✅ **Asta live** con timer realtime (Supabase Realtime)
- ✅ **Rosa 4 piloti** con budget 200 crediti
- ✅ **Capitano x2** e pronostici extra
- ✅ **Mini-asta** per mercato di metà stagione
- ✅ **Scambi** (1 al mese per giocatore) con conguaglio crediti
- ✅ **Inserimento risultati GP** (admin) con calcolo punteggi automatico
- ✅ **Classifica** generale e per GP
- ✅ **Log attività** audit completo

---

## 🚀 Deploy: Guida Completa

### Step 1 — Crea account gratuiti

1. **Supabase**: [app.supabase.com](https://app.supabase.com) → Sign up
2. **Vercel**: [vercel.com](https://vercel.com) → Sign up (con GitHub)

---

### Step 2 — Configura Supabase

#### 2a. Crea un nuovo progetto

1. In Supabase Dashboard → **New project**
2. Scegli nome (es. `fantasy-f1`), password DB, regione (Europe West)
3. Attendi ~2 minuti per la creazione

#### 2b. Copia le credenziali

1. Vai in **Project Settings** → **API**
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(tienila segreta!)*

#### 2c. Esegui le migrazioni SQL

1. Vai in **SQL Editor** nel menu laterale
2. Apri il file `supabase/migrations/001_initial_schema.sql`
3. Copia tutto il contenuto nel SQL Editor → **Run**
4. Apri `supabase/migrations/002_seed_f1_2026.sql`
5. Copia nel SQL Editor → **Run**

Dovresti vedere le tabelle create in **Table Editor**.

#### 2d. Abilita Email Auth

1. **Authentication** → **Providers** → **Email** → Enable
2. Per sviluppo locale: **Authentication** → **Settings** → disabilita "Confirm email"
3. Per produzione: configura il mailer SMTP (Settings → Auth → SMTP)

---

### Step 3 — Deploy su Vercel

#### 3a. Carica il codice su GitHub

```bash
cd "/path/to/fanta F1"
git init
git add .
git commit -m "Initial Fantasy F1 commit"
# Crea repo su GitHub e poi:
git remote add origin https://github.com/TUO_UTENTE/fantasy-f1.git
git push -u origin main
```

#### 3b. Import su Vercel

1. [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → seleziona il tuo repo
3. Framework: **Next.js** (autodetect)
4. **Environment Variables** — aggiungi:

```
NEXT_PUBLIC_SUPABASE_URL    = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL         = https://tuo-progetto.vercel.app
```

5. Click **Deploy** — attendi ~2 minuti
6. Il tuo link pubblico sarà `https://tuo-progetto.vercel.app`

---

### Step 4 — Primo avvio

1. Vai sul link Vercel
2. **Registrati** con email + password
3. **Crea una lega** con un nome
4. **Condividi il codice** (6 lettere) con gli altri giocatori (max 5)
5. Quando tutti sono entrati → **Avvia l'asta** dal pannello Asta (admin)

---

## 🏗️ Sviluppo Locale

```bash
# 1. Installa dipendenze
npm install

# 2. Copia env vars
cp .env.example .env.local
# Modifica .env.local con le tue credenziali Supabase

# 3. Avvia dev server
npm run dev
# → http://localhost:3000

# 4. Esegui test
npm test
```

---

## 📁 Struttura del Progetto

```
src/
├── app/
│   ├── (auth)/              # Login + Signup
│   ├── (app)/               # App autenticata
│   │   ├── dashboard/       # Home utente
│   │   ├── create-league/   # Crea lega
│   │   ├── join-league/     # Entra in lega
│   │   └── league/[id]/
│   │       ├── page.tsx     # Overview lega
│   │       ├── auction/     # Asta live (realtime)
│   │       ├── roster/      # Rose piloti
│   │       ├── gp/[gpId]/   # GP: capitano + pronostici
│   │       ├── standings/   # Classifica
│   │       ├── trades/      # Scambi
│   │       └── admin/       # Pannello admin
│   └── actions/             # Server Actions
│       ├── auth.ts          # Login/signup
│       ├── league.ts        # CRUD leghe
│       ├── auction.ts       # Aste (initial + mini)
│       ├── gp.ts            # Selezioni + risultati + punteggi
│       └── trades.ts        # Scambi tra giocatori
├── components/
│   ├── ui/                  # Navbar, Button, Card, Badge, Input
│   ├── auction/             # AuctionRoom (realtime), AdminDriverPicker
│   └── league/              # CopyCode, GpSelectionForm, TradeProposalForm
├── lib/
│   ├── types.ts             # TypeScript types
│   ├── utils.ts             # Utilities + scoring config
│   ├── scoring.ts           # Motore punteggio
│   ├── __tests__/           # Jest tests
│   └── supabase/            # Client, server, middleware
supabase/
└── migrations/
    ├── 001_initial_schema.sql  # 14 tabelle + RLS policies
    └── 002_seed_f1_2026.sql    # 11 team, 22 piloti, 24 GP
```

---

## 🎮 Come si gioca

### Fase 1 — Asta Iniziale
- L'admin seleziona un pilota → parte il timer (30s default)
- Tutti i giocatori fanno offerte in tempo reale
- Chi offre di più vince il pilota e paga i crediti
- Si ripete finché tutti hanno 4 piloti

### Fase 2 — Stagione
Per ogni GP:
1. **Scegli il capitano** (i suoi punti vengono raddoppiati)
2. **Inserisci i pronostici** (pole, vincitore, giro veloce, safety car)
3. **L'admin inserisce i risultati** → i punteggi vengono calcolati automaticamente

### Fase 3 — Mercato
- Un giocatore può avviare una **mini-asta** per acquistare un pilota libero
- Deve indicare quale pilota "rilascia" in cambio
- La mini-asta funziona come quella iniziale
- Max **1 scambio diretto** al mese tra giocatori

### Punteggi Default

| Qualifica P1-10 | 10-9-8-7-6-5-4-3-2-1 pt |
|-----------------|--------------------------|
| Gara P1-10 | 25-18-15-12-10-8-6-4-2-1 pt |
| Giro veloce | +2 pt |
| DNF | -5 pt |
| DSQ | -10 pt |
| Sprint P1-8 | 8-7-6-5-4-3-2-1 pt |
| Capitano | ×2 tutti i punti |
| Pole esatta | +5 pt |
| Vincitore esatto | +5 pt |

---

## 🔧 Configurazioni Avanzate

Modifica le regole di punteggio direttamente in DB:
```sql
UPDATE scoring_rules
SET rules_json = '{"qualifying":{"1":10,...},...}'
WHERE league_id = 'YOUR-LEAGUE-ID' AND active = true;
```

---

*Fantasy F1 non è affiliato a Formula 1 o FIA.*
