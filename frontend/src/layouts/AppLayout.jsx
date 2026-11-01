// frontend/src/layouts/AppLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Toolbar, useMediaQuery } from "@mui/material";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const DRAWER = 240;

export default function AppLayout() {
  const isDesktop = useMediaQuery((t) => t.breakpoints.up("md"));
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Navbar onMenu={() => setOpen(true)} drawerWidth={DRAWER} />
      <Sidebar
        width={DRAWER}
        mobileOpen={open}
        onClose={() => setOpen(false)}
        isDesktop={isDesktop}
      />
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 1.5, md: 3 }, minWidth: 0 }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
