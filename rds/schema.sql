-- Run this once against your RDS MySQL instance:
--   mysql -h <RDS_ENDPOINT> -u admin -p < schema.sql

CREATE DATABASE IF NOT EXISTS company_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE company_db;

CREATE TABLE IF NOT EXISTS employees (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  department VARCHAR(100)  NOT NULL,
  salary     DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO employees (name, email, department, salary) VALUES
  ('Amit Sharma', 'amit@example.com',  'Engineering', 85000.00),
  ('Priya Patel', 'priya@example.com', 'HR',          62000.00),
  ('Rahul Verma', 'rahul@example.com', 'Sales',       58000.00);

-- ---------------------------------------------------------------
-- The same CRUD queries the app runs (for manual testing)
-- ---------------------------------------------------------------

-- CREATE
-- INSERT INTO employees (name, email, department, salary)
--   VALUES ('Neha Singh', 'neha@example.com', 'Finance', 70000);

-- READ (all)
-- SELECT * FROM employees ORDER BY id DESC;

-- READ (one)
-- SELECT * FROM employees WHERE id = 1;

-- READ (search)
-- SELECT * FROM employees
--   WHERE name LIKE '%am%' OR email LIKE '%am%' OR department LIKE '%am%';

-- UPDATE
-- UPDATE employees
--   SET name = 'Amit K Sharma', department = 'Engineering', salary = 90000
--   WHERE id = 1;

-- DELETE
-- DELETE FROM employees WHERE id = 3;
