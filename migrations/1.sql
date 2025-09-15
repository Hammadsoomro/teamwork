
CREATE TABLE app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mocha_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'scrapper', 'user')),
  is_active BOOLEAN DEFAULT 1,
  daily_numbers_sent INTEGER DEFAULT 0,
  total_numbers_sent INTEGER DEFAULT 0,
  last_activity_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES app_users(id)
);

CREATE TABLE scrapper_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scrapper_id INTEGER NOT NULL,
  data_line TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scrapper_id) REFERENCES app_users(id)
);

CREATE TABLE scrapper_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scrapper_id INTEGER NOT NULL UNIQUE,
  lines_per_user INTEGER DEFAULT 1,
  selected_users TEXT, -- JSON array of user IDs
  timer_interval INTEGER DEFAULT 180, -- seconds, default 3 minutes
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scrapper_id) REFERENCES app_users(id)
);

CREATE TABLE distribution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scrapper_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  data_lines TEXT NOT NULL, -- JSON array of distributed lines
  distributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scrapper_id) REFERENCES app_users(id),
  FOREIGN KEY (recipient_id) REFERENCES app_users(id)
);

CREATE INDEX idx_app_users_mocha_user_id ON app_users(mocha_user_id);
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_scrapper_data_scrapper_id ON scrapper_data(scrapper_id);
CREATE INDEX idx_scrapper_data_is_processed ON scrapper_data(is_processed);
CREATE INDEX idx_distribution_logs_scrapper_id ON distribution_logs(scrapper_id);
CREATE INDEX idx_distribution_logs_recipient_id ON distribution_logs(recipient_id);
