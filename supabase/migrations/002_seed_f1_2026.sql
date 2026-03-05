-- ============================================================
-- F1 2026 SEED DATA
-- Season: 2026 | Teams: 11 | Drivers: 22 | GPs: 24
-- Sprint races: China, Miami, Canada, Great Britain, Netherlands, Singapore
-- ============================================================

-- TEAMS
INSERT INTO public.teams (id, season_id, name, short_name, color) VALUES
('mclaren_2026',     2026, 'McLaren',          'MCL', '#FF8000'),
('ferrari_2026',     2026, 'Ferrari',           'FER', '#E8002D'),
('mercedes_2026',    2026, 'Mercedes',          'MER', '#27F4D2'),
('redbull_2026',     2026, 'Red Bull Racing',   'RBR', '#3671C6'),
('racingbulls_2026', 2026, 'Racing Bulls',      'RB',  '#6692FF'),
('astonmartin_2026', 2026, 'Aston Martin',      'AMR', '#358C75'),
('williams_2026',    2026, 'Williams',          'WIL', '#64C4FF'),
('alpine_2026',      2026, 'Alpine',            'ALP', '#0090FF'),
('haas_2026',        2026, 'Haas F1 Team',      'HAS', '#B6BABD'),
('audi_2026',        2026, 'Audi',              'AUD', '#C5000A'),
('cadillac_2026',    2026, 'Cadillac',          'CAD', '#3D3D3D')
ON CONFLICT (id) DO NOTHING;

-- DRIVERS (22 drivers)
INSERT INTO public.drivers (id, season_id, name, short_name, team_id, number, active) VALUES
-- McLaren
('NOR', 2026, 'Lando Norris',      'NOR', 'mclaren_2026',     4,  true),
('PIA', 2026, 'Oscar Piastri',     'PIA', 'mclaren_2026',    81,  true),
-- Ferrari
('HAM', 2026, 'Lewis Hamilton',    'HAM', 'ferrari_2026',    44,  true),
('LEC', 2026, 'Charles Leclerc',   'LEC', 'ferrari_2026',    16,  true),
-- Mercedes
('RUS', 2026, 'George Russell',    'RUS', 'mercedes_2026',   63,  true),
('ANT', 2026, 'Kimi Antonelli',    'ANT', 'mercedes_2026',   12,  true),
-- Red Bull
('VER', 2026, 'Max Verstappen',    'VER', 'redbull_2026',     1,  true),
('HAD', 2026, 'Isack Hadjar',      'HAD', 'redbull_2026',     6,  true),
-- Racing Bulls
('LAW', 2026, 'Liam Lawson',       'LAW', 'racingbulls_2026',30,  true),
('LIN', 2026, 'Arvid Lindblad',    'LIN', 'racingbulls_2026', 7,  true),
-- Aston Martin
('ALO', 2026, 'Fernando Alonso',   'ALO', 'astonmartin_2026',14,  true),
('STR', 2026, 'Lance Stroll',      'STR', 'astonmartin_2026',18,  true),
-- Williams
('ALB', 2026, 'Alexander Albon',   'ALB', 'williams_2026',   23,  true),
('SAI', 2026, 'Carlos Sainz',      'SAI', 'williams_2026',   55,  true),
-- Alpine
('GAS', 2026, 'Pierre Gasly',      'GAS', 'alpine_2026',     10,  true),
('COL', 2026, 'Franco Colapinto',  'COL', 'alpine_2026',     43,  true),
-- Haas
('OCO', 2026, 'Esteban Ocon',      'OCO', 'haas_2026',       31,  true),
('BEA', 2026, 'Oliver Bearman',    'BEA', 'haas_2026',       87,  true),
-- Audi
('HUL', 2026, 'Nico Hulkenberg',   'HUL', 'audi_2026',       27,  true),
('BOR', 2026, 'Gabriel Bortoleto', 'BOR', 'audi_2026',        5,  true),
-- Cadillac (new team)
('PER', 2026, 'Sergio Perez',      'PER', 'cadillac_2026',   11,  true),
('BOT', 2026, 'Valtteri Bottas',   'BOT', 'cadillac_2026',   77,  true)
ON CONFLICT (id) DO NOTHING;

-- GRANDS PRIX 2026 (24 rounds)
-- Sprint races: China(R2), Miami(R6), Canada(R7), Great Britain(R11), Netherlands(R14), Singapore(R18)
INSERT INTO public.grands_prix (id, season_id, round, name, circuit, country, date, qualifying_date, sprint_date, has_sprint, status) VALUES
('aus_2026', 2026,  1, 'Australian Grand Prix',    'Albert Park Circuit',                'Australia',   '2026-03-08', '2026-03-07', NULL,         false, 'upcoming'),
('chn_2026', 2026,  2, 'Chinese Grand Prix',       'Shanghai International Circuit',     'China',       '2026-03-15', '2026-03-14', '2026-03-14', true,  'upcoming'),
('jpn_2026', 2026,  3, 'Japanese Grand Prix',      'Suzuka Circuit',                     'Japan',       '2026-03-29', '2026-03-28', NULL,         false, 'upcoming'),
('bhr_2026', 2026,  4, 'Bahrain Grand Prix',       'Bahrain International Circuit',      'Bahrain',     '2026-04-12', '2026-04-11', NULL,         false, 'upcoming'),
('ksa_2026', 2026,  5, 'Saudi Arabian Grand Prix', 'Jeddah Corniche Circuit',            'Saudi Arabia','2026-04-19', '2026-04-18', NULL,         false, 'upcoming'),
('mia_2026', 2026,  6, 'Miami Grand Prix',         'Miami International Autodrome',      'USA',         '2026-05-03', '2026-05-02', '2026-05-02', true,  'upcoming'),
('can_2026', 2026,  7, 'Canadian Grand Prix',      'Circuit Gilles Villeneuve',          'Canada',      '2026-05-24', '2026-05-23', '2026-05-23', true,  'upcoming'),
('mon_2026', 2026,  8, 'Monaco Grand Prix',        'Circuit de Monaco',                  'Monaco',      '2026-06-07', '2026-06-06', NULL,         false, 'upcoming'),
('esp_2026', 2026,  9, 'Spanish Grand Prix',       'Circuit de Barcelona-Catalunya',     'Spain',       '2026-06-14', '2026-06-13', NULL,         false, 'upcoming'),
('aut_2026', 2026, 10, 'Austrian Grand Prix',      'Red Bull Ring',                      'Austria',     '2026-06-28', '2026-06-27', NULL,         false, 'upcoming'),
('gbr_2026', 2026, 11, 'British Grand Prix',       'Silverstone Circuit',                'Great Britain','2026-07-05', '2026-07-04', '2026-07-04', true,  'upcoming'),
('bel_2026', 2026, 12, 'Belgian Grand Prix',       'Circuit de Spa-Francorchamps',       'Belgium',     '2026-07-19', '2026-07-18', NULL,         false, 'upcoming'),
('hun_2026', 2026, 13, 'Hungarian Grand Prix',     'Hungaroring',                        'Hungary',     '2026-07-26', '2026-07-25', NULL,         false, 'upcoming'),
('ned_2026', 2026, 14, 'Dutch Grand Prix',         'Circuit Zandvoort',                  'Netherlands', '2026-08-23', '2026-08-22', '2026-08-22', true,  'upcoming'),
('ita_2026', 2026, 15, 'Italian Grand Prix',       'Autodromo Nazionale Monza',          'Italy',       '2026-09-06', '2026-09-05', NULL,         false, 'upcoming'),
('mad_2026', 2026, 16, 'Madrid Grand Prix',        'Madrid Street Circuit',              'Spain',       '2026-09-13', '2026-09-12', NULL,         false, 'upcoming'),
('aze_2026', 2026, 17, 'Azerbaijan Grand Prix',    'Baku City Circuit',                  'Azerbaijan',  '2026-09-26', '2026-09-25', NULL,         false, 'upcoming'),
('sin_2026', 2026, 18, 'Singapore Grand Prix',     'Marina Bay Street Circuit',          'Singapore',   '2026-10-11', '2026-10-10', '2026-10-10', true,  'upcoming'),
('usa_2026', 2026, 19, 'United States Grand Prix', 'Circuit of The Americas',            'USA',         '2026-10-25', '2026-10-24', NULL,         false, 'upcoming'),
('mex_2026', 2026, 20, 'Mexico City Grand Prix',   'Autodromo Hermanos Rodriguez',       'Mexico',      '2026-11-01', '2026-10-31', NULL,         false, 'upcoming'),
('bra_2026', 2026, 21, 'Sao Paulo Grand Prix',     'Autodromo Jose Carlos Pace',         'Brazil',      '2026-11-15', '2026-11-14', NULL,         false, 'upcoming'),
('lv_2026',  2026, 22, 'Las Vegas Grand Prix',     'Las Vegas Strip Circuit',            'USA',         '2026-11-21', '2026-11-20', NULL,         false, 'upcoming'),
('qat_2026', 2026, 23, 'Qatar Grand Prix',         'Lusail International Circuit',       'Qatar',       '2026-11-29', '2026-11-28', NULL,         false, 'upcoming'),
('abu_2026', 2026, 24, 'Abu Dhabi Grand Prix',     'Yas Marina Circuit',                 'UAE',         '2026-12-06', '2026-12-05', NULL,         false, 'upcoming')
ON CONFLICT (id) DO NOTHING;
