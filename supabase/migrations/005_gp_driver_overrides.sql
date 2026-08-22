-- Migration 005: per-GP driver overrides (temporary team reassignments & substitutions)
--
-- Allows admin to record:
--   temp_team_id      = the team this driver actually raced for this GP (reassignment)
--   substitute_driver_id = the driver who filled this driver's seat in their normal team
-- Either field can be null independently.

CREATE TABLE IF NOT EXISTS public.gp_driver_overrides (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id            UUID    NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  gp_id                TEXT    NOT NULL REFERENCES public.grands_prix(id) ON DELETE CASCADE,
  driver_id            TEXT    NOT NULL REFERENCES public.drivers(id),
  temp_team_id         TEXT    REFERENCES public.teams(id),          -- null = driver absent (no team this GP)
  substitute_driver_id TEXT    REFERENCES public.drivers(id),        -- who sits in driver_id's normal seat
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(league_id, gp_id, driver_id)
);

-- League members can read overrides (needed to display them in the UI)
ALTER TABLE public.gp_driver_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_members_read_overrides"
  ON public.gp_driver_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = gp_driver_overrides.league_id
        AND lm.user_id   = auth.uid()
    )
  );

-- Only league admin can insert/update/delete
CREATE POLICY "league_admin_manage_overrides"
  ON public.gp_driver_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = gp_driver_overrides.league_id
        AND lm.user_id   = auth.uid()
        AND lm.role      = 'admin'
    )
  );
