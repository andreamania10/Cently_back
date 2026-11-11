require("dotenv").config({ quiet: true });

const REQUIRED = ["JWT_SECRET", "DB_HOST", "DB_USER", "DB_NAME"];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Falten variables d'entorn: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 16) {
    console.error("❌ JWT_SECRET és massa curt (mínim 16 caràcters). Mira .env.example.");
    process.exit(1);
  }
}

module.exports = validateEnv;
