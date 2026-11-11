const { todayISO, isRealDate, isEditableDate, isViewableMonth } = require("../utils/dates");

const now = new Date(2026, 10, 11, 0, 30); // 11 de novembre de 2026, 00:30 hora local

describe("utils/dates", () => {
  it("todayISO fa servir l'hora local", () => {
    expect(todayISO(now)).toBe("2026-11-11");
  });

  it("isRealDate rebutja dates impossibles", () => {
    expect(isRealDate("2026-02-28")).toBe(true);
    expect(isRealDate("2026-02-31")).toBe(false);
    expect(isRealDate("12/10/2026")).toBe(false);
  });

  it("isEditableDate: només l'any en curs i fins avui", () => {
    expect(isEditableDate("2026-01-01", now)).toBe(true);
    expect(isEditableDate("2026-10-12", now)).toBe(true);
    expect(isEditableDate("2026-11-11", now)).toBe(true);
    expect(isEditableDate("2026-11-12", now)).toBe(false); // futur
    expect(isEditableDate("2025-12-31", now)).toBe(false); // any anterior
  });

  it("l'any següent, l'any anterior queda en només lectura", () => {
    const nextYear = new Date(2027, 1, 3);
    expect(isEditableDate("2026-12-20", nextYear)).toBe(false);
    expect(isEditableDate("2027-01-15", nextYear)).toBe(true);
  });

  it("isViewableMonth: des de gener de 2026 fins al mes actual", () => {
    expect(isViewableMonth("2026-01", now)).toBe(true);
    expect(isViewableMonth("2025-12", now)).toBe(false);
    expect(isViewableMonth("2026-12", now)).toBe(false);
  });
});
