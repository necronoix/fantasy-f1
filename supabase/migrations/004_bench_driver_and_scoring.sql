-- ============================================================
-- BENCH DRIVER + SCORING RULES UPDATE
-- ============================================================

-- 1. Add bench_driver_id to gp_selections
ALTER TABLE gp_selections ADD COLUMN IF NOT EXISTS bench_driver_id TEXT REFERENCES drivers(id);

-- 2. Update scoring rules for all leagues with new values
UPDATE scoring_rules
SET rules_json = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            rules_json::jsonb,
            '{fastest_lap}', '5'
          ),
          '{dnf}', '-10'
        ),
        '{dsq}', '-15'
      ),
      '{dnc}', '0'
    ),
    '{positions_gained_bonus}', '1'
  ),
  '{predictions}', '{"pole": 5, "winner": 5, "fastest_lap": 3, "safety_car": 3, "podium_each": 2}'
)
WHERE active = TRUE;
