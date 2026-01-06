-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create users table (anonymous with username)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    role VARCHAR(50) DEFAULT 'student',
    is_active BOOLEAN DEFAULT true
);

-- Create screening_results table
CREATE TABLE IF NOT EXISTS screening_results (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL, -- 'PHQ9', 'GAD7', 'GHQ'
    score INTEGER NOT NULL,
    severity VARCHAR(50), -- 'minimal', 'mild', 'moderate', 'severe'
    responses JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_flag BOOLEAN DEFAULT false
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'video', 'audio', 'article', 'guide'
    content_type VARCHAR(50), -- 'depression', 'anxiety', 'general', etc.
    url VARCHAR(500),
    file_path VARCHAR(500),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    booking_date TIMESTAMP NOT NULL,
    mode VARCHAR(50) NOT NULL, -- 'video', 'offline'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    calendar_event_id VARCHAR(255),
    meeting_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_sent BOOLEAN DEFAULT false
);

-- Create progress_tracking table
CREATE TABLE IF NOT EXISTS progress_tracking (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mood_score INTEGER, -- 1-10 scale
    notes TEXT,
    activity_type VARCHAR(100), -- 'screening', 'resource_view', 'forum_post', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create emergency_flags table
CREATE TABLE IF NOT EXISTS emergency_flags (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL, -- 'screening_high_risk', 'ai_keyword', 'self_report'
    severity VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    context TEXT,
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_notified BOOLEAN DEFAULT false,
    resolved BOOLEAN DEFAULT false
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    institution VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_screening_user_id ON screening_results(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_created_at ON screening_results(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_user_id ON emergency_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_resolved ON emergency_flags(resolved);

-- Insert default admin (password: admin123 - CHANGE IN PRODUCTION)
-- To generate a proper hash, run: node scripts/generate-admin-hash.js admin123
-- Then update the hash below with the generated value
-- Password hash for 'admin123' using bcrypt (rounds: 10)
-- Default hash (temporary - must be regenerated):
INSERT INTO admins (email, password_hash, name, institution) 
VALUES ('admin@dpis.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Admin', 'DPIS Institution')
ON CONFLICT (email) DO NOTHING;
