
DROP INDEX IF EXISTS idx_distribution_logs_recipient_id;
DROP INDEX IF EXISTS idx_distribution_logs_scrapper_id;
DROP INDEX IF EXISTS idx_scrapper_data_is_processed;
DROP INDEX IF EXISTS idx_scrapper_data_scrapper_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_sender_id;
DROP INDEX IF EXISTS idx_app_users_role;
DROP INDEX IF EXISTS idx_app_users_mocha_user_id;
DROP TABLE IF EXISTS distribution_logs;
DROP TABLE IF EXISTS scrapper_settings;
DROP TABLE IF EXISTS scrapper_data;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS app_users;
