// tests/AppError.test.js — Pruebas unitarias de AppError y check
import { describe, it, expect } from "jest";
import AppError from "../src/utils/AppError.js";
import { check } from "../src/utils/AppError.js";

describe("AppError", () => {
  it("debe crear un error con statusCode y message", () => {
    const err = new AppError(400, "Datos inválidos");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Datos inválidos");
    expect(err).toBeInstanceOf(Error);
  });

  it("debe tener stack trace", () => {
    const err = new AppError(500, "Error interno");
    expect(err.stack).toBeDefined();
  });
});

describe("check", () => {
  it("debe lanzar AppError(400) si hay error", () => {
    const result = { error: "Campo requerido", data: null };
    expect(() => check(result)).toThrow(AppError);
    try {
      check(result);
    } catch (e) {
      expect(e.statusCode).toBe(400);
      expect(e.message).toBe("Campo requerido");
    }
  });

  it("debe retornar data si no hay error", () => {
    const result = { error: null, data: { id: 1, name: "Test" } };
    const data = check(result);
    expect(data).toEqual({ id: 1, name: "Test" });
  });
});
