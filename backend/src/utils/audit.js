// backend/src/utils/audit.js
import { nowBogota } from "./time.js";

/**
 * RF44 / RNF15: registra quién hizo qué y cuándo.
 * `db` puede ser el pool o una conexión de transacción (así la auditoría
 * se confirma o se revierte junto con la acción).
 */
export const logAction = (
  db,
  { entity, entityId, action, userId = null, detail = null },
) =>
  db.query(
    "INSERT INTO audit_log (entity, entity_id, action, user_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      entity,
      entityId,
      action,
      userId,
      detail ? JSON.stringify(detail) : null,
      nowBogota().datetime,
    ],
  );
