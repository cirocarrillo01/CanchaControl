// backend/src/validators/domain.validator.js
// Validadores de entrada del dominio (canchas, tarifas, configuración).
// Todos retornan { error: string | null, data: object | null }.

const phoneRegex = /^[0-9+\-]{7,15}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const COURT_STATUS = ["activa", "inactiva", "mantenimiento"];
const DAY_TYPES = ["semana", "finde"];

const isPosInt = (n) => Number.isInteger(Number(n)) && Number(n) > 0;

/** RF06: crear/editar cancha. */
export const validateCourt = ({ name, description, status }) => {
  if (!name || typeof name !== "string" || name.trim().length < 2)
    return {
      error: "El nombre de la cancha debe tener al menos 2 caracteres",
      data: null,
    };
  if (description != null && typeof description !== "string")
    return { error: "Descripción inválida", data: null };
  if (!COURT_STATUS.includes(status))
    return {
      error: `Estado inválido. Debe ser: ${COURT_STATUS.join(", ")}`,
      data: null,
    };
  return {
    error: null,
    data: {
      name: name.trim(),
      description: (description ?? "").trim() || null,
      status,
    },
  };
};

/** RF08: crear/editar tarifa. */
export const validateRate = ({
  court_id,
  day_type,
  start_time,
  end_time,
  price,
}) => {
  if (court_id != null && !isPosInt(court_id))
    return { error: "court_id inválido", data: null };
  if (!DAY_TYPES.includes(day_type))
    return { error: `day_type debe ser: ${DAY_TYPES.join(" o ")}`, data: null };
  if (!timeRegex.test(start_time) || !timeRegex.test(end_time))
    return {
      error: "Las horas deben tener formato HH:MM o HH:MM:SS",
      data: null,
    };
  const toMin = (t) => {
    const [h, m] = t.split(":");
    return Number(h) * 60 + Number(m);
  };
  if (toMin(start_time) >= toMin(end_time))
    return {
      error: "La hora de inicio debe ser menor que la de fin",
      data: null,
    };
  if (!isPosInt(price))
    return { error: "El precio debe ser un entero positivo", data: null };
  const pad = (t) => (t.length === 5 ? `${t}:00` : t);
  return {
    error: null,
    data: {
      court_id: court_id != null ? Number(court_id) : null,
      day_type,
      start_time: pad(start_time),
      end_time: pad(end_time),
      price: Number(price),
    },
  };
};

/** RF07: configuración general. */
export const validateSettings = (body) => {
  if (!body || typeof body !== "object")
    return { error: "Cuerpo inválido", data: null };

  const clean = {};
  for (const key of ["open_time", "close_time"]) {
    if (body[key] !== undefined) {
      if (!timeRegex.test(body[key]))
        return { error: `${key} debe tener formato HH:MM`, data: null };
      clean[key] = body[key].length === 5 ? `${body[key]}:00` : body[key];
    }
  }
  if (clean.open_time && clean.close_time) {
    const toMin = (t) => {
      const [h, m] = t.split(":");
      return Number(h) * 60 + Number(m);
    };
    if (toMin(clean.open_time) >= toMin(clean.close_time))
      return { error: "open_time debe ser menor que close_time", data: null };
  }
  for (const key of [
    "block_minutes",
    "online_hold_minutes",
    "min_cancel_hours",
  ]) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n <= 0)
        return { error: `${key} debe ser un número positivo`, data: null };
      clean[key] = Math.floor(n);
    }
  }
  if (body.business_name !== undefined) {
    if (
      typeof body.business_name !== "string" ||
      body.business_name.trim().length < 2
    )
      return { error: "business_name inválido", data: null };
    clean.business_name = body.business_name.trim();
  }
  if (Object.keys(clean).length === 0)
    return { error: "No hay valores para actualizar", data: null };
  return { error: null, data: clean };
};

/** RF08: crear/editar día festivo. */
export const validateHoliday = ({ holiday_date, name }) => {
  if (!holiday_date || !/^\d{4}-\d{2}-\d{2}$/.test(holiday_date))
    return { error: "Fecha inválida (YYYY-MM-DD)", data: null };
  if (!name || typeof name !== "string" || name.trim().length < 2)
    return { error: "El nombre del festivo debe tener al menos 2 caracteres", data: null };
  return {
    error: null,
    data: { holiday_date, name: name.trim() },
  };
};
