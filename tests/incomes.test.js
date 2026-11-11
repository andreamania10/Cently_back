jest.mock("../config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const app = require("../app");
const { todayISO, currentMonth } = require("../utils/dates");

const auth = { Authorization: `Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET)}` };
const year = new Date().getFullYear();

beforeEach(() => pool.query.mockReset());

describe("/api/incomes", () => {
  it("requereix estar autenticat", async () => {
    expect((await request(app).get("/api/incomes")).status).toBe(401);
  });

  it("llista els ingressos del mes de l'usuari", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, amount: 1600, description: "Nòmina", date: todayISO() }]]);
    const res = await request(app).get("/api/incomes").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1, `${currentMonth()}-01`, `${currentMonth()}-01`]);
  });

  it("afegeix un ingrés amb el dia triat", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 9 }]);
    const res = await request(app).post("/api/incomes").set(auth)
      .send({ amount: "1600", description: "Nòmina", date: `${year}-01-01` });
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1, 1600, "Nòmina", `${year}-01-01`]);
  });

  it("rebutja imports negatius i dates futures", async () => {
    expect((await request(app).post("/api/incomes").set(auth).send({ amount: -5 })).status).toBe(400);
    expect((await request(app).post("/api/incomes").set(auth).send({ amount: 5, date: `${year + 1}-01-01` })).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("no esborra ingressos d'altres usuaris ni d'anys anteriors", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    expect((await request(app).delete("/api/incomes/4").set(auth)).status).toBe(404);
    pool.query.mockResolvedValueOnce([[{ id: 4, date: `${year - 1}-05-01` }]]);
    expect((await request(app).delete("/api/incomes/4").set(auth)).status).toBe(403);
  });
});
