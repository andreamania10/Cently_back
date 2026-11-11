-- Crea la base de dades i les taules necessàries
-- Executa aquest fitxer amb: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS pressupost CHARACTER SET utf8mb4;
USE pressupost;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  limit_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  date DATE NOT NULL,                                     -- dia en què es va gastar (el tria l'usuari)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- quan es va apuntar a l'app
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_expenses_cat_date (category_id, date)
);

CREATE TABLE IF NOT EXISTS incomes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  date DATE NOT NULL,                                      -- el dia que entra (el del calendari)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- quan es va apuntar a l'app
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_incomes_user_date (user_id, date)
);
