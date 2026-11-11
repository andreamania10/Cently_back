const express = require("express");
const path = require("path");
const { execFile } = require("child_process");
const { query } = require("express-validator");
const verifyToken = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
router.use(verifyToken);

const PYTHON_BIN = process.env.PYTHON_BIN || "python3"; // a Windows normalment "python"
const SCRIPT = path.join(__dirname, "..", "analytics", "report.py");

// Anàlisi de despeses amb pandas: percentatge per categoria + total per mes, amb gràfics
router.get(
  "/",
  // all = tot, YYYY = un any, YYYY-MM = un mes
  query("month").optional().matches(/^(all|\d{4}|\d{4}-\d{2})$/).withMessage("Període invàlid"),
  validate,
  (req, res) => {
    const month = req.query.month || "all";

    // execFile no passa per cap shell; només rep l'id de l'usuari (del JWT) i un mes validat
    execFile(
      PYTHON_BIN,
      [SCRIPT, String(req.userId), month],
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024, env: process.env },
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error a l'script d'anàlisi:", stderr || err.message);
          return res.status(500).json({ error: "No s'ha pogut generar l'anàlisi" });
        }
        try {
          res.json(JSON.parse(stdout));
        } catch (e) {
          console.error("Sortida de Python invàlida:", stdout);
          res.status(500).json({ error: "No s'ha pogut generar l'anàlisi" });
        }
      }
    );
  }
);

module.exports = router;
