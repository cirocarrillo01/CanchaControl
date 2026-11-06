// frontend/src/routes/navigation.jsx
import {
  CalendarMonth,
  EventNote,
  ListAlt,
  Timer,
  Checklist,
  BarChart,
  People,
  Settings,
  Lock,
} from "@mui/icons-material";

const ALL = ["administrador", "cliente", "auditor", "vigilancia"];

export const MENU = [
  { label: "Agenda", path: "/app/agenda", icon: <CalendarMonth />, roles: ALL },
  {
    label: "Mis reservas",
    path: "/app/mis-reservas",
    icon: <EventNote />,
    roles: ["cliente"],
  },
  {
    label: "Reservas",
    path: "/app/reservas",
    icon: <ListAlt />,
    roles: ["administrador", "auditor"],
  },
  {
    label: "Cronómetros",
    path: "/app/cronometros",
    icon: <Timer />,
    roles: ["administrador"],
  },
  {
    label: "Lista del día",
    path: "/app/hoy",
    icon: <Checklist />,
    roles: ["administrador", "vigilancia"],
  },
  {
    label: "Reportes",
    path: "/app/reportes",
    icon: <BarChart />,
    roles: ["administrador", "auditor"],
  },
  {
    label: "Gastos / Egresos",
    path: "/app/gastos",
    icon: <ListAlt />,
    roles: ["administrador", "auditor"],
  },
  {
    label: "Caja / Arqueo",
    path: "/app/caja",
    icon: <Checklist />,
    roles: ["administrador", "auditor"],
  },
  {
    label: "Usuarios",
    path: "/app/usuarios",
    icon: <People />,
    roles: ["administrador"],
  },
  {
    label: "Configuración",
    path: "/app/configuracion",
    icon: <Settings />,
    roles: ["administrador"],
  },
  {
    label: "Cambiar contraseña",
    path: "/app/cambiar-password",
    icon: <Lock />,
    roles: ALL,
  },
];

