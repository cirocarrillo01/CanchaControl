// frontend/src/layouts/PublicLayout.jsx
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import {
  Login as LoginIcon,
  PersonAdd,
  SportsSoccer,
  Dashboard,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/format";

export default function PublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <SportsSoccer sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, color: "inherit", textDecoration: "none" }}
          >
            CanchaControl
          </Typography>
          {user ? (
            <Button
              color="inherit"
              startIcon={<Dashboard />}
              onClick={() => navigate(homeFor(user.role))}
            >
              Ir a mi panel
            </Button>
          ) : (
            <>
              <Button
                color="inherit"
                startIcon={<LoginIcon />}
                component={RouterLink}
                to="/login"
              >
                Ingresar
              </Button>
              <Button
                color="inherit"
                variant="outlined"
                startIcon={<PersonAdd />}
                component={RouterLink}
                to="/register"
                sx={{ ml: 1, display: { xs: "none", sm: "inline-flex" } }}
              >
                Registrarme
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1300, mx: "auto" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
