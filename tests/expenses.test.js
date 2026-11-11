jest.mock("../config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const app = require("../app");
const { todayISO } = require("../utils/dates");

const auth = { Authorization: `Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET)}` };

beforeEach(() => pool.query.mockReset());

describe("DELETE /api/expenses/:id", () => {
  it("esborra una despesa de l'any en curs", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 3, date: todayISO() }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).delete("/api/expenses/3").set(auth);
    expect(res.status).toBe(200);
  });

  it("no deixa esborrar despeses d'anys anteriors", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 3, date: `${new Date().getFullYear() - 1}-06-01` }]]);
    const res = await request(app).delete("/api/expenses/3").set(auth);
    expect(res.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("retorna 404 si la despesa no és de l'usuari", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).delete("/api/expenses/99").set(auth);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/history", () => {
  it("filtra per any", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get("/api/history?year=2026").set(auth);
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1, "2026-01-01", "2027-01-01"]);
  });

  it("rebutja anys anteriors al 2026", async () => {
    const res = await request(app).get("/api/history?year=2024").set(auth);
    expect(res.status).toBe(400);
  });
});
