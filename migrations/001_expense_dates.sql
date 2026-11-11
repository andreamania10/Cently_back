-- Migració 001: la data de cada despesa la tria l'usuari (calendari)
--   date       -> DATE: el dia en què vas gastar (abans: TIMESTAMP automàtic)
--   created_at -> quan ho vas apuntar a l'app (automàtic)
--
-- Executa-la UNA sola vegada sobre una base de dades existent:
--   mysql -u root -p pressupost < migrations/001_expense_dates.sql
-- (o obre-la a MySQL Workbench i executa-la sencera)
-- Les despeses que ja tens conserven el seu dia.

USE pressupost;
SET SQL_SAFE_UPDATES = 0;  -- MySQL Workbench bloqueja UPDATE sense WHERE per defecte

ALTER TABLE expenses
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN expense_date DATE NULL;

UPDATE expenses SET created_at = `date`, expense_date = DATE(`date`);

ALTER TABLE expenses DROP COLUMN `date`;
ALTER TABLE expenses CHANGE expense_date `date` DATE NOT NULL;
ALTER TABLE expenses ADD INDEX idx_expenses_cat_date (category_id, `date`);

SET SQL_SAFE_UPDATES = 1;
