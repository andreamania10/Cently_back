jest.mock("../config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const app = require("../app");

beforeEach(() => pool.query.mockReset());

describe("POST /api/auth/register", () => {
  it("rebutja si falten dades", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "a@a.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rebutja un correu invàlid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ana", email: "no-es-un-correu", password: "123456" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Correu/);
  });

  it("rebutja contrasenyes curtes", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ana", email: "ana@test.com", password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 caràcters/);
  });

  it("rebutja un correu ja registrat", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ana", email: "ana@test.com", password: "123456" });
    expect(res.status).toBe(409);
  });

  it("crea l'usuari i retorna un token", async () => {
    pool.query
      .mockResolvedValueOnce([[]])               // el correu no existeix
      .mockResolvedValueOnce([{ insertId: 7 }]); // INSERT
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "  Ana  ", email: "ana@test.com", password: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({ id: 7, name: "Ana", email: "ana@test.com" });
  });
});

describe("POST /api/auth/login", () => {
  it("rebutja un usuari inexistent", async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no@test.com", password: "123456" });
    expect(res.status).toBe(401);
  });

  it("rebutja una contrasenya incorrecta", async () => {
    const hash = await bcrypt.hash("correcta", 4);
    pool.query.mockResolvedValueOnce([[{ id: 1, name: "Ana", email: "ana@test.com", password_hash: hash }]]);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  it("fa login amb credencials correctes", async () => {
    const hash = await bcrypt.hash("correcta", 4);
    pool.query.mockResolvedValueOnce([[{ id: 1, name: "Ana", email: "ana@test.com", password_hash: hash }]]);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: "correcta" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).not.toHaveProperty("password_hash");
  });
});

describe("rutes protegides", () => {
  it("rebutgen peticions sense token", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(401);
  });

  it("rebutgen tokens signats amb un altre secret", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: 1 }, "un-altre-secret-diferent");
    const res = await request(app).get("/api/history").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
