// frontend/src/utils/format.js
/** Pantalla inicial según el rol. */
export const homeFor = (role) => {
  switch (role) {
    case "administrador":
    case "dueno":
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
    dueno: "Dueño",
    vigilancia: "Vigilancia",
    cliente: "Cliente",
  })[role] ?? role;

/**
 * ← NUEVO: etiqueta legible del estado de una reserva.
 * `en_curso` se muestra como "Vigente".
 */
export const statusLabel = (status) =>
  ({
    procesando: "Procesando",
    ocupada: "Ocupada",
    en_curso: "Vigente",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
    vencida: "Vencida",
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
