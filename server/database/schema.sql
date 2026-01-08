-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  council_id VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  council_id VARCHAR(255) UNIQUE NOT NULL,
  member_picture TEXT,
  name VARCHAR(255) NOT NULL,
  enrollment_number VARCHAR(255),
  committee_name VARCHAR(255),
  position VARCHAR(255),
  phone_number VARCHAR(20),
  email_id VARCHAR(255),
  address TEXT,
  instagram VARCHAR(255),
  discord VARCHAR(255),
  linkedin VARCHAR(255),
  snapchat VARCHAR(255),
  github VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create login_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  punch_in TIMESTAMP,
  punch_out TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT,
  content TEXT,
  leave_from DATE,
  leave_to DATE,
  head_approval BOOLEAN DEFAULT false,
  gs_approval BOOLEAN DEFAULT false,
  file_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS work_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  report_date DATE,
  status VARCHAR(20) DEFAULT 'submitted',
  file_path TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id),
  actor_role VARCHAR(50),
  action VARCHAR(100),        -- CREATE / UPDATE / DELETE / APPROVE
  entity_type VARCHAR(50),    -- USER / PROFILE / ATTENDANCE / REPORT / LEAVE
  entity_id INTEGER,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'INFO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
