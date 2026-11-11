const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });

const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const expenseRoutes = require("./routes/expenses");
const historyRoutes = require("./routes/history");
const analyticsRoutes = require("./routes/analytics");
const incomeRoutes = require("./routes/incomes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:4200" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/incomes", incomeRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ error: "Ruta no trobada" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error del servidor" });
});

module.exports = app;
