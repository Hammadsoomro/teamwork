
CREATE TABLE sales_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  today_sales INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  month_year TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id)
);

CREATE INDEX idx_sales_user_month ON sales_data(user_id, month_year);
