// tests/user.validator.test.js
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
  });

  it("sin aceptar términos", () => {
    const r = validateRegister({
      name: "Juan",
      email: "j@t.com",
      phone: "3001234567",
      password: "Abc12345",
      accept_terms: false,
    });
    expect(r.error).toMatch(/tratamiento de datos/);
  });
});

describe("validateLogin", () => {
  it("login válido", () => {
    const r = validateLogin({ email: "a@b.com", password: "x" });
    expect(r.error).toBeNull();
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
  });
  it("nueva débil", () => {
    const r = validatePasswordChange({
      current_password: "Vieja123",
      new_password: "123",
    });
    expect(r.error).not.toBeNull();
  });
});

describe("validateUserAdmin — BUG FIX: role en data de update", () => {
  it("crear usuario incluye role, email, password", () => {
    const r = validateUserAdmin(
      {
        name: "Admin Test",
        email: "a@b.com",
        phone: "3001234567",
        role: "administrador",
        password: "Abc12345",
        active: true,
      },
      true,
    );
    expect(r.error).toBeNull();
    expect(r.data.role).toBe("administrador");
    expect(r.data.email).toBe("a@b.com");
  });

  it("editar usuario INCLUYE role (bug fix del 500)", () => {
    const r = validateUserAdmin(
      { name: "Editado", phone: "3001234567", role: "cliente", active: true },
      false,
    );
    expect(r.error).toBeNull();
    // ← assert clave: sin este campo, User.update rompe con ER_BAD_NULL_ERROR
    expect(r.data.role).toBe("cliente");
    expect(r.data.email).toBeUndefined();
    expect(r.data.password).toBeUndefined();
  });

  it("active=0 (integer de BD) normaliza a false", () => {
    const r = validateUserAdmin(
      { name: "Editado", role: "cliente", active: 0 },
      false,
    );
    expect(r.error).toBeNull();
    expect(r.data.active).toBe(false);
  });

  it("active=1 (integer de BD) normaliza a true", () => {
    const r = validateUserAdmin(
      { name: "Editado", role: "cliente", active: 1 },
      false,
    );
    expect(r.data.active).toBe(true);
  });

  it("active=false normaliza a false", () => {
    const r = validateUserAdmin(
      { name: "Editado", role: "cliente", active: false },
      false,
    );
    expect(r.data.active).toBe(false);
  });

  it("rol inválido rechazado", () => {
    const r = validateUserAdmin(
      { name: "X", email: "a@b.com", role: "superadmin", password: "Abc12345" },
      true,
    );
    expect(r.error).not.toBeNull();
  });
});
