-- Migración Fase 2: Gastos y Caja Diaria
-- Ejecutar sobre la base de datos existente

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

SELECT 'Phase 2 schema applied' AS resultado;
