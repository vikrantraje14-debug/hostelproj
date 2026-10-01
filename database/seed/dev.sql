INSERT INTO hostels (
  id,
  code,
  name,
  description,
  address,
  capacity,
  is_demo
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'DEMO-HOSTEL-001',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Example Hostel',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Example description only.',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: No address supplied.',
  NULL,
  true
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO facilities (id, code, name, description, is_demo)
VALUES
  (
    '00000000-0000-4000-8000-000000000011',
    'DEMO-FACILITY-001',
    'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Example facility A',
    'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: No facility details supplied.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    'DEMO-FACILITY-002',
    'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Example facility B',
    'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: No facility details supplied.',
    true
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO hostel_facilities (hostel_id, facility_id)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000012'
  )
ON CONFLICT (hostel_id, facility_id) DO NOTHING;

INSERT INTO notices (
  id,
  title,
  body,
  status,
  is_demo
)
VALUES (
  '00000000-0000-4000-8000-000000000021',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Example notice',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: No notice was supplied.',
  'draft',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rules (
  id,
  rule_code,
  title,
  body,
  status,
  is_demo
)
VALUES (
  '00000000-0000-4000-8000-000000000031',
  'DEMO-RULE-001',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Example rule',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: No approved rules were supplied.',
  'draft',
  true
)
ON CONFLICT (rule_code) DO NOTHING;

INSERT INTO important_dates (
  id,
  admission_year,
  event_code,
  title,
  description,
  status,
  is_demo
)
VALUES (
  '00000000-0000-4000-8000-000000000041',
  2099,
  'DEMO-DATE-001',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: No date supplied',
  'DEMO DATA — NOT OFFICIAL GOVERNMENT DATA: Start and end dates are intentionally blank.',
  'draft',
  true
)
ON CONFLICT (admission_year, event_code) DO NOTHING;