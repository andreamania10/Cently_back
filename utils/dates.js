// Regles de dates de l'app. L'app es va crear el 2026: no hi ha res abans.
const APP_START_YEAR = 2026;

const pad = (n) => String(n).padStart(2, "0");

/** Data local d'avui en format YYYY-MM-DD (no UTC, perquè a les 00:30 no sigui "ahir"). */
function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentMonth(now = new Date()) {
  return todayISO(now).slice(0, 7);
}

function currentYear(now = new Date()) {
  return now.getFullYear();
}

/** Comprova que una cadena YYYY-MM-DD és una data real (no 2026-02-31). */
function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Es pot afegir/esborrar una despesa amb aquesta data? Només l'any en curs i fins avui. */
function isEditableDate(dateISO, now = new Date()) {
  return dateISO >= `${currentYear(now)}-01-01` && dateISO <= todayISO(now);
}

/** Es pot consultar aquest mes? Des de gener de 2026 fins al mes actual. */
function isViewableMonth(month, now = new Date()) {
  return month >= `${APP_START_YEAR}-01` && month <= currentMonth(now);
}

module.exports = { APP_START_YEAR, todayISO, currentMonth, currentYear, isRealDate, isEditableDate, isViewableMonth };
