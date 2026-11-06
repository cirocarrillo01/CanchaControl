// tests/domain.validator.test.js — Pruebas unitarias de validadores de dominio
import {
  validateCourt,
  validateRate,
  validateSettings,
  validateHoliday,
} from "../src/validators/domain.validator.js";

describe("validateCourt", () => {
  it("cancha válida", () => {
    const r = validateCourt({
      name: "Cancha 1",
      description: "Sintética",
      status: "activa",
    });
    expect(r.error).toBeNull();
    expect(r.data).toEqual({
      name: "Cancha 1",
      description: "Sintética",
      status: "activa",
    });
  });

  it("nombre demasiado corto", () => {
    const r = validateCourt({ name: "A", status: "activa" });
    expect(r.error).not.toBeNull();
    expect(r.data).toBeNull();
  });

  it("estado inválido", () => {
    const r = validateCourt({ name: "Cancha X", status: "otro" });
    expect(r.error).not.toBeNull();
    expect(r.data).toBeNull();
  });

  it("descripción no string", () => {
    const r = validateCourt({ name: "Cancha X", description: 123, status: "activa" });
    expect(r.error).not.toBeNull();
  });
});

describe("validateRate", () => {
  it("tarifa válida general", () => {
    const r = validateRate({
      court_id: null,
      day_type: "semana",
      start_time: "08:00",
      end_time: "17:00",
      price: 50000,
    });
    expect(r.error).toBeNull();
    expect(r.data.start_time).toBe("08:00:00");
    expect(r.data.end_time).toBe("17:00:00");
    expect(r.data.price).toBe(50000);
  });

  it("tarifa con court_id", () => {
    const r = validateRate({
      court_id: 1,
      day_type: "finde",
      start_time: "17:00",
      end_time: "23:00",
      price: 80000,
    });
    expect(r.error).toBeNull();
    expect(r.data.court_id).toBe(1);
  });

  it("hora inicio >= hora fin", () => {
    const r = validateRate({
      court_id: null,
      day_type: "semana",
      start_time: "17:00",
      end_time: "17:00",
      price: 50000,
    });
    expect(r.error).not.toBeNull();
  });

  it("precio no positivo", () => {
    const r = validateRate({
      court_id: null,
      day_type: "semana",
      start_time: "08:00",
      end_time: "17:00",
      price: 0,
    });
    expect(r.error).not.toBeNull();
  });

  it("day_type inválido", () => {
    const r = validateRate({
      court_id: null,
      day_type: "otro",
      start_time: "08:00",
      end_time: "17:00",
      price: 50000,
    });
    expect(r.error).not.toBeNull();
  });
});

describe("validateSettings", () => {
  it("configuración válida", () => {
    const r = validateSettings({
      open_time: "08:00",
      close_time: "23:00",
      block_minutes: 60,
      online_hold_minutes: 30,
      min_cancel_hours: 2,
      business_name: "Mi Cancha",
    });
    expect(r.error).toBeNull();
    expect(r.data.open_time).toBe("08:00:00");
    expect(r.data.close_time).toBe("23:00:00");
    expect(r.data.business_name).toBe("Mi Cancha");
  });

  it("open_time >= close_time", () => {
    const r = validateSettings({
      open_time: "23:00",
      close_time: "08:00",
    });
    expect(r.error).not.toBeNull();
  });

  it("sin valores para actualizar", () => {
    const r = validateSettings({});
    expect(r.error).not.toBeNull();
    expect(r.error).toBe("No hay valores para actualizar");
  });
});

describe("validateHoliday", () => {
  it("festivo válido", () => {
    const r = validateHoliday({
      holiday_date: "2026-12-25",
      name: "Navidad",
    });
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ holiday_date: "2026-12-25", name: "Navidad" });
  });

  it("fecha inválida", () => {
    const r = validateHoliday({ holiday_date: "25-12-2026", name: "Navidad" });
    expect(r.error).not.toBeNull();
  });

  it("nombre corto", () => {
    const r = validateHoliday({ holiday_date: "2026-12-25", name: "A" });
    expect(r.error).not.toBeNull();
  });
});
