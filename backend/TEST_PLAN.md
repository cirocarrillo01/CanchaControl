# 🧪 Plan de Pruebas — CanchaControl

Este documento define la estrategia, alcance y casos de prueba para el backend de **CanchaControl** (API Node.js + Express + MySQL).

---

## 1. Objetivo

Validar que las reglas de negocio, endpoints de API, integridad de base de datos y flujos críticos funcionen correctamente antes de cada despliegue.

---

## 2. Estrategia (Pirámide de Pruebas)

| Nivel | Herramienta | Qué prueba | Cantidad estimada |
|-------|-------------|------------|-------------------|
| **Unitario** | Jest | Funciones puras, utilidades, validadores | ~30 |
| **Integración (servicio)** | Jest + mysql2 (BD real o mock) | Lógica de servicios con BD | ~20 |
| **Integración (API)** | Supertest + Express | Endpoints HTTP, autenticación, matriz de permisos | ~25 |
| **End-to-End** | (pendiente) | Flujos completos cliente → admin | — |

**Enfoque:** 70% unitario, 25% integración API, 5% E2E (futuro).

---

## 3. Entorno de Pruebas

- **BD de prueba:** `cancha_control_test` (se crea automáticamente al correr `npm test`)
- **Variables de entorno:** `backend/tests/setup.js`
- **Correr pruebas:** `npm test` (backend)
- **Cobertura:** `npx jest --coverage`

---

## 4. Pruebas Unitarias (Backend)

Estas pruebas no requieren base de datos. Prueban lógica pura.

### 4.1 `src/utils/time.js` — `tests/time.test.js` ✅ (ya creado)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| `nowBogota` | Retorna fecha/hora correcta | — | `{ date, time, datetime }` con formato `YYYY-MM-DD` / `HH:MM:SS` |
| `dayType` sábado | Es fin de semana | `"2026-11-07"` | `"finde"` |
| `dayType` domingo | Es fin de semana | `"2026-11-08"` | `"finde"` |
| `dayType` lunes | Es semana | `"2026-11-09"` | `"semana"` |
| `dayType` festivo | Fecha en lista de festivos | `"2026-11-09", ["2026-11-09"]` | `"festivo"` |
| `isHoliday` verdadero | Fecha es festivo | `"2026-12-25", ["2026-12-25"]` | `true` |
| `isHoliday` falso | Fecha no es festivo | `"2026-12-24", ["2026-12-25"]` | `false` |
| `toMin` | Convierte hora a minutos | `"18:30:00"` | `1110` |
| `fromMin` | Convierte minutos a hora | `1110` | `"18:30:00"` |
| `addMinutes` | Suma minutos a datetime | `"2026-11-01 10:00:00", 90` | `"2026-11-01 11:30:00"` |
| `diffSeconds` | Diferencia en segundos | `"10:00:00", "10:05:00"` | `300` |
| `isDate` válido | Fecha con formato correcto | `"2026-11-01"` | `true` |
| `isDate` inválido | Texto no es fecha | `"not-a-date"` | `false` |
| `isTime` válido | Hora con formato correcto | `"18:30"` / `"18:30:00"` | `true` |
| `isTime` inválido | Hora fuera de rango | `"25:00"` | `false` |

### 4.2 `src/utils/AppError.js` — `tests/AppError.test.js` (pendiente)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| `AppError` crear | Crea error con status y message | `400, "mensaje"` | Instancia con `.statusCode = 400`, `.message = "mensaje"` |
| `check` error | Lanza AppError si hay error | `{ error: "fallo", data: null }` | Lanza `AppError(400, "fallo")` |
| `check` ok | Retorna data si no hay error | `{ error: null, data: {a:1} }` | `{a:1}` |

### 4.3 `src/validators/domain.validator.js` — `tests/domain.validator.test.js` (pendiente)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| `validateCourt` válido | Cancha correcta | `{name:"Cancha 1", status:"activa"}` | `{error:null, data:{name:"Cancha 1",...}}` |
| `validateCourt` nombre corto | Nombre < 2 chars | `{name:"A", status:"activa"}` | `error` no nulo |
| `validateCourt` estado inválido | Estado no permitido | `{name:"X", status:"otro"}` | `error` no nulo |
| `validateRate` válido | Tarifa correcta | `{day_type:"semana", start_time:"08:00", end_time:"17:00", price:50000}` | `data` con valores normalizados |
| `validateRate` start >= end | Hora inicio >= fin | `{start_time:"17:00", end_time:"17:00"}` | `error` |
| `validateSettings` válido | Config correcta | `{open_time:"08:00", close_time:"23:00"}` | `data` con `:00` agregado si falta |
| `validateHoliday` válido | Festivo correcto | `{holiday_date:"2026-12-25", name:"Navidad"}` | `data` |
| `validateHoliday` fecha inválida | Formato incorrecto | `{holiday_date:"25-12-2026"}` | `error` |

### 4.4 `src/validators/user.validator.js` — `tests/user.validator.test.js` (pendiente)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| `validateRegister` válido | Registro completo | Todos los campos válidos + `accept_terms:true` | `data` |
| `validateRegister` sin términos | `accept_terms !== true` | `{accept_terms:false}` | `error` |
| `validateLogin` válido | Login correcto | `{email:"a@b.com", password:"x"}` | `data` |
| `validatePasswordChange` válido | Cambio de contraseña | `{current_password:"x", new_password:"Abc12345"}` | `data` |
| `validateUserAdmin` crear | Crear usuario admin | `{name:"X", email:"a@b.com", role:"administrador", password:"Abc12345"}` | `data` |

### 4.5 `src/services/schedule.service.js` — `tests/schedule.test.js` ✅ (ya creado)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| `priceFor` semana mañana | Tarifa semana 08-17 | fecha lunes, 10:00 | `50000` |
| `priceFor` semana tarde | Tarifa semana 17-23 | fecha lunes, 19:00 | `70000` |
| `priceFor` finde | Tarifa fin de semana | fecha sábado, 10:00 | `60000` |
| `priceFor` festivo | Tarifa festivo | fecha en holidays, 10:00 | `90000` |
| `priceFor` sin tarifa | No hay tarifa que coincida | `[]` | `0` |
| `buildBlocks` 60 min | 4 bloques de 1 hora | 08:00-12:00, 60 min | 4 bloques |
| `buildBlocks` 30 min | 8 bloques de 30 min | 08:00-10:00, 30 min | 8 bloques |
| `resolveSpan` válido | Retorna minutos | `60` | `60` |
| `resolveSpan` inválido | Default a 60 | `null` / `undefined` / `0` | `60` |

---

## 5. Pruebas de Integración — Servicios (con BD)

Estas pruebas requieren una base de datos de prueba (`cancha_control_test`).

### 5.1 `src/services/booking.service.js` — `tests/booking.service.integration.test.js` (pendiente)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| Crear reserva admin | Reserva confirmada | datos válidos, rol admin | `status: "confirmada"`, `code` generado |
| Crear reserva cliente | Reserva en procesamiento | datos válidos, rol cliente | `status: "procesando"`, `expires_at` seteado |
| Doble reserva | Misma cancha/fecha/hora dos veces | 2 reservas idénticas | Segunda falla con `ER_DUP_ENTRY` → 409 |
| Reservar pasado | Fecha/hora anterior a ahora | fecha ayer | `AppError(400, "No se puede reservar un horario pasado")` |
| Precio festivo | Reserva en día festivo | fecha en `holidays` | `price_total` usa tarifa `festivo` |
| Reprogramar reserva | Cambiar fecha/hora | reserva existente, nueva fecha | Slots viejos borrados, nuevos creados |
| Cancelar reserva cliente | Con anticipación mínima | reserva cliente, > 2h antes | `status: "cancelada"` |
| Cancelar reserva cliente | Sin anticipación | reserva cliente, < 2h antes | `AppError(409)` |
| Confirmar reserva | Procesando → confirmada | reserva `procesando`, admin | `status: "confirmada"` |
| Iniciar cronómetro | confirmada → en_curso | reserva `confirmada` | `status: "en_curso"`, `timer_started_at` seteado |
| Iniciar cronómetro ya iniciado | Doble inicio | reserva `en_curso` | `AppError(409)` |
| Finalizar turno | en_curso → finalizada | reserva `en_curso` | `status: "finalizada"`, `finished_at` seteado |
| Registrar pago | Pago válido | monto <= saldo | Pago creado, `payment_status: "pagado"` |
| Pago excede saldo | Monto > saldo pendiente | monto mayor al saldo | `AppError(400)` |
| Crear bloqueo | Bloqueo manual | cancha, fecha, hora | `court_slots` con `kind: "bloqueo"` |
| Eliminar bloqueo | Solo bloqueos manuales | slot de tipo `bloqueo` | Slot eliminado |
| Eliminar reserva como bloqueo | No se puede | slot de tipo `reserva` | `AppError(400)` |

### 5.2 `src/services/report.service.js` — `tests/report.service.integration.test.js` (pendiente)

| Caso | Descripción | Entrada | Esperado |
|------|-------------|---------|----------|
| `incomeReport` | Ingresos por rango | `from`, `to` | `{days: [...], total: number}` |
| `usageReport` | Uso por cancha | `from`, `to` | `{courts: [{id, name, total, completadas, canceladas}]}` |
| `statusReport` | Reservas por estado | `from`, `to` | `{statuses: [{status, count}]}` |

---

## 6. Pruebas de Integración — API (Supertest)

Estas pruebas levantan el servidor Express y prueban los endpoints HTTP reales.

### 6.1 Autenticación (`/api/auth`) — `tests/auth.integration.test.js` (pendiente)

| Caso | Método | Endpoint | Esperado |
|------|--------|----------|----------|
| Login exitoso | POST | `/api/auth/login` | `200`, `{success:true, token, user}` |
| Login fallido | POST | `/api/auth/login` | `401` |
| Registro cliente | POST | `/api/auth/register` | `201`, rol `cliente` |
| Registro sin términos | POST | `/api/auth/register` | `400` |
| Obtener perfil | GET | `/api/auth/me` (con token) | `200`, usuario |
| Cambiar contraseña | PUT | `/api/auth/password` (con token) | `200` |
| Bloqueo tras 5 fallos | POST ×5 | `/api/auth/login` | 5to intento → `423` bloqueado |

### 6.2 Usuarios (`/api/users`) — `tests/users.integration.test.js` (pendiente)

| Caso | Método | Endpoint | Rol | Esperado |
|------|--------|----------|-----|----------|
| Listar usuarios | GET | `/api/users` | admin | `200`, lista paginada |
| Crear usuario | POST | `/api/users` | admin | `201`, usuario creado |
| Editar usuario | PUT | `/api/users/:id` | admin | `200`, usuario actualizado |
| Listar usuarios | GET | `/api/users` | cliente | `403` |
| Paginación | GET | `/api/users?page=2&limit=5` | admin | `totalPages` correcto |

### 6.3 Reservas (`/api/bookings`) — `tests/bookings.integration.test.js` (pendiente)

| Caso | Método | Endpoint | Rol | Esperado |
|------|--------|----------|-----|----------|
| Listar reservas | GET | `/api/bookings` | admin | `200`, `{data, total, page, limit, totalPages}` |
| Listar mis reservas | GET | `/api/bookings` | cliente | Solo reservas del cliente |
| Crear reserva | POST | `/api/bookings` | cliente | `201`, `status: procesando` |
| Detalle reserva | GET | `/api/bookings/:id` | cliente | `200` si es suya, `403` si no |
| Confirmar | POST | `/api/bookings/:id/confirm` | admin | `200`, `status: confirmada` |
| Cancelar | POST | `/api/bookings/:id/cancel` | admin/cliente | `200`, `status: cancelada` |
| Pagar | POST | `/api/bookings/:id/payments` | admin | `201` |
| Iniciar timer | POST | `/api/bookings/:id/timer/start` | admin | `200`, `status: en_curso` |
| Finalizar | POST | `/api/bookings/:id/finish` | admin | `200`, `status: finalizada` |
| Check-in | POST | `/api/bookings/:id/checkin` | vigilancia | `200`, `checked_in_at` seteado |
| Reservas hoy | GET | `/api/bookings/today` | admin/vigilancia | `200`, reservas de hoy |
| Timers | GET | `/api/bookings/timers` | admin | `200`, timers activos |

### 6.4 Configuración (`/api/courts`, `/api/settings`, `/api/rates`, `/api/holidays`) — `tests/config.integration.test.js` (pendiente)

| Caso | Método | Endpoint | Rol | Esperado |
|------|--------|----------|-----|----------|
| Listar canchas | GET | `/api/courts` | público | `200` (sin inactivas) |
| Crear cancha | POST | `/api/courts` | admin | `201` |
| Listar settings | GET | `/api/settings` | público | `200` |
| Actualizar settings | PUT | `/api/settings` | admin | `200` |
| Listar tarifas | GET | `/api/rates` | admin/dueno | `200` |
| Crear tarifa | POST | `/api/rates` | admin | `201` |
| Listar festivos | GET | `/api/holidays` | público | `200` |
| Crear festivo | POST | `/api/holidays` | admin | `201` |
| Eliminar festivo | DELETE | `/api/holidays/:id` | admin | `200` |

### 6.5 Reportes (`/api/reports`) — `tests/reports.integration.test.js` (pendiente)

| Caso | Método | Endpoint | Rol | Esperado |
|------|--------|----------|-----|----------|
| Ingresos | GET | `/api/reports/income` | admin/dueno | `200`, `{days, total}` |
| Uso por cancha | GET | `/api/reports/usage` | admin/dueno | `200`, `{courts}` |
| Por estado | GET | `/api/reports/status` | admin/dueno | `200`, `{statuses}` |

### 6.6 Disponibilidad (`/api/availability`) — `tests/availability.integration.test.js` (pendiente)

| Caso | Método | Endpoint | Esperado |
|------|--------|----------|----------|
| Disponibilidad pública | GET | `/api/availability?date=...` | `200`, `{courts: [{blocks: [...]}]}` |
| Bloque festivo | GET | `/api/availability?date=festivo` | Bloques con `festivo: true`, precio festivo |

---

## 7. Criterios de Aceptación

- [ ] Todas las pruebas unitarias pasan (0 fallos)
- [ ] Todas las pruebas de integración pasan contra BD de prueba
- [ ] Cobertura mínima: 80% de líneas, 70% de funciones
- [ ] Los endpoints críticos (reservas, pagos, auth) tienen 100% de cobertura de ramas
- [ ] No hay errores 500 no controlados en rutas probadas

---

## 8. Cómo Ejecutar

```bash
# Backend
cd backend

# Instalar dependencias de prueba (una sola vez)
npm install

# Crear .env de prueba (copiar del example y ajustar DB_NAME=cancha_control_test)
cp .env.example .env

# Ejecutar todas las pruebas
npm test

# Ejecutar con reporte de cobertura
npx jest --coverage

# Ejecutar solo un archivo de prueba
npx jest tests/time.test.js
```

---

## 9. Archivos de Prueba por Crear

```
backend/tests/
├── setup.js                 ✅ ya creado (variables de entorno)
├── time.test.js             ✅ ya creado (unitario)
├── schedule.test.js         ✅ ya creado (unitario)
├── auth.test.js             ⚠️ esqueleto (integración ligera)
├── AppError.test.js         ⬜ pendiente (unitario)
├── domain.validator.test.js ⬜ pendiente (unitario)
├── user.validator.test.js   ⬜ pendiente (unitario)
├── booking.service.integration.test.js ⬜ pendiente (servicio + BD)
├── report.service.integration.test.js ⬜ pendiente (servicio + BD)
├── auth.integration.test.js ⬜ pendiente (API + Supertest)
├── users.integration.test.js ⬜ pendiente (API + Supertest)
├── bookings.integration.test.js ⬜ pendiente (API + Supertest)
├── config.integration.test.js ⬜ pendiente (API + Supertest)
├── reports.integration.test.js ⬜ pendiente (API + Supertest)
└── availability.integration.test.js ⬜ pendiente (API + Supertest)
```

---

## 10. Métricas y Reporte

Después de correr `npx jest --coverage`, se genera `coverage/lcov-report/index.html` con:
- Porcentaje de líneas cubiertas por archivo
- Funciones no probadas
- Ramas no cubiertas

**Objetivo:** `coverage/` debe mostrar ≥80% global antes de considerar el backend listo para producción.
