
-- Remove sales type columns from sales_data table
ALTER TABLE sales_data DROP COLUMN sapphire_sales;
ALTER TABLE sales_data DROP COLUMN ruby_sales;
ALTER TABLE sales_data DROP COLUMN diamond_sales;
ALTER TABLE sales_data DROP COLUMN platinum_sales;
ALTER TABLE sales_data DROP COLUMN gold_sales;
ALTER TABLE sales_data DROP COLUMN silver_sales;
