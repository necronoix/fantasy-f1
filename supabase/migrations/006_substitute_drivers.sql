-- Migration 006: external substitute drivers
--
-- Marks drivers created on-the-fly by the admin as substitutes (e.g. a reserve
-- driver not part of the 22-driver season roster). Substitute drivers:
--   - can appear in GP results and give points to their team (scuderia)
--   - are excluded from the auction, so no player can own them

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS is_substitute BOOLEAN NOT NULL DEFAULT FALSE;
