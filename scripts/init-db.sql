-- GuardianPulse Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time
-- Note: The database is created automatically by POSTGRES_DB environment variable

-- Create extensions that might be useful for the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'GuardianPulse database initialized successfully';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'User: %', current_user;
    RAISE NOTICE 'Timestamp: %', now();
END $$;
