/* backend/src/config/schema.sql */
-- =====================================================================
-- CanchaControl · Esquema relacional (MySQL 8 / MariaDB 10.5+)
-- Uso manual:  mysql -u root -p cancha_control < src/config/schema.sql
-- Uso normal:  npm run seed:reset   (crea la BD, las tablas y los datos base)
-- =====================================================================

-- USUARIOS (RF01-RF05, RNF05, RNF06, RNF13) --------------------------
-- role: los 4 roles del alcance. failed_attempts/locked_until implementan el
-- bloqueo temporal tras 5 intentos fallidos. active permite desactivar sin borrar historial.
-- terms_accepted_at deja constancia del aviso de tratamiento de datos (Ley 1581 de 2012).

CREATE DATABASE IF NOT EXISTS cancha_control
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cancha_control;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('administrador','cliente','auditor','vigilancia') NOT NULL DEFAULT 'cliente',
  active TINYINT(1) NOT NULL DEFAULT 1,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  terms_accepted_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CANCHAS (RF06, RNF08) ----------------------------------------------
CREATE TABLE IF NOT EXISTS courts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  status ENUM('activa','mantenimiento','inactiva') NOT NULL DEFAULT 'activa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CONFIGURACIÓN (RF07): horario de atención, duración del bloque, plazo de reserva en línea
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TARIFAS (RF08): precio por bloque según día (semana/finde/festivo) y franja.
-- court_id NULL = tarifa general; una tarifa con court_id tiene prioridad sobre la general.
CREATE TABLE IF NOT EXISTS rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  court_id INT NULL,
  day_type ENUM('semana','finde','festivo') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price DECIMAL(10,0) NOT NULL,
  CONSTRAINT fk_rates_court FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FESTIVOS (RF08): días festivos que se tarifan como fin de semana.
CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RESERVAS (RF14-RF30, RF44): una fila por turno (puede abarcar varios bloques consecutivos).
-- status: procesando -> ocupada -> en_curso -> finalizada | cancelada | vencida | no_show | reembolsada
-- timer_*: la hora de fin vive en BD para que el cronómetro sobreviva a recargas (RNF11).
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  court_id INT NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NULL,
  `date` DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_blocks TINYINT NOT NULL DEFAULT 1,
  status ENUM('procesando','ocupada','en_curso','finalizada','cancelada','vencida','no_show','reembolsada') NOT NULL DEFAULT 'procesando',
  price_total DECIMAL(10,0) NOT NULL DEFAULT 0,
  refunded_amount DECIMAL(10,0) NOT NULL DEFAULT 0,
  expires_at DATETIME NULL,
  timer_started_at DATETIME NULL,
  timer_ends_at DATETIME NULL,
  extra_minutes INT NOT NULL DEFAULT 0,
  cancel_reason VARCHAR(255) NULL,
  cancelled_at DATETIME NULL,
  cancelled_by INT NULL,
  finished_at DATETIME NULL,
  checked_in_at DATETIME NULL,
  checked_in_by INT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bk_court FOREIGN KEY (court_id) REFERENCES courts(id),
  CONSTRAINT fk_bk_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bk_cancelled FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bk_checkin FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bk_created FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bk_updated FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bk_date (`date`, court_id),
  INDEX idx_bk_phone (customer_phone),
  INDEX idx_bk_status (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- BLOQUES OCUPADOS (RNF10): UNA fila por (cancha, fecha, bloque) ocupado, sea reserva o bloqueo.
-- La restricción UNIQUE es la garantía real contra la doble reserva: aunque dos personas
-- guarden a la vez, MySQL rechaza la segunda. Al cancelar/vencer, las filas se borran y el bloque queda libre.
CREATE TABLE IF NOT EXISTS court_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  court_id INT NOT NULL,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  kind ENUM('reserva','bloqueo') NOT NULL,
  booking_id INT NULL,
  reason VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slot (court_id, slot_date, slot_start),
  INDEX idx_slot_date (slot_date),
  CONSTRAINT fk_slot_court FOREIGN KEY (court_id) REFERENCES courts(id),
  CONSTRAINT fk_slot_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_slot_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PAGOS (RF31-RF33): el sistema NO procesa pagos; solo registra la confirmación del cobro.
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  kind ENUM('reserva','tiempo_adicional','devolucion') NOT NULL DEFAULT 'reserva',
  method ENUM('efectivo','transferencia') NOT NULL DEFAULT 'efectivo',
  amount DECIMAL(10,0) NOT NULL,
  extra_minutes INT NULL,
  note VARCHAR(255) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  INDEX idx_pay_date (paid_at),
  INDEX idx_pay_booking_kind (booking_id, kind),
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_pay_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- GASTOS / EGRESOS (Fase 2): egresos operativos del establecimiento
-- (servicios públicos, mantenimiento, limpieza, nómina, marketing, otros).
-- No usa pasarela de pago; solo registra el egreso confirmado.
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('servicios_publicos','mantenimiento','limpieza','nomina','marketing','productos','otros') NOT NULL DEFAULT 'otros',
  amount DECIMAL(10,0) NOT NULL,
  method ENUM('efectivo','transferencia','tarjeta') NOT NULL DEFAULT 'efectivo',
  note VARCHAR(255) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  INDEX idx_expense_date (paid_at),
  INDEX idx_expense_category (category),
  CONSTRAINT fk_expense_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CAJA DIARIA / ARQUEO (Fase 2): apertura y cierre de caja física.
-- Permite conciliar lo que dice el sistema vs lo que hay en caja.
CREATE TABLE IF NOT EXISTS cash_drawer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  open_date DATE NOT NULL,
  open_amount DECIMAL(10,0) NOT NULL DEFAULT 0,
  open_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  opened_by INT NULL,
  close_amount DECIMAL(10,0) NULL,
  close_at DATETIME NULL,
  closed_by INT NULL,
  status ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  system_income DECIMAL(10,0) NULL,
  system_expense DECIMAL(10,0) NULL,
  expected_cash DECIMAL(10,0) NULL,
  difference DECIMAL(10,0) NULL,
  note VARCHAR(255) NULL,
  INDEX idx_cash_date (open_date),
  CONSTRAINT fk_cash_opened FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cash_closed FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AUDITORÍA (RF44, RNF15): quién creó, modificó, canceló o cobró y cuándo.
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity VARCHAR(30) NOT NULL,
  entity_id INT NOT NULL,
  action VARCHAR(40) NOT NULL,
  user_id INT NULL,
  detail JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_audit_entity (entity, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

