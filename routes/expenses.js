const express = require("express");
const { param } = require("express-validator");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");
const validate = require("../middleware/validate");
const { isEditableDate } = require("../utils/dates");

const router = express.Router();
router.use(verifyToken);

// Eliminar una despesa, comprovant que la categoria és de l'usuari
// i que no és d'un any anterior (els anys tancats són només de lectura)
router.delete(
  "/:id",
  param("id").isInt({ gt: 0 }).withMessage("Identificador invàlid").toInt(),
  validate,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT e.id, e.date FROM expenses e
         INNER JOIN categories c ON e.category_id = c.id
         WHERE e.id = ? AND c.user_id = ?`,
        [req.params.id, req.userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Despesa no trobada" });
      }
      if (!isEditableDate(rows[0].date)) {
        return res.status(403).json({ error: "Les despeses d'anys anteriors són només de lectura" });
      }

      await pool.query("DELETE FROM expenses WHERE id = ?", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

module.exports = router;
