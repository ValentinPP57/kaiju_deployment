INSERT INTO city_state (id, disaster_level, retention_rate)
VALUES (1, 1, 0.300)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quarters (code, name, disaster_level, sea_access, is_hub) VALUES
('A', 'Apex', 1, false, false),
('E', 'Echo', 1, true, false),
('W', 'Warden', 1, false, false),
('X', 'Xeno', 1, true, true),
('Z', 'Zion', 1, true, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO quarter_adjacency (quarter_id, neighbor_id)
SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'A' AND q2.code = 'E'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'E' AND q2.code = 'A'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'A' AND q2.code = 'W'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'W' AND q2.code = 'A'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'A' AND q2.code = 'X'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'X' AND q2.code = 'A'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'E' AND q2.code = 'X'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'X' AND q2.code = 'E'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'W' AND q2.code = 'X'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'X' AND q2.code = 'W'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'W' AND q2.code = 'Z'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'Z' AND q2.code = 'W'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'X' AND q2.code = 'Z'
UNION ALL SELECT q1.id, q2.id FROM quarters q1, quarters q2 WHERE q1.code = 'Z' AND q2.code = 'X'
ON CONFLICT DO NOTHING;

INSERT INTO resource_types (code, name) VALUES
('MED', 'Medical personnel'),
('REC', 'Rescue teams'),
('TRN', 'Transport vehicles'),
('SHL', 'Emergency shelters'),
('FOD', 'Food & water supplies'),
('COM', 'Communication equipment'),
('PWR', 'Power generators'),
('ENG', 'Engineering crews'),
('SEC', 'Security units'),
('HAZ', 'Hazmat equipment')
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventories (quarter_id, resource_type_id, initial_quantity, current_quantity)
SELECT q.id, r.id, vals.qty, vals.qty
FROM (VALUES
    ('A', 'MED', 12), ('A', 'REC', 4), ('A', 'TRN', 6), ('A', 'SHL', 8), ('A', 'FOD', 5),
    ('A', 'COM', 3),  ('A', 'PWR', 7), ('A', 'ENG', 2), ('A', 'SEC', 9), ('A', 'HAZ', 3),
    ('E', 'MED', 5),  ('E', 'REC', 9), ('E', 'TRN', 3), ('E', 'SHL', 6), ('E', 'FOD', 8),
    ('E', 'COM', 7),  ('E', 'PWR', 2), ('E', 'ENG', 6), ('E', 'SEC', 4), ('E', 'HAZ', 5),
    ('W', 'MED', 8),  ('W', 'REC', 3), ('W', 'TRN', 10),('W', 'SHL', 4), ('W', 'FOD', 6),
    ('W', 'COM', 5),  ('W', 'PWR', 9), ('W', 'ENG', 7), ('W', 'SEC', 2), ('W', 'HAZ', 4),
    ('X', 'MED', 3),  ('X', 'REC', 6), ('X', 'TRN', 4), ('X', 'SHL', 10),('X', 'FOD', 7),
    ('X', 'COM', 8),  ('X', 'PWR', 5), ('X', 'ENG', 4), ('X', 'SEC', 6), ('X', 'HAZ', 2),
    ('Z', 'MED', 7),  ('Z', 'REC', 5), ('Z', 'TRN', 7), ('Z', 'SHL', 2), ('Z', 'FOD', 9),
    ('Z', 'COM', 4),  ('Z', 'PWR', 6), ('Z', 'ENG', 8), ('Z', 'SEC', 3), ('Z', 'HAZ', 10)
) AS vals(q_code, r_code, qty)
JOIN quarters q ON q.code = vals.q_code
JOIN resource_types r ON r.code = vals.r_code
ON CONFLICT (quarter_id, resource_type_id) DO NOTHING;

INSERT INTO permissions (disaster_level, action, role) VALUES
(1, 'view_resources', 'QC'), (1, 'view_resources', 'LC'), (1, 'view_resources', 'CD'),
(2, 'view_resources', 'QC'), (2, 'view_resources', 'LC'), (2, 'view_resources', 'CD'),
(2, 'reserve_own_quarter', 'QC'),
(3, 'view_resources', 'QC'), (3, 'view_resources', 'LC'), (3, 'view_resources', 'CD'),
(3, 'reserve_own_quarter', 'QC'),
(3, 'request_adjacent_transfer', 'QC'), (3, 'request_adjacent_transfer', 'CD'),
(4, 'view_resources', 'QC'), (4, 'view_resources', 'LC'), (4, 'view_resources', 'CD'),
(4, 'reserve_own_quarter', 'QC'),
(4, 'request_adjacent_transfer', 'QC'), (4, 'request_adjacent_transfer', 'CD'),
(4, 'organize_transit', 'LC'),
(4, 'requisition', 'CD'),
(5, 'view_resources', 'QC'), (5, 'view_resources', 'LC'), (5, 'view_resources', 'CD'),
(5, 'reserve_own_quarter', 'QC'),
(5, 'request_adjacent_transfer', 'QC'), (5, 'request_adjacent_transfer', 'LC'), (5, 'request_adjacent_transfer', 'CD'),
(5, 'organize_transit', 'LC'), (5, 'organize_transit', 'CD'),
(5, 'requisition', 'CD'),
(5, 'lower_retention', 'CD')
ON CONFLICT (disaster_level, action, role) DO NOTHING;