const express = require("express");
const { query } = require("express-validator");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");
const validate = require("../middleware/validate");
const { APP_START_YEAR, currentYear } = require("../utils/dates");

const router = express.Router();
router.use(verifyToken);

// Totals per mes i categoria. Amb ?year=YYYY, només d'aquell any.
router.get(
  "/",
  query("year").optional()
    .isInt({ min: APP_START_YEAR }).withMessage("Any invàlid")
    .custom((value) => Number(value) <= currentYear()).withMessage("Any invàlid"),
  validate,
  async (req, res) => {
    try {
      const params = [req.userId];
      let yearFilter = "";
      if (req.query.year) {
        // a Express 5 req.query és només de lectura: convertim l'any aquí
        const year = Number(req.query.year);
        yearFilter = "AND e.date >= ? AND e.date < ?";
        params.push(`${year}-01-01`, `${year + 1}-01-01`);
      }

      const [rows] = await pool.query(
        `SELECT
           DATE_FORMAT(e.date, '%Y-%m') AS month,
           c.id AS category_id,
           c.name AS category_name,
           c.limit_amount,
           SUM(e.amount) AS total_spent
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
         WHERE c.user_id = ? ${yearFilter}
         GROUP BY month, c.id, c.name, c.limit_amount
         ORDER BY month DESC, c.name`,
        params
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

module.exports = router;
