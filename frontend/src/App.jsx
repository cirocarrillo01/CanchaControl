// frontend/src/App.jsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { NotifyProvider } from "./context/NotifyContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";
import Agenda from "./layouts/Agenda";
// frontend/src/App.jsx
import MyBookings from "./pages/MyBooking";
import Bookings from "./pages/Bookings";
import Timers from "./pages/Timers";
import Today from "./pages/Today";
import Reports from "./pages/Reports";
// === Fase 2 DESHABILITADA A PROPOSITO ===
// Comentado para evitar que el sistema intente cargar las páginas
// de Gastos / Egresos y Caja / Arqueo, las cuales fueron inhabilitadas.
// Para reactivar, descomentar las siguientes importaciones y rutas.
// ===============================================
// import Expenses from "./pages/Expenses";
// import Cash from "./pages/Cash";
import Users from "./pages/Users";
import Config from "./pages/Config";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";

const ALL_ROLES = ["administrador", "cliente", "dueno", "vigilancia"];

const theme = createTheme({
  palette: {
    primary: { main: "#E65100" },
    secondary: { main: "#FF833A" },
  },
  shape: { borderRadius: 10 },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotifyProvider>
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Agenda />} />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/agenda" replace />} />
                <Route path="agenda" element={<Agenda />} />
                <Route
                  path="mis-reservas"
                  element={
                    <ProtectedRoute roles={["cliente"]}>
                      <MyBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reservas"
                  element={
                    <ProtectedRoute roles={["administrador", "dueno"]}>
                      <Bookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="cronometros"
                  element={
                    <ProtectedRoute roles={["administrador"]}>
                      <Timers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hoy"
                  element={
                    <ProtectedRoute roles={["administrador", "vigilancia"]}>
                      <Today />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reportes"
                  element={
                    <ProtectedRoute roles={["administrador", "dueno"]}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                // === Fase 2 DESHABILITADA A PROPOSITO ===
                // Rutas comentadas para evitar cargar Gastos / Egresos y Caja / Arqueo.
//                <Route
//                  path="gastos"
//                  element={
//                    <ProtectedRoute roles={["administrador", "dueno"]}>
//                      <Expenses />
//                    </ProtectedRoute>
//                  }
//                />
//                <Route
//                  path="caja"
//                  element={
//                    <ProtectedRoute roles={["administrador", "dueno"]}>
//                      <Cash />
//                    </ProtectedRoute>
//                  }
/>
                <Route
                  path="usuarios"
                  element={
                    <ProtectedRoute roles={["administrador"]}>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="configuracion"
                  element={
                    <ProtectedRoute roles={["administrador"]}>
                      <Config />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="cambiar-password"
                  element={
                    <ProtectedRoute roles={ALL_ROLES}>
                      <ChangePassword />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotifyProvider>
    </ThemeProvider>
  );
}
