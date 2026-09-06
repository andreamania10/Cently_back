const express = require("express");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken); // totes les rutes d'aquest fitxer requereixen estar autenticat

// Obtenir les categories de l'usuari autenticat, amb les seves despeses
router.get("/", async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE user_id = ? ORDER BY created_at",
      [req.userId]
    );

    for (const cat of categories) {
      const [expenses] = await pool.query(
        `SELECT * FROM expenses 
   WHERE category_id = ? 
   AND MONTH(date) = MONTH(CURDATE()) 
   AND YEAR(date) = YEAR(CURDATE())
   ORDER BY date`,
        [cat.id]
      );
      cat.expenses = expenses;
    }

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Crear categoria nova per a l'usuari autenticat
router.post("/", async (req, res) => {
  try {
    const { name, limit_amount } = req.body;
    if (!name || !limit_amount || limit_amount <= 0) {
      return res.status(400).json({ error: "Dades invàlides" });
    }

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

// Eliminar una categoria (només si pertany a l'usuari autenticat)
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM categories WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Afegir despesa a una categoria (comprovant que la categoria és de l'usuari)
router.post("/:id/expenses", async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Import invàlid" });
    }

    const [owned] = await pool.query(
      "SELECT id FROM categories WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );
    if (owned.length === 0) {
      return res.status(404).json({ error: "Categoria no trobada" });
    }

    const [result] = await pool.query(
      "INSERT INTO expenses (category_id, amount, description) VALUES (?, ?, ?)",
      [req.params.id, amount, description || "Despesa"]
    );

    res.json({ id: result.insertId, category_id: req.params.id, amount, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
