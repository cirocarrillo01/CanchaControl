// frontend/src/routes/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/format";

/**
 * Protege una ruta: exige sesión y, si se indica `roles`, que el rol del usuario esté permitido.
 * Sin sesión -> /login; con rol no permitido -> a su pantalla de inicio.
 */
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <Box sx={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export default ProtectedRoute;
