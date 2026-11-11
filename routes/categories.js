const express = require("express");
const { body, param, query } = require("express-validator");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");
const validate = require("../middleware/validate");
const { todayISO, currentMonth, isRealDate, isEditableDate, isViewableMonth } = require("../utils/dates");

const router = express.Router();
router.use(verifyToken); // totes les rutes d'aquest fitxer requereixen estar autenticat

const idRule = param("id").isInt({ gt: 0 }).withMessage("Identificador invàlid").toInt();

const categoryRules = [
  body("name").trim().notEmpty().withMessage("El nom és obligatori")
    .isLength({ max: 100 }).withMessage("El nom és massa llarg (màxim 100 caràcters)"),
  body("limit_amount").isFloat({ gt: 0, max: 99999999 })
    .withMessage("El límit ha de ser un número major que 0").toFloat()
];

const expenseRules = [
  idRule,
  body("amount").isFloat({ gt: 0, max: 99999999 }).withMessage("Import invàlid").toFloat(),
  body("description").optional({ values: "falsy" }).trim()
    .isLength({ max: 255 }).withMessage("La descripció és massa llarga (màxim 255 caràcters)"),
  // dia en què es va gastar; si no se n'envia cap, avui
  body("date").optional({ values: "falsy" })
    .custom((value) => isRealDate(value)).withMessage("Data invàlida")
    .custom((value) => isEditableDate(value))
    .withMessage("Només pots afegir despeses de l'any en curs i fins avui")
];

const monthRule = query("month").optional()
  .matches(/^\d{4}-\d{2}$/).withMessage("Mes invàlid")
  .custom((value) => isViewableMonth(value)).withMessage("Aquest mes no està disponible");

// Categories de l'usuari amb les despeses d'un mes (?month=YYYY-MM, per defecte l'actual).
// Es retorna el mes sencer: el front filtra fins al dia marcat al calendari.
// 2 consultes en total, no N+1.
router.get("/", monthRule, validate, async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE user_id = ? ORDER BY created_at",
      [req.userId]
    );

    if (categories.length > 0) {
      const ids = categories.map((c) => c.id);
      const [expenses] = await pool.query(
        `SELECT * FROM expenses
         WHERE category_id IN (?)
           AND date >= ?
           AND date <  ? + INTERVAL 1 MONTH
         ORDER BY date, id`,
        [ids, `${month}-01`, `${month}-01`]
      );

      const byCategory = new Map(ids.map((id) => [id, []]));
      expenses.forEach((e) => byCategory.get(e.category_id).push(e));
      categories.forEach((c) => { c.expenses = byCategory.get(c.id); });
    }

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Crear categoria nova
router.post("/", categoryRules, validate, async (req, res) => {
  try {
    const { name, limit_amount } = req.body;
    const [result] = await pool.query(
      "INSERT INTO categories (user_id, name, limit_amount) VALUES (?, ?, ?)",
      [req.userId, name, limit_amount]
    );
    res.json({ id: result.insertId, user_id: req.userId, name, limit_amount, expenses: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Editar nom i límit d'una categoria
router.put("/:id", [idRule, ...categoryRules], validate, async (req, res) => {
  try {
    const { name, limit_amount } = req.body;
    const [result] = await pool.query(
      "UPDATE categories SET name = ?, limit_amount = ? WHERE id = ? AND user_id = ?",
      [name, limit_amount, req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Categoria no trobada" });
    }
    res.json({ id: req.params.id, name, limit_amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Eliminar una categoria (només si pertany a l'usuari)
router.delete("/:id", idRule, validate, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM categories WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Categoria no trobada" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Afegir despesa a una categoria (comprovant que és de l'usuari)
router.post("/:id/expenses", expenseRules, validate, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const date = req.body.date || todayISO();

    const [owned] = await pool.query(
      "SELECT id FROM categories WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );
    if (owned.length === 0) {
      return res.status(404).json({ error: "Categoria no trobada" });
    }

    const desc = description || "Despesa";
    const [result] = await pool.query(
      "INSERT INTO expenses (category_id, amount, description, date) VALUES (?, ?, ?, ?)",
      [req.params.id, amount, desc, date]
    );
    res.json({ id: result.insertId, category_id: req.params.id, amount, description: desc, date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
