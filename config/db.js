const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pressupost",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL i SUM() arriben com a number, no com a string
  dateStrings: ["DATE"] // les DATE arriben com a "2026-10-12", sense desfasaments de zona horària
});

module.exports = pool;
