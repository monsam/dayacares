USE dayacares;

INSERT IGNORE INTO worker_allocations (allocation_id, worker_id, customer_id, allocated_at) VALUES
  ('alloc-rahul-anjali', 'user-rahul', 'demo-customer', '2026-09-01 09:00:00.000');

CREATE TABLE IF NOT EXISTS visit_schedules (
  schedule_id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  worker_id VARCHAR(64) NOT NULL,
  scheduled_for DATETIME(3) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  visit_type VARCHAR(32) NOT NULL DEFAULT 'HOME_VISIT',
  notes VARCHAR(500) NULL,
  status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sched_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id),
  CONSTRAINT fk_sched_worker FOREIGN KEY (worker_id) REFERENCES users (user_id),
  INDEX idx_sched_worker_time (worker_id, scheduled_for),
  INDEX idx_sched_customer_time (customer_id, scheduled_for),
  INDEX idx_sched_day (scheduled_for, status)
);

INSERT IGNORE INTO visit_schedules (
  schedule_id, customer_id, worker_id, scheduled_for, duration_minutes, visit_type, notes, status, created_at
) VALUES
  (
    'sched-priya-anjali-0902',
    'demo-customer',
    'user-priya',
    '2026-09-02 10:00:00.000',
    45,
    'HOME_VISIT',
    'Morning vitals and medication check',
    'SCHEDULED',
    '2026-09-01 09:00:00.000'
  ),
  (
    'sched-priya-ramesh-0902',
    'demo-customer-2',
    'user-priya',
    '2026-09-02 11:30:00.000',
    45,
    'HOME_VISIT',
    'BP follow-up after last visit',
    'SCHEDULED',
    '2026-09-01 09:00:00.000'
  ),
  (
    'sched-priya-meera-0902',
    'demo-customer-3',
    'user-priya',
    '2026-09-02 15:00:00.000',
    40,
    'WELFARE_CALL',
    'Afternoon welfare check',
    'SCHEDULED',
    '2026-09-01 09:00:00.000'
  ),
  (
    'sched-rahul-anjali-0903',
    'demo-customer',
    'user-rahul',
    '2026-09-03 10:00:00.000',
    45,
    'FOLLOW_UP',
    'Cover while Priya is on the A-Zone loop',
    'SCHEDULED',
    '2026-09-01 09:00:00.000'
  );
