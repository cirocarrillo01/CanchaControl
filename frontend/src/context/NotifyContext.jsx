// frontend/src/context/NotifyContext.jsx
import { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const NotifyContext = createContext(null);
export const useNotify = () => useContext(NotifyContext);

export function NotifyProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const current = queue[0] ?? null;

  const notify = useCallback((message, severity = "info") => {
    setQueue((q) => [
      ...q,
      { id: Date.now() + Math.random(), message, severity },
    ]);
  }, []);

  const close = () => setQueue((q) => q.slice(1));

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={4000}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {current ? (
          <Alert
            onClose={close}
            severity={current.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}
