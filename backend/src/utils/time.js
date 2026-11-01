// backend/src/utils/time.js
// RNF14: el servidor es la única fuente de hora (zona America/Bogota), nunca el dispositivo.
// Las fechas se manejan como texto "YYYY-MM-DD", horas "HH:MM:SS" y fecha-hora "YYYY-MM-DD HH:MM:SS".

const pad = (n) => String(n).padStart(2, "0");
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Fecha y hora actual en Bogotá. */
export const nowBogota = () => {
  const p = Object.fromEntries(
    fmt.formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  const date = `${p.year}-${p.month}-${p.day}`;
  const time = `${p.hour}:${p.minute}:${p.second}`;
  return { date, time, datetime: `${date} ${time}` };
};

/** "18:00" -> "18:00:00" */
export const normTime = (t) => (t.length === 5 ? `${t}:00` : t);
export const toMin = (t) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};
export const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;

const parse = (dt) => new Date(`${dt.replace(" ", "T")}Z`); // se trata como UTC solo para hacer aritmética
const format = (d) => d.toISOString().slice(0, 19).replace("T", " ");

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const addMinutes = (datetime, minutes) =>
  format(new Date(parse(datetime).getTime() + minutes * 60000));
/** Segundos desde `a` hasta `b` (positivo si b es posterior). */
export const diffSeconds = (a, b) => Math.round((parse(b) - parse(a)) / 1000);
/** 'finde' para sábado y domingo, 'semana' en los demás días.
 *  Si se pasa `holidays` (array de fechas 'YYYY-MM-DD'), los festivos se tratan como 'festivo'. */
export const dayType = (dateStr, holidays = []) => {
  if (holidays.includes(dateStr)) return "festivo";
  const d = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6 ? "finde" : "semana";
};

/** Verifica si una fecha es festivo. */
export const isHoliday = (dateStr, holidays = []) => holidays.includes(dateStr);
export const isDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s));
export const isTime = (s) =>
  typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);
