jest.mock("../config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const app = require("../app");
const { todayISO, currentMonth } = require("../utils/dates");

const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

beforeEach(() => pool.query.mockReset());

describe("GET /api/categories", () => {
  it("retorna les categories amb les despeses en 2 consultes", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, name: "Menjar", limit_amount: 200 }, { id: 2, name: "Oci", limit_amount: 50 }]])
      .mockResolvedValueOnce([[{ id: 10, category_id: 2, amount: 12.5 }]]);
    const res = await request(app).get("/api/categories").set(auth);
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(res.body[0].expenses).toEqual([]);
    expect(res.body[1].expenses).toHaveLength(1);
    // per defecte, el mes actual
    expect(pool.query.mock.calls[1][1][1]).toBe(`${currentMonth()}-01`);
  });

  it("accepta ?month per veure un mes anterior", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, name: "Menjar", limit_amount: 200 }]])
      .mockResolvedValueOnce([[]]);
    const res = await request(app).get("/api/categories?month=2026-01").set(auth);
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[1][1][1]).toBe("2026-01-01");
  });

  it("rebutja mesos anteriors al 2026 o futurs", async () => {
    expect((await request(app).get("/api/categories?month=2025-12").set(auth)).status).toBe(400);
    expect((await request(app).get("/api/categories?month=2999-01").set(auth)).status).toBe(400);
    expect((await request(app).get("/api/categories?month=octubre").set(auth)).status).toBe(400);
  });
});

describe("POST /api/categories", () => {
  it("rebutja un límit negatiu", async () => {
    const res = await request(app).post("/api/categories").set(auth).send({ name: "Oci", limit_amount: -5 });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rebutja un nom buit", async () => {
    const res = await request(app).post("/api/categories").set(auth).send({ name: "   ", limit_amount: 50 });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/categories/:id", () => {
  it("actualitza una categoria de l'usuari", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).put("/api/categories/3").set(auth).send({ name: "Oci", limit_amount: "80" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 3, name: "Oci", limit_amount: 80 });
    expect(pool.query.mock.calls[0][1]).toEqual(["Oci", 80, 3, 1]);
  });

  it("retorna 404 si la categoria no és de l'usuari", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app).put("/api/categories/99").set(auth).send({ name: "Oci", limit_amount: 80 });
    expect(res.status).toBe(404);
  });

  it("rebutja un id que no és numèric", async () => {
    const res = await request(app).put("/api/categories/abc").set(auth).send({ name: "Oci", limit_amount: 80 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/categories/:id/expenses", () => {
  it("rebutja imports no vàlids", async () => {
    const res = await request(app).post("/api/categories/1/expenses").set(auth).send({ amount: "abc" });
    expect(res.status).toBe(400);
  });

  it("afegeix una despesa amb descripció i data per defecte (avui)", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 5 }]);
    const res = await request(app).post("/api/categories/1/expenses").set(auth).send({ amount: 9.9 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 5, amount: 9.9, description: "Despesa", date: todayISO() });
  });

  it("guarda la despesa amb el dia triat al calendari, no amb el d'avui", async () => {
    const day = `${new Date().getFullYear()}-01-01`;
    pool.query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 6 }]);
    const res = await request(app).post("/api/categories/1/expenses").set(auth)
      .send({ amount: 20, description: "Súper", date: day });
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[1][1]).toEqual([1, 20, "Súper", day]);
  });

  it("rebutja dates futures, d'anys anteriors o impossibles", async () => {
    const year = new Date().getFullYear();
    for (const date of [`${year + 1}-01-01`, `${year - 1}-12-31`, `${year}-02-31`]) {
      const res = await request(app).post("/api/categories/1/expenses").set(auth).send({ amount: 5, date });
      expect(res.status).toBe(400);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });
});
