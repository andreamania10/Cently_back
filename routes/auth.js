const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const pool = require("../config/db");
const validate = require("../middleware/validate");
require("dotenv").config({ quiet: true });

const router = express.Router();

const registerRules = [
  body("name").trim().notEmpty().withMessage("El nom és obligatori")
    .isLength({ max: 100 }).withMessage("El nom és massa llarg (màxim 100 caràcters)"),
  body("email").trim().isEmail().withMessage("Correu electrònic invàlid")
    .isLength({ max: 150 }).withMessage("El correu és massa llarg"),
  body("password").isString().isLength({ min: 6 })
    .withMessage("La contrasenya ha de tenir mínim 6 caràcters")
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Correu electrònic invàlid"),
  body("password").isString().notEmpty().withMessage("Falta la contrasenya")
];

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// --- Registre ---
router.post("/register", registerRules, validate, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Aquest correu ja està registrat" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]
    );

    const user = { id: result.insertId, name, email };
    res.json({ token: signToken(user.id), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// --- Login ---
router.post("/login", loginRules, validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Credencials incorrectes" });
    }

    const dbUser = rows[0];
    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credencials incorrectes" });
    }

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email };
    res.json({ token: signToken(user.id), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
