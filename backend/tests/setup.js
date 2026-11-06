// Variables de entorno para pruebas
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret_key_for_testing_only";
process.env.JWT_EXPIRE = "8h";
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_PORT = process.env.DB_PORT || "3306";
process.env.DB_USER = process.env.DB_USER || "root";
// Seguridad: Por defecto usa BD de test. NUNCA usar la de producción/desarrollo sin variable explícita.
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "";
process.env.DB_NAME = process.env.DB_NAME || "cancha_control_test";
