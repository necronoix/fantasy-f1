-- ============================================================
-- TEAM AUCTION SUPPORT + DEADLINE + SPRINT REMOVAL
-- ============================================================

-- 1. Remove sprint from all GPs
UPDATE grands_prix SET has_sprint = FALSE, sprint_date = NULL WHERE has_sprint = TRUE;

-- 2. Update bid timer to 20s for existing leagues
UPDATE leagues SET settings_json = jsonb_set(settings_json, '{bid_timer_seconds}', '20')
WHERE (settings_json->>'bid_timer_seconds')::int = 10;

-- 3. Add qualifying_datetime for deadline system
ALTER TABLE grands_prix ADD COLUMN IF NOT EXISTS qualifying_datetime TIMESTAMPTZ;
-- Default: use qualifying_date + 15:00 CET for existing GPs
UPDATE grands_prix
SET qualifying_datetime = (qualifying_date || 'T15:00:00+01:00')::timestamptz
WHERE qualifying_datetime IS NULL AND qualifying_date IS NOT NULL;

-- 4. Make target_driver_id nullable (needed for team auctions)
ALTER TABLE auction_state ALTER COLUMN target_driver_id DROP NOT NULL;

-- 5. Add target_team_id to auction_state
ALTER TABLE auction_state ADD COLUMN IF NOT EXISTS target_team_id TEXT REFERENCES teams(id);

-- 6. Update type constraint to include team auctions
ALTER TABLE auction_state DROP CONSTRAINT IF EXISTS auction_state_type_check;
ALTER TABLE auction_state ADD CONSTRAINT auction_state_type_check
  CHECK (type IN ('initial', 'mini', 'team'));

-- 7. Add team_id to rosters (nullable, for team ownership)
ALTER TABLE rosters ALTER COLUMN driver_id DROP NOT NULL;
ALTER TABLE rosters ADD COLUMN IF NOT EXISTS team_id TEXT REFERENCES teams(id);

-- 8. Ensure each player has max 1 team per league
CREATE UNIQUE INDEX IF NOT EXISTS idx_rosters_team_unique
  ON rosters(league_id, user_id, team_id) WHERE team_id IS NOT NULL;

-- 9. Update acquired_via to include team_auction
ALTER TABLE rosters DROP CONSTRAINT IF EXISTS rosters_acquired_via_check;
ALTER TABLE rosters ADD CONSTRAINT rosters_acquired_via_check
  CHECK (acquired_via IN ('initial_auction', 'mini_auction', 'trade', 'team_auction'));

-- 10. Enable realtime for auction_state (already enabled, but ensure)
ALTER PUBLICATION supabase_realtime ADD TABLE auction_state;
