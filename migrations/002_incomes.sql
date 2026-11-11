-- Migració 002: ingressos (nòmina, Bizums rebuts...)
-- Taula separada de les despeses: un ingrés no pertany a cap categoria.
-- El rètol de la home mostra: ingressos del mes - despeses del mes (fins al dia del calendari).
--
-- Executa-la UNA sola vegada (pestanya SQL de phpMyAdmin o MySQL Workbench).

USE pressupost;

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
