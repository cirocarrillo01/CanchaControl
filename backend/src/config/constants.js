// backend/src/config/constants.js
// Roles del sistema (coinciden con el ENUM de users.role).
export const ROLES = {
  ADMIN: "administrador",
  CLIENT: "cliente",
  OWNER: "auditor",
  GUARD: "vigilancia",
};
export const STAFF_ROLES = [ROLES.ADMIN, ROLES.OWNER, ROLES.GUARD];
export const MAX_LOGIN_ATTEMPTS = 5; // RNF06
export const LOCK_MINUTES = 15; // RNF06
export const MAX_PENDING_ONLINE = 3; // freno a reservas en línea "falsas" (HU18)

