// frontend/src/components/Navbar.jsx
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { Logout, Menu as MenuIcon } from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/format";

export default function Navbar({ onMenu, drawerWidth }) {
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);

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
            <IconButton
              color="inherit"
              onClick={(e) => setAnchor(e.currentTarget)}
            >
              <Avatar sx={{ width: 32, height: 32 }}>{user.name?.[0]}</Avatar>
            </IconButton>
            <Menu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
            >
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  logout();
                }}
              >
                <Logout fontSize="small" sx={{ mr: 1 }} /> Cerrar sesión
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
