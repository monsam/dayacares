USE dayacares;

ALTER TABLE customer_profiles
  ADD COLUMN landmark VARCHAR(160) NULL,
  ADD COLUMN date_of_birth DATE NULL,
  ADD COLUMN gender VARCHAR(16) NULL,
  ADD COLUMN care_recipient_type VARCHAR(32) NULL,
  ADD COLUMN registration_payload JSON NULL;
