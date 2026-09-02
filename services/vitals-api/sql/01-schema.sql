CREATE DATABASE IF NOT EXISTS dayacares
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dayacares;

CREATE TABLE users (
  user_id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  cognito_sub VARCHAR(128) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('CUSTOMER', 'WORKER', 'FAMILY', 'ADMIN') NOT NULL,
  device_tokens JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE customer_profiles (
  customer_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  address_durgapur VARCHAR(255) NOT NULL,
  plan VARCHAR(64) NULL,
  landmark VARCHAR(160) NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(16) NULL,
  care_recipient_type VARCHAR(32) NULL,
  emergency_contacts JSON NOT NULL,
  medical_history JSON NULL,
  registration_payload JSON NULL,
  subscription_status ENUM('ACTIVE', 'PAUSED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE family_mappings (
  mapping_id VARCHAR(64) PRIMARY KEY,
  family_user_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  relationship VARCHAR(80) NOT NULL,
  access_granted_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_family_user FOREIGN KEY (family_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_family_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id),
  INDEX idx_family_customer (customer_id)
);

CREATE TABLE worker_allocations (
  allocation_id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  allocated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_worker_customer (worker_id, customer_id),
  CONSTRAINT fk_alloc_worker FOREIGN KEY (worker_id) REFERENCES users (user_id),
  CONSTRAINT fk_alloc_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id)
);

CREATE TABLE health_visit_logs (
  log_id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  worker_id VARCHAR(64) NOT NULL,
  visit_timestamp DATETIME(3) NOT NULL,
  entry_source ENUM('WEB', 'ANDROID_APP', 'IOS_APP') NOT NULL,
  vitals_payload JSON NOT NULL,
  qualitative_observations JSON NOT NULL,
  visit_photo_s3_url VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_log_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id),
  CONSTRAINT fk_log_worker FOREIGN KEY (worker_id) REFERENCES users (user_id),
  INDEX idx_logs_customer_time (customer_id, visit_timestamp)
);
