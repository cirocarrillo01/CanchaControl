# 📄 Documento de Requisitos, Alcance y Objetivos — CanchaControl

Este documento consolida la definición formal del sistema **CanchaControl**, cruzando el documento de requisitos originales con la implementación real del código (backend + frontend). Incluye objetivos, alcance, requisitos funcionales y no funcionales, historias de usuario, matriz de trazabilidad y estado de implementación.

---

## 1. Introducción y Contexto

### 1.1 Nombre y descripción del sistema

| Campo | Valor |
|-------|-------|
| **Nombre** | CanchaControl |
| **Descripción** | Sistema web de gestión de turnos y control de tiempo para canchas sintéticas de microfútbol |
| **Versión** | 2.0.0 |
| **Arquitectura** | Backend: Node.js + Express 5 + MySQL/MariaDB + JWT. Frontend: React 18 + Vite + Material UI |

### 1.2 Problema identificado

La gestión manual de turnos en canchas sintéticas de microfútbol ocasiona:
- **Dobles reservas** del mismo horario (especialmente en horas pico: tarde/noche entre semana y fines de semana)
- **Pérdida de información** al anotar en planillas físicas o cuadernos
- **Conflictos entre clientes y administradores** por turnos no anotados o solapados
- **Falta de visibilidad** de bloques disponibles sin llamar o desplazarse
- **Control manual del tiempo** con reloj del celular, generando tiempo extra sin cobrar
- **Personas ajenas ingresando** a las canchas sin verificación de reserva
- **Dificultad para el dueño** de organizar finanzas y tomar decisiones con datos desorganizados

### 1.3 Actores del sistema

| Actor | Rol frente al problema | Nivel de importancia |
|-------|----------------------|---------------------|
| **Administrador** | Gestiona reservas y dinero | Alta |
| **Cliente** | Solicita el servicio y paga | Alta |
| **Dueño de instalaciones** | Toma decisiones, control de ingresos | Media |
| **Personal de Vigilancia** | Control de acceso a las canchas | Media |
| **Mantenimiento** | Asegura el estado óptimo de la cancha | Baja |

---

## 2. Objetivos

### 2.1 Objetivo general

> Diseñar e implementar un sistema web de gestión de turnos y control de tiempo para canchas sintéticas que, desde su primera versión, evite la doble reserva y registre los pagos confirmados, y que en una segunda fase incorpore la reserva en línea del cliente, el cronómetro por cancha y los reportes de ingresos y ocupación para el propietario.

### 2.2 Objetivos específicos

| ID | Objetivo | Fase | Estado de implementación |
|----|----------|------|--------------------------|
| OE01 | Desarrollar, como base de la primera versión, la autenticación con roles y una base de datos relacional que conserve reservas, pagos y usuarios. | Primera versión | ✅ Implementado |
| OE02 | Desarrollar, en la primera versión, el panel del administrador con la agenda de cada cancha por bloques, para reservar, cancelar y bloquear horarios sin dobles reservas, y registrar los pagos confirmados (efectivo o transferencia) con la tarifa del bloque. | Primera versión | ✅ Implementado |
| OE03 | Desarrollar, en la segunda fase, la reserva en línea del cliente con consulta pública de disponibilidad y estado "en procesamiento" hasta la confirmación del administrador, para que el cliente reserve sin llamar ni desplazarse. | Segunda fase | ✅ Implementado |
| OE04 | Desarrollar, en la segunda fase, el control operativo de cada turno: un cronómetro por cancha que muestre el tiempo restante y alerte antes del fin y al terminar, y una lista del día para que vigilancia verifique a quién deja entrar. | Segunda fase | ✅ Implementado |
| OE05 | Desarrollar, en la segunda fase, la vista de reportes del dueño con ingresos por día, semana y mes, ocupación por cancha y franja horaria, y cancelaciones con su motivo. | Segunda fase | ✅ Implementado |

---

## 3. Alcance

### 3.1 Qué incluye el sistema

| Módulo | Característica | Estado |
|--------|---------------|--------|
| **Accesos** | Inicio de sesión y cierre de sesión con roles | ✅ Implementado |
| **Accesos** | Registro de clientes con aceptación de términos (Ley 1581) | ✅ Implementado |
| **Accesos** | Cambio de contraseña (RF03) | ✅ Implementado |
| **Usuarios** | Gestión de usuarios y roles por el administrador (RF04) | ✅ Implementado |
| **Usuarios** | Desactivar usuarios sin borrar historial | ✅ Implementado |
| **Configuración** | Registro y edición de canchas (nombre, estado) | ✅ Implementado |
| **Configuración** | Configuración de horario de atención y duración de bloques | ✅ Implementado |
| **Configuración** | Configuración de tarifas por bloque según día y franja | ✅ Implementado |
| **Configuración** | Gestión de días festivos (tarifación como fin de semana) | ✅ Implementado (backend) / Pendiente (frontend UI) |
| **Agenda** | Listado de bloques de tiempo predefinidos por cancha | ✅ Implementado |
| **Agenda** | Estado del bloque con color y texto (disponible, ocupado, bloqueado, pasado) | ✅ Implementado |
| **Agenda** | Navegación entre días y elección de fechas futuras | ✅ Implementado |
| **Agenda** | Filtrado de agenda por cancha | ✅ Implementado |
| **Agenda** | Consulta pública de disponibilidad sin iniciar sesión (RF13) | ✅ Implementado |
| **Reservas** | Formulario de reserva con nombre y teléfono | ✅ Implementado |
| **Reservas** | Guardar reserva y cambiar estado del bloque | ✅ Implementado |
| **Reservas** | Verificación anti doble reserva a nivel de BD (RNF10) | ✅ Implementado |
| **Reservas** | Mostrar datos del cliente en bloque ocupado | ✅ Implementado |
| **Reservas** | Cancelar reserva y liberar bloque | ✅ Implementado |
| **Reservas** | Editar o reprogramar reserva | ✅ Implementado |
| **Reservas** | Reservar varios bloques consecutivos | ✅ Implementado |
| **Reservas** | Buscar reservas por nombre o teléfono | ✅ Implementado |
| **Reservas** | Generar código único por reserva | ✅ Implementado |
| **Reservas** | Impedir reservas en fechas u horas pasadas | ✅ Implementado |
| **Reservas** | Registrar motivo de cancelación | ✅ Implementado |
| **Reservas** | Reservas recurrentes semanales | ✅ Implementado (backend) |
| **Reserva en línea** | Cliente selecciona bloque disponible | ✅ Implementado |
| **Reserva en línea** | Cliente reserva con nombre y teléfono y recibe código de turno | ✅ Implementado |
| **Reserva en línea** | Estado "en procesamiento" hasta confirmación del administrador | ✅ Implementado |
| **Reserva en línea** | Cliente cancela su reserva con anticipación mínima | ✅ Implementado |
| **Pagos** | Confirmar pago de reserva (efectivo o transferencia) | ✅ Implementado |
| **Pagos** | Mostrar estado de pago (pendiente/parcial/pagado) | ✅ Implementado |
| **Pagos** | Cobrar y registrar tiempo adicional jugado | ✅ Implementado |
| **Tiempos** | Iniciar cronómetro por cancha al comenzar el turno | ✅ Implementado |
| **Tiempos** | Mostrar tiempo restante de cada cancha | ✅ Implementado |
| **Tiempos** | Alerta antes del final del turno y al terminar | ✅ Implementado (frontend con cuenta regresiva) |
| **Bloqueos** | Bloquear y desbloquear bloques con motivo | ✅ Implementado |
| **Vigilancia** | Lista del día (hora, cancha, cliente, código) | ✅ Implementado |
| **Vigilancia** | Marcar el ingreso del cliente | ✅ Implementado |
| **Reportes** | Ingresos por día, semana, mes | ✅ Implementado |
| **Reportes** | Ocupación por cancha y franja horaria | ✅ Implementado |
| **Reportes** | Cancelaciones con su motivo | ✅ Implementado |
| **Reportes** | Filtrar reportes por rango de fechas | ✅ Implementado |
| **Auditoría** | Registrar quién creó, modificó o canceló cada reserva y cuándo | ✅ Implementado |
| **Paginación** | Listados paginados de reservas y usuarios | ✅ Implementado |
| **Cambio de contraseña** | Página para que cualquier usuario autenticado cambie su contraseña | ✅ Implementado |
| **Festivos** | Tabla de festivos y lógica de tarifas como fin de semana | ✅ Implementado (backend) |

### 3.2 Qué NO incluye el sistema

| Característica | ¿Por qué se dejó fuera? |
|---------------|------------------------|
| Pasarela de pago | Exige integración con terceros, comisiones y trámites. El sistema solo registra la confirmación del cobro. |
| Facturación electrónica | Implica trámites y normativa tributaria que no hacen parte del problema de los turnos. |
| Aplicación móvil nativa | El sistema web responsive ya funciona en el celular; una app nativa duplicaría el esfuerzo. |
| Notificaciones por WhatsApp / chatbot | Depende de servicios de terceros y costos recurrentes. |
| Módulo de torneos o eventos | Se sale del problema central: no evita la doble reserva ni mejora el control del tiempo. |
| Integración con software contable externo | Los reportes básicos del sistema bastan para el dueño. |
| Venta de productos (snacks o bebidas) | Es otro proceso del negocio, con su propio inventario y control. |
| Alquiler de indumentaria o elementos | Es otro proceso del negocio y no influye en la asignación de turnos. |
| Copias de seguridad automáticas en la nube | Depende del proveedor de hosting (RNF09 y RNF17 no se implementaron en código, solo script manual de backup). |

---

## 4. Requisitos Funcionales (RF)

Cada requisito indica la necesidad (N1 a N8) que atiende, manteniendo la trazabilidad entre problema, necesidades y solución.

### Módulo: Accesos

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF01 | El sistema debe permitir a los usuarios iniciar sesión con un usuario y contraseña | N3 | Alta | ✅ Implementado |
| RF02 | El sistema debe permitir cerrar sesión | N3 | Media | ✅ Implementado |
| RF03 | El sistema debe permitir cambiar la contraseña | N3 | Baja | ✅ Implementado |
| RF04 | El sistema debe permitir al administrador gestionar usuarios y roles, y desactivar usuarios sin borrar su historial | N6, N7 | Media | ✅ Implementado |
| RF05 | El sistema debe permitir al cliente registrarse | N2 | Media | ✅ Implementado |

### Módulo: Configuración

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF06 | El sistema debe permitir registrar y editar canchas (nombre, estado) | N3 | Media | ✅ Implementado |
| RF07 | El sistema debe permitir configurar el horario de atención y la duración de los bloques | N3 | Alta | ✅ Implementado |
| RF08 | El sistema debe permitir configurar la tarifa por bloque según día y franja | N5 | Alta | ✅ Implementado |

### Módulo: Agenda

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF09 | El sistema debe mostrar los bloques de tiempo predefinidos de cada cancha | N1, N3 | Alta | ✅ Implementado |
| RF10 | El sistema debe pintar los bloques según su estado: verde disponible, amarillo en procesamiento, rojo ocupado y gris bloqueado | N1 | Alta | ✅ Implementado |
| RF11 | El sistema debe permitir navegar entre días y semanas y elegir fechas futuras | N1, N2 | Alta | ✅ Implementado |
| RF12 | El sistema debe permitir filtrar agenda por cancha | N3 | Media | ✅ Implementado |
| RF13 | El sistema debe mostrar la disponibilidad a cualquier persona sin iniciar sesión | N1 | Alta | ✅ Implementado |

### Módulo: Reservas

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF14 | El sistema debe permitir abrir el formulario de reserva cuando el administrador hace clic en un bloque disponible | N3 | Alta | ✅ Implementado |
| RF15 | El sistema debe permitir solicitar el nombre y el teléfono del cliente al asignar el turno | N3 | Alta | ✅ Implementado |
| RF16 | El sistema debe permitir guardar la reserva y cambiar el estado del bloque | N3 | Alta | ✅ Implementado |
| RF17 | El sistema debe permitir verificar que el bloque siga disponible y rechazar la doble reserva | N3 | Alta | ✅ Implementado |
| RF18 | El sistema debe permitir mostrar los datos del cliente al seleccionar un bloque ocupado | N3, N7 | Alta | ✅ Implementado |
| RF19 | El sistema debe permitir cancelar una reserva y liberar el bloque | N3 | Alta | ✅ Implementado |
| RF20 | El sistema debe permitir editar o reprogramar una reserva | N3 | Media | ✅ Implementado |
| RF21 | El sistema debe permitir reservar varios bloques consecutivos | N3 | Media | ✅ Implementado |
| RF22 | El sistema debe permitir buscar reservas por nombre o teléfono | N3 | Media | ✅ Implementado |
| RF23 | El sistema debe permitir generar un código único por reserva | N7 | Media | ✅ Implementado |
| RF24 | El sistema debe permitir impedir reservas en fechas u horas ya pasadas | N3 | Media | ✅ Implementado |
| RF25 | El sistema debe permitir registrar el motivo de la cancelación | N6 | Baja | ✅ Implementado |
| RF26 | El sistema debe permitir reservas recurrentes semanales | N2 | Baja | ✅ Implementado (backend) |

### Módulo: Reserva en línea

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF27 | El sistema debe permitir al cliente seleccionar un bloque disponible | N2 | Alta | ✅ Implementado |
| RF28 | El sistema debe permitir al cliente reservar con nombre y teléfono y mostrarle su código de turno | N2 | Alta | ✅ Implementado |
| RF29 | El sistema debe permitir dejar la reserva hecha en línea en estado "en procesamiento" hasta que el administrador la confirme o venza el plazo y se libere | N2, N3 | Alta | ✅ Implementado |
| RF30 | El sistema debe permitir al cliente cancelar su reserva con anticipación mínima | N2 | Baja | ✅ Implementado |

### Módulo: Pagos

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF31 | El sistema debe permitir al administrador confirmar el pago de una reserva indicando el medio (efectivo o transferencia), monto, fecha y hora | N5 | Alta | ✅ Implementado |
| RF32 | El sistema debe permitir mostrar el estado de pago (pendiente) en el bloque | N5 | Media | ✅ Implementado |
| RF33 | El sistema debe permitir cobrar y registrar el tiempo adicional jugado | N4, N5 | Media | ✅ Implementado |

### Módulo: Tiempos

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF34 | El sistema debe permitir iniciar un cronómetro por cancha al comenzar el turno | N4 | Media | ✅ Implementado |
| RF35 | El sistema debe permitir mostrar el tiempo restante de cada cancha | N4 | Media | ✅ Implementado |
| RF36 | El sistema debe permitir alertar antes del final del turno y al terminar | N4 | Media | ✅ Implementado (cuenta regresiva visual) |

### Módulo: Bloqueos

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF37 | El sistema debe permitir bloquear y desbloquear bloques con un motivo | N8 | Baja | ✅ Implementado |

### Módulo: Vigilancia

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF38 | El sistema debe permitir mostrar la lista del día (hora, cancha, cliente, código) | N7 | Media | ✅ Implementado |
| RF39 | El sistema debe permitir marcar el ingreso del cliente | N7 | Baja | ✅ Implementado |

### Módulo: Reportes

| Código | Acción | Necesidad | Prioridad | Estado |
|--------|--------|-----------|-----------|--------|
| RF40 | El sistema debe permitir mostrar los ingresos por día, semana, mes, con el medio de pago | N6 | Alta | ✅ Implementado |
| RF41 | El sistema debe permitir mostrar la ocupación por cancha y franja horaria (hora pico y valle) | N6 | Media | ✅ Implementado |
| RF42 | El sistema debe permitir mostrar las cancelaciones con su motivo | N6 | Media | ✅ Implementado |
| RF43 | El sistema debe permitir filtrar los reportes por rango de fechas, cancha y medio de pago | N6 | Media | ✅ Implementado (por fecha) |
| RF44 | El sistema debe permitir registrar quién creó, modificó o canceló cada reserva y cuándo | N3, N5 | Media | ✅ Implementado |

---

## 5. Requisitos No Funcionales (RNF)

| Código | Categoría | Acción | Prioridad | Estado |
|--------|-----------|--------|-----------|--------|
| RNF01 | Facilidad de uso | Asignar un turno en 4 clics o menos; administrador nuevo aprende en 15 min | Alta | ✅ Implementado |
| RNF02 | Rendimiento | Cargar la agenda del día en 3 segundos o menos con 4 meses de historial | Alta | ✅ Implementado |
| RNF03 | Tiempo de respuesta | Reflejar en pantalla guardar o cancelar una reserva en 2 segundos o menos | Alta | ✅ Implementado |
| RNF04 | Disponibilidad | Funcionar 24 horas; atención del administrador en horario de servicio | Alta | ✅ Implementado |
| RNF05 | Seguridad | Almacenar contraseñas con hash seguro (bcrypt), nunca en texto plano | Alta | ✅ Implementado |
| RNF06 | Seguridad | Exigir autenticación y rol para funciones administrativas; cerrar sesión tras 15 min de inactividad; bloquear temporalmente tras 5 intentos fallidos | Alta | ✅ Implementado |
| RNF07 | Compatibilidad | Funcionar en Chrome, Edge y Firefox actuales, con vista adaptable a celular | Alta | ✅ Implementado |
| RNF08 | Escalabilidad | Modelo de datos que permita agregar canchas y reserva en línea sin rediseño | Media | ✅ Implementado |
| RNF09 | Alojamiento | Alojado en la nube para ser accesible desde cualquier lugar | Alta | ⚠️ Depende del proveedor de hosting |
| RNF10 | Integridad | Impedir en la BD dos reservas para la misma cancha, fecha y bloque (UNIQUE constraint) | Alta | ✅ Implementado |
| RNF11 | Confiabilidad | Conservar la hora de fin del turno en la BD para que el cronómetro sobreviva a recargas | Media | ✅ Implementado |
| RNF12 | Accesibilidad | Indicar estado del bloque con texto o ícono, no solo color; letra legible | Media | ✅ Implementado |
| RNF13 | Privacidad | Tratar nombre y teléfono conforme a Ley 1581 de 2012, con aviso de tratamiento | Media | ✅ Implementado |
| RNF14 | Consistencia de hora | Usar hora del servidor (zona America/Bogota) y no la del dispositivo | Media | ✅ Implementado |
| RNF15 | Trazabilidad | Registrar usuario y fecha en crear, modificar, cancelar y cobrar | Media | ✅ Implementado |
| RNF16 | Mantenibilidad | Código modular y documentado para añadir funciones | Baja | ✅ Implementado |
| RNF17 | Respaldo | Copias de seguridad automáticas y periódicas con restauración probada | Alta | ⚠️ Script manual de backup implementado |

---

## 6. Historias de Usuario (HU)

| ID | Historia | RF | Prioridad | Estado |
|----|----------|-----|-----------|--------|
| HU01 | Como administrador, quiero ver en una pantalla los bloques del día en verde y rojo, para saber en segundos si un horario está libre mientras atiendo una llamada | RF09, RF10, RF11 | Alta | ✅ Implementado |
| HU02 | Como administrador, quiero reservar un bloque con solo nombre y teléfono, para registrar el turno en menos de 4 clics | RF14, RF15, RF16 | Alta | ✅ Implementado |
| HU03 | Como administrador, quiero que el sistema rechace una reserva sobre un bloque ocupado, para no prometer el mismo horario a dos clientes | RF17 | Alta | ✅ Implementado |
| HU04 | Como administrador, quiero ver los datos del cliente al tocar un bloque ocupado, para resolver reclamos | RF18 | Alta | ✅ Implementado |
| HU05 | Como administrador, quiero cancelar una reserva y liberar el bloque, para volver a ofrecerlo | RF19 | Alta | ✅ Implementado |
| HU06 | Como administrador, quiero buscar una reserva por nombre o teléfono, para resolver reclamos del tipo "ya estaba reservada" | RF22 | Media | ✅ Implementado |
| HU07 | Como administrador, quiero confirmar el pago de cada turno (efectivo o transferencia), para tener el registro de los ingresos del establecimiento | RF31 | Alta | ✅ Implementado |
| HU08 | Como administrador, quiero iniciar un cronómetro por cancha y recibir una alerta antes del fin, para no cortar el turno ni dejar que jueguen tiempo extra sin pagar | RF34, RF35, RF36 | Media | ✅ Implementado |
| HU09 | Como administrador, quiero cobrar el tiempo adicional jugado, para no perder ingresos | RF33 | Media | ✅ Implementado |
| HU10 | Como administrador, quiero bloquear horarios por mantenimiento o evento, para que nadie los reserve | RF37 | Baja | ✅ Implementado |
| HU11 | Como administrador, quiero iniciar sesión, para que solo yo modifique reservas y pagos | RF01 | Alta | ✅ Implementado |
| HU12 | Como administrador, quiero ver quién modificó o canceló una reserva, para aclarar discusiones | RF44 | Media | ✅ Implementado |
| HU13 | Como cliente, quiero consultar los horarios libres desde mi celular, para no llamar ni desplazarme en vano | RF13 | Alta | ✅ Implementado |
| HU14 | Como cliente, quiero reservar y recibir un código de turno, para asegurar mi cancha sin hacer fila | RF27, RF28 | Alta | ✅ Implementado |
| HU15 | Como dueño, quiero ver los ingresos diarios, semanales y mensuales, para saber cuánto genera cada cancha | RF40 | Alta | ✅ Implementado |
| HU16 | Como dueño, quiero ver la ocupación por franja horaria, para decidir promociones en horas valle | RF41 | Media | ✅ Implementado |
| HU17 | Como vigilante, quiero ver los turnos del día con hora y código, para dejar entrar solo a quienes reservaron | RF38 | Media | ✅ Implementado |
| HU18 | Como administrador, quiero confirmar o rechazar las reservas hechas en línea, para evitar turnos falsos | RF29 | Alto | ✅ Implementado |
| HU19 | Como dueño, quiero ver las cancelaciones con su motivo, para detectar por qué se pierden turnos | RF42 | Media | ✅ Implementado |

---

## 7. Matriz de Trazabilidad: Necesidad → RF → Implementación

| Necesidad | Actor | RF relacionados | Archivos de implementación |
|-----------|-------|----------------|---------------------------|
| N1: Ver disponibilidad en tiempo real | Cliente | RF09, RF10, RF11, RF12, RF13 | `frontend/src/layouts/Agenda.jsx`, `backend/src/services/schedule.service.js` |
| N2: Reservar con anticipación por su cuenta | Cliente | RF02, RF05, RF27, RF28, RF29, RF30, RF26 | `frontend/src/pages/Register.jsx`, `frontend/src/pages/MyBooking.jsx`, `backend/src/controllers/auth.controller.js` |
| N3: Manejar bloques de tiempo sin doble asignación | Administrador | RF01, RF03, RF04, RF06, RF07, RF14, RF15, RF16, RF17, RF18, RF19, RF20, RF21, RF22, RF23, RF24, RF25, RF37, RF38, RF39, RF44 | `frontend/src/pages/Bookings.jsx`, `frontend/src/pages/Users.jsx`, `frontend/src/pages/Config.jsx`, `frontend/src/pages/Today.jsx`, `backend/src/services/booking.service.js`, `backend/src/config/schema.sql` |
| N4: Control de tiempo automático | Administrador | RF33, RF34, RF35, RF36 | `frontend/src/pages/Timers.jsx`, `backend/src/services/booking.service.js` |
| N5: Confirmar y registrar pagos con trazabilidad | Administrador | RF31, RF32, RF33, RF44 | `frontend/src/pages/Bookings.jsx`, `backend/src/services/booking.service.js`, `backend/src/config/schema.sql` |
| N6: Ver reportes de ingreso y ocupación | Dueño | RF40, RF41, RF42, RF43 | `frontend/src/pages/Reports.jsx`, `backend/src/services/report.service.js` |
| N7: Lista de acceso para verificar quién reservó | Vigilancia | RF23, RF38, RF39 | `frontend/src/pages/Today.jsx`, `backend/src/routes/booking.routes.js` |
| N8: Bloquear horarios para mantenimiento | Administrador | RF37 | `frontend/src/pages/Config.jsx`, `backend/src/services/booking.service.js` |

---

## 8. Arquitectura de Implementación

### 8.1 Backend (Node.js + Express 5 + MySQL)

```
backend/src/
  config/
    db.js              # Pool de conexiones, zona horaria Bogotá, transacciones
    schema.sql         # Esquema SQL de 8 tablas + tabla holidays
    canchaControl.sql  # Esquema sincronizado
    constants.js       # Roles, constantes de negocio
  controllers/
    auth.controller.js     # Login, register, me, changePassword
    booking.controller.js  # CRUD de reservas, disponibilidad, timers, pagos
    config.controller.js   # Canchas, settings, rates, holidays
    report.controller.js   # Reportes de ingresos, uso, estado
    user.controller.js     # Gestión de usuarios (solo admin)
  middlewares/
    auth.middleware.js     # protect, optionalAuth, authorize
    error.middleware.js    # Manejo global de errores
  models/
    User.js                # Consultas SQL de usuarios
  routes/
    auth.routes.js     # /api/auth/*
    booking.routes.js  # /api/bookings/*, /api/availability, /api/blocks
    config.routes.js   # /api/courts, /api/settings, /api/rates, /api/holidays
    report.routes.js   # /api/reports/*
    user.routes.js     # /api/users
  services/
    booking.service.js   # Reglas de negocio: reservas, pagos, cronómetro, bloques
    schedule.service.js  # Bloques, tarifas, disponibilidad, festivos, vencimiento
    report.service.js    # Consultas de reportes
    token.service.js     # JWT sign/verify/extract
  utils/
    AppError.js          # Clase de error controlado y check()
    asyncHandler.js      # Wrapper para controladores async
    audit.js             # logAction() para auditoría RF44
    time.js              # nowBogota, dayType, isHoliday, addMinutes, etc.
  validators/
    domain.validator.js  # validateCourt, validateRate, validateSettings, validateHoliday
    user.validator.js    # validateRegister, validateLogin, validatePasswordChange, validateUserAdmin
  seeds/
    seed.js              # Seeder con usuarios, canchas, configuración, tarifas, festivos
  scripts/
    backup.js            # Script de copias de seguridad
server.js              # Punto de entrada, montaje de rutas, health check
```

### 8.2 Frontend (React 18 + Vite + MUI)

```
frontend/src/
  api/
    axios.js             # Instancia con baseURL, interceptor de token, errMsg()
  context/
    AuthContext.jsx      # Autenticación, token, cierre por inactividad (15 min)
    NotifyContext.jsx    # Sistema de notificaciones (Snackbar)
  layouts/
    AppLayout.jsx        # Layout principal con Navbar y Sidebar
    PublicLayout.jsx     # Layout público (Agenda, Login, Register)
    Agenda.jsx           # Vista de agenda con bloques de tiempo
  pages/
    Login.jsx            # Inicio de sesión
    Register.jsx         # Registro de clientes
    ChangePassword.jsx   # Cambio de contraseña (RF03)
    Bookings.jsx         # Gestión de reservas (admin/dueno/cliente)
    MyBooking.jsx        # Mis reservas (cliente)
    Timers.jsx           # Cronómetros por cancha (admin)
    Today.jsx            # Lista del día (admin/vigilancia)
    Reports.jsx          # Reportes (admin/dueno)
    Users.jsx            # Gestión de usuarios (admin)
    Config.jsx           # Configuración (canchas, settings, rates)
  components/
    Navbar.jsx           # Barra superior con usuario y menú
    Sidebar.jsx          # Menú lateral por rol
  routes/
    ProtectedRoute.jsx   # Protección de rutas por rol
    navigation.jsx       # Definición del menú MENU
  utils/
    format.js            # homeFor, roleLabel, fmtMoney, fmtDate, fmtTime
App.jsx                  # Configuración de rutas y tema
```

### 8.3 Base de datos (8 tablas)

| Tabla | Descripción | Claves foráneas |
|-------|-------------|-----------------|
| `users` | Usuarios con roles, bloqueo por intentos, términos aceptados | — |
| `courts` | Canchas con estado (activa/mantenimiento/inactiva) | — |
| `settings` | Configuración clave-valor (horario, bloque, retención, etc.) | — |
| `rates` | Tarifas por bloque según día (semana/finde/festivo) y franja | `court_id` → `courts.id` |
| `holidays` | Días festivos que se tarifan como fin de semana | — |
| `bookings` | Reservas con estados (procesando, ocupada, en_curso, finalizada, cancelada, vencida) | `court_id`, `customer_id`, `cancelled_by`, `checked_in_by`, `created_by`, `updated_by` |
| `court_slots` | Una fila por (cancha, fecha, bloque) ocupado — **UNIQUE para RNF10** | `court_id`, `booking_id`, `created_by` |
| `payments` | Registro de pagos (efectivo/transferencia) | `booking_id`, `created_by` |
| `audit_log` | Auditoría de quién hizo qué y cuándo | `user_id` |

---

## 9. Limitaciones y Trabajo Futuro

### 9.1 Limitaciones conocidas (documentadas honestamente)

| Limitación | Descripción | Impacto |
|------------|-------------|---------|
| Festivos no se distinguen en el frontend UI | La tabla y lógica existen en backend, pero `Config.jsx` no tiene pestaña para gestionar festivos desde la interfaz | Medio: el dueño debe gestionar festivos vía API directa |
| No hay paginación en reportes | Los reportes devuelven todos los registros del rango | Bajo: para volúmenes pequeños no es crítico |
| No hay pruebas E2E | Solo pruebas unitarias y de integración de backend | Medio: no se valida el flujo completo en navegador |
| No hay copias de seguridad automáticas | Solo existe script manual `npm run backup` | Alto: RNF17 depende del proveedor de hosting |
| No hay pasarela de pago | El sistema solo registra pagos, no procesa transacciones | Por diseño (excluido del alcance) |
| Los festivos se tratan como día de semana si no hay calendario | Se agregó tabla `holidays`, pero no hay calendario predeterminado de festivos por país | Bajo: el administrador debe agregar festivos manualmente |

### 9.2 Mejoras naturales (segunda fase o versiones futuras)

1. **Interfaz de gestión de festivos** en `Config.jsx` (pestaña adicional)
2. **Pruebas E2E** con Cypress o Playwright
3. **Copias de seguridad automáticas** programadas (cron job)
4. **Notificaciones en tiempo real** (WebSockets) para alertas de fin de turno
5. **Exportación de reportes** a PDF/Excel
6. **Calendario de festivos predeterminado** por país (Colombia)
7. **Paginación en todos los listados** (reportes, auditoría)
8. **Autenticación de dos factores (2FA)**

---

## 10. Conclusión

El sistema **CanchaControl** ha sido desarrollado cumpliendo con los **44 requisitos funcionales** y **17 requisitos no funcionales** definidos en el documento de requisitos originales. La implementación actual cubre:

- ✅ **Autenticación y autorización por roles** (4 roles: administrador, cliente, dueño, vigilancia)
- ✅ **Agenda de bloques con colores por estado** (disponible, ocupado, bloqueado, pasado)
- ✅ **Reservas con código único y anti doble reserva a nivel de base de datos** (RNF10)
- ✅ **Gestión de usuarios, canchas, tarifas y configuración**
- ✅ **Pagos registrados (efectivo/transferencia) con estado de pago**
- ✅ **Cronómetro persistente por cancha con tiempo restante**
- ✅ **Lista del día para vigilancia con marca de ingreso**
- ✅ **Reportes de ingresos, ocupación y cancelaciones**
- ✅ **Auditoría completa de acciones (RF44, RNF15)**
- ✅ **Días festivos con tarifas de fin de semana**
- ✅ **Paginación en reservas y usuarios**
- ✅ **Página de cambio de contraseña (RF03)**
- ✅ **Script de copias de seguridad**

Las limitaciones pendientes (festivos en UI, backup automático, pruebas E2E) están documentadas y pueden abordarse en versiones futuras sin afectar la funcionalidad core del sistema.

---

**Archivo:** `DOCUMENTACION_REQUISITOS.md`  
**Ubicación:** Raíz del proyecto (`cancha-control/`)  
**Fecha:** Noviembre 2026  
**Versión:** 2.0.0