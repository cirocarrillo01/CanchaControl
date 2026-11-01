// tests/user.validator.test.js — Pruebas unitarias de validadores de usuario
import { describe, it, expect } from "jest";
import {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validateUserAdmin,
} from "../src/validators/user.validator.js";

describe("validateRegister", () => {
  it("registro válido", () => {
    const r = validateRegister({
      name: "Juan Pérez",
      email: "juan@test.com",
      phone: "3001234567",
      password: "Abc12345",
      accept_terms: true,
    });
    expect(r.error).toBeNull();
    expect(r.data.email).toBe("juan@test.com");
    expect(r.data.role).toBeUndefined(); // el controlador fuerza rol cliente
  });

  it("faltan campos", () => {
    const r = validateRegister({ name: "Juan", email: "", phone: "", password: "", accept_terms: true });
    expect(r.error).not.toBeNull();
  });

  it("email inválido", () => {
    const r = validateRegister({
      name: "Juan",
      email: "no-es-email",
      phone: "3001234567",
      password: "Abc12345",
      accept_terms: true,
    });
    expect(r.error).not.toBeNull();
  });

  it("contraseña débil", () => {
    const r = validateRegister({
      name: "Juan",
      email: "juan@test.com",
      phone: "3001234567",
      password: "123",
      accept_terms: true,
    });
    expect(r.error).not.toBeNull();
  });

  it("sin aceptar términos", () => {
    const r = validateRegister({
      name: "Juan",
      email: "juan@test.com",
      phone: "3001234567",
      password: "Abc12345",
      accept_terms: false,
    });
    expect(r.error).not.toBeNull();
    expect(r.error).toContain("tratamiento de datos");
  });
});

describe("validateLogin", () => {
  it("login válido", () => {
    const r = validateLogin({ email: "admin@test.com", password: "Admin123*" });
    expect(r.error).toBeNull();
    expect(r.data.email).toBe("admin@test.com");
  });

  it("faltan campos", () => {
    const r = validateLogin({ email: "", password: "" });
    expect(r.error).not.toBeNull();
  });

  it("email inválido", () => {
    const r = validateLogin({ email: "no-email", password: "x" });
    expect(r.error).not.toBeNull();
  });
});

describe("validatePasswordChange", () => {
  it("cambio válido", () => {
    const r = validatePasswordChange({
      current_password: "Vieja123",
      new_password: "Nueva12345",
    });
    expect(r.error).toBeNull();
    expect(r.data.current).toBe("Vieja123");
    expect(r.data.next).toBe("Nueva12345");
  });

  it("faltan contraseñas", () => {
    const r = validatePasswordChange({ current_password: "", new_password: "" });
    expect(r.error).not.toBeNull();
  });

  it("nueva contraseña débil", () => {
    const r = validatePasswordChange({
      current_password: "Vieja123",
      new_password: "123",
    });
    expect(r.error).not.toBeNull();
  });
});

describe("validateUserAdmin", () => {
  it("crear usuario admin válido", () => {
    const r = validateUserAdmin(
      {
        name: "Admin Test",
        email: "admintest@test.com",
        phone: "3001234567",
        role: "administrador",
        password: "Abc12345",
        active: true,
      },
      true
    );
    expect(r.error).toBeNull();
    expect(r.data.email).toBe("admintest@test.com");
    expect(r.data.password).toBe("Abc12345");
  });

  it("editar usuario sin email ni password (create=false)", () => {
    const r = validateUserAdmin(
      { name: "Editado", phone: "3001234567", role: "cliente", active: true },
      false
    );
    expect(r.error).toBeNull();
    expect(r.data.email).toBeUndefined();
    expect(r.data.password).toBeUndefined();
  });

  it("rol inválido", () => {
    const r = validateUserAdmin(
      { name: "X", email: "a@b.com", role: "superadmin", password: "Abc12345" },
      true
    );
    expect(r.error).not.toBeNull();
  });
});
