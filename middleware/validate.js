const { validationResult } = require("express-validator");

// Retorna el primer error com a { error: "..." }, el format que ja llegeix el front
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};
