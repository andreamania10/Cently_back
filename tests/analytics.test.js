jest.mock("../config/db", () => ({ query: jest.fn() }));
jest.mock("child_process", () => ({ execFile: jest.fn() }));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { execFile } = require("child_process");
const app = require("../app");

const auth = { Authorization: `Bearer ${jwt.sign({ id: 4 }, process.env.JWT_SECRET)}` };

beforeEach(() => execFile.mockReset());

describe("GET /api/analytics", () => {
  it("crida l'script amb l'id de l'usuari i retorna el JSON", async () => {
    const payload = { month: "all", months: [], total: 0, categories: [] };
    execFile.mockImplementation((bin, args, opts, cb) => cb(null, JSON.stringify(payload), ""));
    const res = await request(app).get("/api/analytics").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
    expect(execFile.mock.calls[0][1].slice(1)).toEqual(["4", "all"]);
  });

  it("rebutja un mes mal format sense executar Python", async () => {
    const res = await request(app).get("/api/analytics?month=2024;rm").set(auth);
    expect(res.status).toBe(400);
    expect(execFile).not.toHaveBeenCalled();
  });

  it("retorna 500 si l'script falla", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    execFile.mockImplementation((bin, args, opts, cb) => cb(new Error("boom"), "", "Traceback"));
    const res = await request(app).get("/api/analytics?month=2026-11").set(auth);
    expect(res.status).toBe(500);
  });
});
