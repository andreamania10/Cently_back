const express = require("express");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken);

router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
         DATE_FORMAT(e.date, '%Y-%m') AS month,
         c.id AS category_id,
         c.name AS category_name,
         c.limit_amount,
         SUM(e.amount) AS total_spent
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE c.user_id = ?
       GROUP BY month, c.id
       ORDER BY month DESC, c.name`,
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error del servidor" });
    }
});

module.exports = router;