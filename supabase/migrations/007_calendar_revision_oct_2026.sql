-- Migration 007: 2026 calendar revision (October 2026)
--
-- Source: official calendar on Jolpica (api.jolpi.ca) and OpenF1 session times.
--   - Bahrain GP, cancelled in April, rescheduled as "Bahrain Grand Prix in
--     Malaysia" at Sepang on 4 October (qualifying 3 Oct 08:00 UTC).
--   - Sao Paulo GP moved to 8 November, Las Vegas GP is 22 November (UTC).
--   - qualifying_datetime set to the official session start for upcoming GPs
--     (migration 003 had a 15:00 CET placeholder), so prediction locks are right.
--   - Rounds renumbered in chronological order; cancelled Saudi Arabia keeps its
--     April slot.

UPDATE public.grands_prix SET
  name = 'Bahrain Grand Prix in Malaysia',
  circuit = 'Sepang International Circuit',
  country = 'Malaysia',
  date = '2026-10-04',
  qualifying_date = '2026-10-03',
  qualifying_datetime = '2026-10-03T08:00:00Z',
  sprint_date = NULL,
  has_sprint = FALSE,
  status = 'upcoming'
WHERE id = 'bhr_2026';

UPDATE public.grands_prix SET date = '2026-11-08', qualifying_date = '2026-11-07'
WHERE id = 'bra_2026';

UPDATE public.grands_prix SET date = '2026-11-22', qualifying_date = '2026-11-21'
WHERE id = 'lv_2026';

UPDATE public.grands_prix g SET qualifying_datetime = v.q::timestamptz
FROM (VALUES
  ('sin_2026', '2026-10-10T13:00:00Z'),
  ('usa_2026', '2026-10-24T21:00:00Z'),
  ('mex_2026', '2026-10-31T21:00:00Z'),
  ('bra_2026', '2026-11-07T18:00:00Z'),
  ('lv_2026',  '2026-11-21T04:00:00Z'),
  ('qat_2026', '2026-11-28T18:00:00Z'),
  ('abu_2026', '2026-12-05T14:00:00Z')
) AS v(id, q)
WHERE g.id = v.id;

UPDATE public.grands_prix g SET round = v.r
FROM (VALUES
  ('aus_2026', 1),  ('chn_2026', 2),  ('jpn_2026', 3),  ('ksa_2026', 4),
  ('mia_2026', 5),  ('can_2026', 6),  ('mon_2026', 7),  ('esp_2026', 8),
  ('aut_2026', 9),  ('gbr_2026', 10), ('bel_2026', 11), ('hun_2026', 12),
  ('ned_2026', 13), ('ita_2026', 14), ('mad_2026', 15), ('aze_2026', 16),
  ('bhr_2026', 17), ('sin_2026', 18), ('usa_2026', 19), ('mex_2026', 20),
  ('bra_2026', 21), ('lv_2026',  22), ('qat_2026', 23), ('abu_2026', 24)
) AS v(id, r)
WHERE g.id = v.id;

-- Bahrain was permanently locked as "cancelled" in league settings: unlock it
-- everywhere and drop any stale April deadline.
UPDATE public.leagues SET settings_json = jsonb_set(
  settings_json #- '{permanently_locked_gps,bhr_2026}' #- '{gp_deadlines,bhr_2026}',
  '{locked_gp_ids}',
  COALESCE(
    (SELECT jsonb_agg(x) FROM jsonb_array_elements(settings_json->'locked_gp_ids') AS x
     WHERE x <> '"bhr_2026"'::jsonb),
    '[]'::jsonb
  )
);
