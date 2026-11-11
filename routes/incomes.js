const express = require("express");
const { body, param, query } = require("express-validator");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");
const validate = require("../middleware/validate");
const { todayISO, currentMonth, isRealDate, isEditableDate, isViewableMonth } = require("../utils/dates");

const router = express.Router();
router.use(verifyToken);

// Ingressos d'un mes (?month=YYYY-MM, per defecte l'actual)
router.get(
  "/",
  query("month").optional()
    .matches(/^\d{4}-\d{2}$/).withMessage("Mes invàlid")
    .custom((value) => isViewableMonth(value)).withMessage("Aquest mes no està disponible"),
  validate,
  async (req, res) => {
    try {
      const month = req.query.month || currentMonth();
      const [rows] = await pool.query(
        `SELECT id, amount, description, date, created_at FROM incomes
         WHERE user_id = ? AND date >= ? AND date < ? + INTERVAL 1 MONTH
         ORDER BY date, id`,
        [req.userId, `${month}-01`, `${month}-01`]
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

// Afegir un ingrés (mateixes regles de dates que les despeses)
router.post(
  "/",
  [
    body("amount").isFloat({ gt: 0, max: 99999999 }).withMessage("Import invàlid").toFloat(),
    body("description").optional({ values: "falsy" }).trim()
      .isLength({ max: 255 }).withMessage("La descripció és massa llarga (màxim 255 caràcters)"),
    body("date").optional({ values: "falsy" })
      .custom((value) => isRealDate(value)).withMessage("Data invàlida")
      .custom((value) => isEditableDate(value))
      .withMessage("Només pots afegir ingressos de l'any en curs i fins avui")
  ],
  validate,
  async (req, res) => {
    try {
      const { amount } = req.body;
      const description = req.body.description || "Ingrés";
      const date = req.body.date || todayISO();
      const [result] = await pool.query(
        "INSERT INTO incomes (user_id, amount, description, date) VALUES (?, ?, ?, ?)",
        [req.userId, amount, description, date]
      );
      res.json({ id: result.insertId, amount, description, date });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

// Esborrar un ingrés propi (els d'anys anteriors són només de lectura)
router.delete(
  "/:id",
  param("id").isInt({ gt: 0 }).withMessage("Identificador invàlid").toInt(),
  validate,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, date FROM incomes WHERE id = ? AND user_id = ?",
        [req.params.id, req.userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Ingrés no trobat" });
      }
      if (!isEditableDate(rows[0].date)) {
        return res.status(403).json({ error: "Els ingressos d'anys anteriors són només de lectura" });
      }
      await pool.query("DELETE FROM incomes WHERE id = ?", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

module.exports = router;
