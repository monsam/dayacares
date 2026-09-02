USE dayacares;

INSERT IGNORE INTO users (
  user_id, username, cognito_sub, full_name, email, phone_number, role, device_tokens, created_at
) VALUES
  (
    'user-priya',
    'caregiver',
    'demo:caregiver',
    'Priya Sen',
    'priya.sen@dayacares.demo',
    '+919830100001',
    'WORKER',
    JSON_ARRAY(),
    '2026-01-15 09:00:00.000'
  ),
  (
    'user-arjun',
    'family',
    'demo:family',
    'Arjun Banerjee',
    'arjun.banerjee@dayacares.demo',
    '+919830100002',
    'FAMILY',
    JSON_ARRAY(),
    '2026-01-15 09:00:00.000'
  ),
  (
    'user-anjali',
    'customer',
    'demo:customer',
    'Anjali Banerjee',
    'anjali.banerjee@dayacares.demo',
    '+919830100003',
    'CUSTOMER',
    JSON_ARRAY(),
    '2026-01-15 09:00:00.000'
  ),
  (
    'user-admin',
    'admin',
    'demo:admin',
    'Centre Manager',
    'centre@dayacares.demo',
    '+919830100004',
    'ADMIN',
    JSON_ARRAY(),
    '2026-01-15 09:00:00.000'
  ),
  (
    'user-ramesh',
    'ramesh',
    'demo:ramesh',
    'Ramesh Mukherjee',
    'ramesh.mukherjee@dayacares.demo',
    '+919830100005',
    'CUSTOMER',
    JSON_ARRAY(),
    '2026-01-20 09:00:00.000'
  ),
  (
    'user-meera',
    'meera',
    'demo:meera',
    'Meera Bose',
    'meera.bose@dayacares.demo',
    '+919830100006',
    'CUSTOMER',
    JSON_ARRAY(),
    '2026-01-22 09:00:00.000'
  ),
  (
    'user-rahul',
    'rahul',
    'demo:rahul',
    'Rahul Dey',
    'rahul.dey@dayacares.demo',
    '+919830100007',
    'WORKER',
    JSON_ARRAY(),
    '2026-01-15 09:00:00.000'
  );

INSERT IGNORE INTO customer_profiles (
  customer_id, user_id, address_durgapur, plan, emergency_contacts, medical_history, subscription_status
) VALUES
  (
    'demo-customer',
    'user-anjali',
    'Bidhannagar, Durgapur · Ward 14',
    'Enhanced',
    JSON_ARRAY(
      JSON_OBJECT('name', 'Arjun Banerjee', 'relationship', 'Son', 'phone', '+919830100002')
    ),
    JSON_OBJECT(
      'preexisting_conditions', JSON_ARRAY('Hypertension'),
      'blood_group', 'B+',
      'primary_physician', 'Dr. Roy',
      'notes', 'Prefers morning visits.'
    ),
    'ACTIVE'
  ),
  (
    'demo-customer-2',
    'user-ramesh',
    'City Centre, Durgapur · Ward 21',
    'Comprehensive',
    JSON_ARRAY(
      JSON_OBJECT('name', 'DAYA Helpline', 'relationship', 'Ops', 'phone', '+913432400000')
    ),
    JSON_OBJECT(
      'preexisting_conditions', JSON_ARRAY('Type 2 diabetes'),
      'blood_group', 'O+',
      'notes', 'Needs afternoon slot.'
    ),
    'ACTIVE'
  ),
  (
    'demo-customer-3',
    'user-meera',
    'A-Zone, Durgapur · Ward 8',
    'Enhanced',
    JSON_ARRAY(
      JSON_OBJECT('name', 'DAYA Helpline', 'relationship', 'Ops', 'phone', '+913432400000')
    ),
    JSON_OBJECT(
      'preexisting_conditions', JSON_ARRAY('Post-hospital follow-up'),
      'notes', 'Yesterday 18:40 hospital coordination case is closed.'
    ),
    'ACTIVE'
  );

INSERT IGNORE INTO family_mappings (
  mapping_id, family_user_id, customer_id, relationship, access_granted_at
) VALUES
  ('map-arjun-anjali', 'user-arjun', 'demo-customer', 'Son', '2026-01-16 10:00:00.000');

INSERT IGNORE INTO worker_allocations (allocation_id, worker_id, customer_id, allocated_at) VALUES
  ('alloc-priya-anjali', 'user-priya', 'demo-customer', '2026-02-01 08:00:00.000'),
  ('alloc-priya-ramesh', 'user-priya', 'demo-customer-2', '2026-02-01 08:00:00.000'),
  ('alloc-priya-meera', 'user-priya', 'demo-customer-3', '2026-02-01 08:00:00.000');

INSERT IGNORE INTO health_visit_logs (
  log_id,
  customer_id,
  worker_id,
  visit_timestamp,
  entry_source,
  vitals_payload,
  qualitative_observations,
  visit_photo_s3_url,
  created_at
) VALUES
  (
    'seed-log-anjali-1',
    'demo-customer',
    'user-priya',
    '2026-08-31 10:30:00.000',
    'ANDROID_APP',
    JSON_OBJECT(
      'systolic_bp', 128,
      'diastolic_bp', 78,
      'pulse_bpm', 74,
      'spo2_percent', 98
    ),
    JSON_OBJECT(
      'mood_rating', 4,
      'dietary_compliance', 'GOOD',
      'physical_mobility', 'INDEPENDENT',
      'worker_notes', 'Welfare check completed.',
      'action_items_needed', FALSE
    ),
    NULL,
    '2026-08-31 10:35:00.000'
  ),
  (
    'seed-log-anjali-today',
    'demo-customer',
    'user-priya',
    '2026-09-01 10:30:00.000',
    'ANDROID_APP',
    JSON_OBJECT(
      'systolic_bp', 128,
      'diastolic_bp', 78,
      'pulse_bpm', 74,
      'spo2_percent', 98
    ),
    JSON_OBJECT(
      'mood_rating', 4,
      'dietary_compliance', 'GOOD',
      'physical_mobility', 'INDEPENDENT',
      'worker_notes', 'Today welfare call at 10:30 AM. Mum confirmed she is well.',
      'action_items_needed', FALSE
    ),
    NULL,
    '2026-09-01 10:32:00.000'
  ),
  (
    'seed-log-ramesh-1',
    'demo-customer-2',
    'user-priya',
    '2026-08-30 15:00:00.000',
    'ANDROID_APP',
    JSON_OBJECT(
      'systolic_bp', 136,
      'diastolic_bp', 82,
      'pulse_bpm', 80,
      'spo2_percent', 97,
      'blood_sugar_mgdl', 142,
      'sugar_test_type', 'RANDOM'
    ),
    JSON_OBJECT(
      'mood_rating', 3,
      'dietary_compliance', 'PARTIAL',
      'physical_mobility', 'WALKING_STICK',
      'worker_notes', 'City Centre afternoon visit.',
      'action_items_needed', FALSE
    ),
    NULL,
    '2026-08-30 15:20:00.000'
  );
