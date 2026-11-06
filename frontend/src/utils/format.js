// frontend/src/utils/format.js
/** Pantalla inicial según el rol. */
export const homeFor = (role) => {
  switch (role) {
    case "administrador":
    case "auditor":
      return "/app/reservas";
    case "vigilancia":
      return "/app/hoy";
    case "cliente":
    default:
      return "/app/agenda";
  }
};

export const roleLabel = (role) =>
  ({
    administrador: "Administrador",
    auditor: "Auditor",
    vigilancia: "Vigilancia",
    cliente: "Cliente",
  })[role] ?? role;

export const statusLabel = (status) =>
  ({
    procesando: "Procesando",
    ocupada: "Ocupada",
    en_curso: "Vigente",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
    vencida: "Vencida",
    no_show: "No Show",
    reembolsada: "Reembolsada",
  })[status] ?? status;

export const fmtMoney = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

export const fmtDate = (date) => {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
};

export const fmtTime = (t) => (t ? t.slice(0, 5) : "—");

/**
 * Formatea el `period` que devuelve /api/reports/income según el groupBy.
 *   day   → "2026-11-02"    → "02/11/2026"
 *   week  → "2026-W44"      → "Semana 44 / 2026"
 *   month → "2026-11"       → "Nov 2026"
 */
const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
export const fmtPeriod = (period, groupBy = "day") => {
  if (!period) return "—";
  if (groupBy === "month") {
    const [y, m] = period.split("-");
    return `${MESES[Number(m) - 1] ?? m} ${y}`;
  }
  if (groupBy === "week") {
    const [y, w] = period.split("-");
    return `Semana ${String(w).replace(/^W/i, "")} / ${y}`;
  }
  return fmtDate(period);
};


