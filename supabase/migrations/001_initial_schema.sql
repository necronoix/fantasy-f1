-- ============================================================
-- Fantasy F1 - Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TEAMS & DRIVERS & GRANDS PRIX (season data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  season_id INTEGER NOT NULL DEFAULT 2026,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FFFFFF'
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY,
  season_id INTEGER NOT NULL DEFAULT 2026,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES public.teams(id),
  number INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.grands_prix (
  id TEXT PRIMARY KEY,
  season_id INTEGER NOT NULL DEFAULT 2026,
  round INTEGER NOT NULL,
  name TEXT NOT NULL,
  circuit TEXT NOT NULL,
  country TEXT NOT NULL,
  date DATE NOT NULL,
  qualifying_date DATE NOT NULL,
  sprint_date DATE,
  has_sprint BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'qualifying', 'race', 'completed'))
);

-- ============================================================
-- LEAGUES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6)),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  season_id INTEGER NOT NULL DEFAULT 2026,
  max_players INTEGER NOT NULL DEFAULT 5 CHECK (max_players BETWEEN 2 AND 5),
  roster_size INTEGER NOT NULL DEFAULT 4,
  budget INTEGER NOT NULL DEFAULT 200,
  settings_json JSONB NOT NULL DEFAULT '{
    "timezone": "Europe/Rome",
    "qualifying_lock_hours": 2,
    "race_lock_hours": 1,
    "bid_timer_seconds": 30,
    "trade_limit_per_month": 1
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEAGUE MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.league_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  credits_total INTEGER NOT NULL DEFAULT 200,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  credits_left INTEGER NOT NULL DEFAULT 200,
  trades_used_month INTEGER NOT NULL DEFAULT 0,
  trades_month_key TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- ============================================================
-- SCORING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  rules_json JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, version)
);

-- ============================================================
-- AUCTION STATE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auction_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('initial', 'mini')),
  target_driver_id TEXT NOT NULL REFERENCES public.drivers(id),
  drop_driver_user_id UUID REFERENCES auth.users(id),
  drop_driver_id TEXT REFERENCES public.drivers(id),
  current_bid INTEGER NOT NULL DEFAULT 1,
  leader_user_id UUID REFERENCES auth.users(id),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed', 'cancelled')),
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BIDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auction_state(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROSTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  driver_id TEXT NOT NULL REFERENCES public.drivers(id),
  purchase_price INTEGER NOT NULL DEFAULT 0,
  acquired_via TEXT NOT NULL DEFAULT 'initial_auction' CHECK (acquired_via IN ('initial_auction', 'mini_auction', 'trade')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, user_id, driver_id)
);

-- ============================================================
-- GP SELECTIONS (captain + predictions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gp_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  gp_id TEXT NOT NULL REFERENCES public.grands_prix(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  captain_driver_id TEXT REFERENCES public.drivers(id),
  predictions_json JSONB NOT NULL DEFAULT '{}',
  locked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, gp_id, user_id)
);

-- ============================================================
-- GP RESULTS (admin input)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gp_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  gp_id TEXT NOT NULL REFERENCES public.grands_prix(id),
  results_json JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, gp_id)
);

-- ============================================================
-- GP SCORES (computed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gp_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  gp_id TEXT NOT NULL REFERENCES public.grands_prix(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total_points INTEGER NOT NULL DEFAULT 0,
  breakdown_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, gp_id, user_id)
);

-- ============================================================
-- TRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  proposer_user_id UUID NOT NULL REFERENCES auth.users(id),
  accepter_user_id UUID NOT NULL REFERENCES auth.users(id),
  offer_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_league_members_league ON public.league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON public.league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_rosters_league_user ON public.rosters(league_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_gp_scores_league ON public.gp_scores(league_id);
CREATE INDEX IF NOT EXISTS idx_trades_league ON public.trades(league_id);
CREATE INDEX IF NOT EXISTS idx_auction_state_league ON public.auction_state(league_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_league ON public.audit_log(league_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grands_prix ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of league
CREATE OR REPLACE FUNCTION public.is_league_member(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = p_league_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if user is admin of league
CREATE OR REPLACE FUNCTION public.is_league_admin(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = p_league_id AND user_id = p_user_id AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Users can view any profile" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- SEASON DATA (public read)
CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Anyone can read drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Anyone can read gps" ON public.grands_prix FOR SELECT USING (true);

-- LEAGUES
CREATE POLICY "Members can view their league" ON public.leagues FOR SELECT
  USING (public.is_league_member(id, auth.uid()));
CREATE POLICY "Authenticated users can create leagues" ON public.leagues FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Admins can update league" ON public.leagues FOR UPDATE
  USING (public.is_league_admin(id, auth.uid()));

-- LEAGUE MEMBERS
CREATE POLICY "Members can view league members" ON public.league_members FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Users can join leagues" ON public.league_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins or self can update members" ON public.league_members FOR UPDATE
  USING (public.is_league_admin(league_id, auth.uid()) OR auth.uid() = user_id);

-- SCORING RULES
CREATE POLICY "Members can view scoring rules" ON public.scoring_rules FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Admins can manage scoring rules" ON public.scoring_rules FOR ALL
  USING (public.is_league_admin(league_id, auth.uid()));

-- AUCTION STATE
CREATE POLICY "Members can view auctions" ON public.auction_state FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Admins can create auctions" ON public.auction_state FOR INSERT
  WITH CHECK (public.is_league_admin(league_id, auth.uid()));
CREATE POLICY "Members can update auctions" ON public.auction_state FOR UPDATE
  USING (public.is_league_member(league_id, auth.uid()));

-- BIDS
CREATE POLICY "Members can view bids" ON public.bids FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Members can place bids" ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_league_member(league_id, auth.uid()));

-- ROSTERS
CREATE POLICY "Members can view rosters" ON public.rosters FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Members can manage rosters" ON public.rosters FOR ALL
  USING (public.is_league_member(league_id, auth.uid()));

-- GP SELECTIONS
CREATE POLICY "Members can view selections" ON public.gp_selections FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Users can manage own selections" ON public.gp_selections FOR ALL
  USING (auth.uid() = user_id AND public.is_league_member(league_id, auth.uid()));

-- GP RESULTS
CREATE POLICY "Members can view results" ON public.gp_results FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Admins can submit results" ON public.gp_results FOR ALL
  USING (public.is_league_admin(league_id, auth.uid()));

-- GP SCORES
CREATE POLICY "Members can view scores" ON public.gp_scores FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Members can write scores" ON public.gp_scores FOR ALL
  USING (public.is_league_member(league_id, auth.uid()));

-- TRADES
CREATE POLICY "Members can view trades" ON public.trades FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Members can propose trades" ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = proposer_user_id AND public.is_league_member(league_id, auth.uid()));
CREATE POLICY "Trade participants can update" ON public.trades FOR UPDATE
  USING (auth.uid() IN (proposer_user_id, accepter_user_id));

-- AUDIT LOG
CREATE POLICY "Members can view audit log" ON public.audit_log FOR SELECT
  USING (public.is_league_member(league_id, auth.uid()));
CREATE POLICY "System can write audit log" ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
