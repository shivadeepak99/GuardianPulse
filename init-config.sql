-- Insert default configuration values
INSERT INTO app_config (id, key, value, description, category, "isActive", "createdAt", "updatedAt") VALUES 
('config_1', 'app_name', 'GuardianPulse', 'Application name', 'general', true, NOW(), NOW()),
('config_2', 'max_guardians', '5', 'Maximum number of guardians per user', 'limits', true, NOW(), NOW()),
('config_3', 'session_timeout', '3600', 'Session timeout in seconds', 'security', true, NOW(), NOW()),
('config_4', 'alert_cooldown', '300', 'Alert cooldown period in seconds', 'alerts', true, NOW(), NOW());
