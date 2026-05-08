import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { LoginPage } from "./components/LoginPage";
import { AuthProvider, useAuthContext } from "./lib/AuthContext";
import "./styles.css";

function Gate() {
  const { token, user, hydrating } = useAuthContext();
  if (hydrating) return <div className="auth-hydrating">Cargando...</div>;
  if (!token || !user) return <LoginPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </React.StrictMode>,
);
