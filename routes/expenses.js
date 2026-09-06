const express = require("express");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken);

// Eliminar una despesa, comprovant que la categoria a la qual pertany és de l'usuari
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      `DELETE e FROM expenses e
       INNER JOIN categories c ON e.category_id = c.id
       WHERE e.id = ? AND c.user_id = ?`,
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
