// frontend/src/components/Navbar.jsx
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/format";

export default function Navbar({ onMenu, drawerWidth }) {
  const { user } = useAuth();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenu}
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          CanchaControl
        </Typography>
        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {user.name} · {roleLabel(user.role)}
            </Typography>
            <Avatar sx={{ width: 32, height: 32 }}>{user.name?.[0]}</Avatar>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
