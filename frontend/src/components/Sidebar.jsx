// frontend/src/components/Sidebar.jsx
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import { Logout } from "@mui/icons-material";
import { MENU } from "../routes/navigation";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotifyContext";

export default function Sidebar({ width, mobileOpen, onClose, isDesktop }) {
  const { user, logout } = useAuth();
  const notify = useNotify();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = MENU.filter((m) => m.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    notify("Sesión cerrada", "info");
    navigate("/login", { replace: true });
  };

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar />
      <List sx={{ flexGrow: 1, overflowY: "auto" }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={pathname === item.path}
            onClick={onClose}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<Logout />}
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
      </Box>
    </Box>
  );

  return isDesktop ? (
    <Drawer
      variant="permanent"
      sx={{ width, "& .MuiDrawer-paper": { width, boxSizing: "border-box" } }}
    >
      {content}
    </Drawer>
  ) : (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{ "& .MuiDrawer-paper": { width } }}
    >
      {content}
    </Drawer>
  );
}
