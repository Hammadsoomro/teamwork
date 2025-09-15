
-- Add sales type columns to sales_data table
ALTER TABLE sales_data ADD COLUMN silver_sales INTEGER DEFAULT 0;
ALTER TABLE sales_data ADD COLUMN gold_sales INTEGER DEFAULT 0;
ALTER TABLE sales_data ADD COLUMN platinum_sales INTEGER DEFAULT 0;
ALTER TABLE sales_data ADD COLUMN diamond_sales INTEGER DEFAULT 0;
ALTER TABLE sales_data ADD COLUMN ruby_sales INTEGER DEFAULT 0;
ALTER TABLE sales_data ADD COLUMN sapphire_sales INTEGER DEFAULT 0;
