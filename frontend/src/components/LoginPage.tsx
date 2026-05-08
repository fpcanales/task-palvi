import { useState, type FormEvent } from "react";

import { useAuthContext } from "../lib/AuthContext";

export function LoginPage() {
  const { login } = useAuthContext();
  const [email, setEmail] = useState("admin@palvi.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // On success the AuthProvider state changes and main.tsx Gate re-renders to <App>
    } catch {
      setError("Credenciales inválidas. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-eyebrow">Palvi · Reporte ejecutivo</div>
        <h1 className="login-title">Iniciá sesión</h1>
        <p className="login-sub">Ingresá tus credenciales para ver el reporte de hoy.</p>

        <label className="login-label">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="login-label">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
