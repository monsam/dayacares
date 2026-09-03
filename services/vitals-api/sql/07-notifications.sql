USE dayacares;

CREATE TABLE IF NOT EXISTS user_notifications (
  notification_id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  kind ENUM('SOS', 'VISIT_ALERT') NOT NULL,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(500) NOT NULL,
  related_type VARCHAR(32) NULL,
  related_id VARCHAR(64) NULL,
  customer_id VARCHAR(64) NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id) ON DELETE SET NULL,
  INDEX idx_notif_user_time (user_id, created_at),
  INDEX idx_notif_user_unread (user_id, read_at)
);
