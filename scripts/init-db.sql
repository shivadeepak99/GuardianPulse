-- GuardianPulse Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Ensure the database exists
CREATE DATABASE IF NOT EXISTS guardianpulse_db;

-- Connect to the database
\c guardianpulse_db;

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
