USE dayacares;

CREATE TABLE IF NOT EXISTS membership_invoices (
  invoice_id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  period_label VARCHAR(32) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount_inr INT NOT NULL,
  status ENUM('DUE', 'PAID', 'WAIVED') NOT NULL DEFAULT 'DUE',
  due_on DATE NOT NULL,
  paid_on DATE NULL,
  payment_mode VARCHAR(32) NULL,
  reference VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id),
  INDEX idx_inv_customer (customer_id, status)
);

CREATE TABLE IF NOT EXISTS sos_incidents (
  incident_id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NULL,
  raised_by VARCHAR(64) NOT NULL,
  raised_by_name VARCHAR(160) NOT NULL,
  severity ENUM('SOS', 'FALL', 'MEDICAL', 'OTHER') NOT NULL DEFAULT 'SOS',
  status ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  notes VARCHAR(500) NULL,
  assigned_worker_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sos_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id),
  CONSTRAINT fk_sos_raised FOREIGN KEY (raised_by) REFERENCES users (user_id),
  CONSTRAINT fk_sos_worker FOREIGN KEY (assigned_worker_id) REFERENCES users (user_id),
  INDEX idx_sos_status (status, created_at)
);

INSERT IGNORE INTO membership_invoices (
  invoice_id, customer_id, period_label, description, amount_inr, status, due_on, paid_on, payment_mode, reference, created_at
) VALUES
  (
    'inv-anjali-2026-09',
    'demo-customer',
    'Sep 2026',
    'Enhanced monthly membership',
    4999,
    'PAID',
    '2026-09-05',
    '2026-09-01',
    'UPI',
    'UPI-ANJ-0901',
    '2026-09-01 09:00:00.000'
  ),
  (
    'inv-ramesh-2026-09',
    'demo-customer-2',
    'Sep 2026',
    'Comprehensive monthly membership',
    7999,
    'DUE',
    '2026-09-05',
    NULL,
    NULL,
    NULL,
    '2026-09-01 09:00:00.000'
  ),
  (
    'inv-meera-2026-09',
    'demo-customer-3',
    'Sep 2026',
    'Enhanced monthly membership',
    4999,
    'DUE',
    '2026-09-05',
    NULL,
    NULL,
    NULL,
    '2026-09-01 09:00:00.000'
  );

INSERT IGNORE INTO sos_incidents (
  incident_id, customer_id, raised_by, raised_by_name, severity, status, notes, assigned_worker_id, created_at
) VALUES
  (
    'sos-anjali-0902',
    'demo-customer',
    'user-arjun',
    'Arjun Banerjee',
    'SOS',
    'OPEN',
    'Mum felt dizzy after lunch. Family requested an immediate check.',
    'user-priya',
    '2026-09-02 12:40:00.000'
  ),
  (
    'sos-ramesh-0831',
    'demo-customer-2',
    'user-priya',
    'Priya Sen',
    'MEDICAL',
    'ACKNOWLEDGED',
    'High sugar reading during yesterday’s visit. Centre coordinating with Dr. Roy.',
    'user-priya',
    '2026-08-31 16:10:00.000'
  );
