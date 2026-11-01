// frontend/src/components/Sidebar.jsx
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import { MENU } from "../routes/navigation";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ width, mobileOpen, onClose, isDesktop }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const items = MENU.filter((m) => m.roles.includes(user?.role));

  const content = (
    <>
      <Toolbar />
      <List>
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
    </>
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
