import { ArrowRight, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAccessCodeFromSearch, normalizeAccessCode } from "../lib/accessCode";
import { authFetch } from "../lib/api";
import { accessCodeSchema } from "../lib/schemas";
import "./EnterCode.css";

export default function EnterCode() {
  const { token, user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialCode = useMemo(() => getAccessCodeFromSearch(location.search), [location.search]);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const validation = accessCodeSchema.safeParse({ code });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Informe um codigo valido.");
      return;
    }

    try {
      setIsSubmitting(true);
      const nextSession = await authFetch("/api/auth/access-code/bind/", token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });
      login(nextSession);
      navigate("/app", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Nao foi possivel vincular sua conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="enter-code-page">
      <div className="enter-code-panel lauda-card">
        <div className="enter-code-hero">
          <div className="enter-code-badge">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Vinculacao ao ministerio</span>
          </div>
          <h1>Informe o codigo de acesso</h1>
          <p>
            Sua conta <strong>@{user?.username}</strong> ainda nao esta vinculada a um ministerio.
            Digite o codigo recebido para concluir a entrada.
          </p>
        </div>

        <form className="enter-code-form" onSubmit={handleSubmit}>
          {error && <div className="status-alert status-alert--error">{error}</div>}
          {notice && <div className="status-alert status-alert--success">{notice}</div>}

          <div className="form-group">
            <label className="input-label" htmlFor="access-code">
              Codigo de acesso
            </label>
            <div className="enter-code-input-shell">
              <KeyRound size={18} aria-hidden="true" />
              <input
                id="access-code"
                className="input-field enter-code-input"
                value={code}
                onChange={(event) => setCode(normalizeAccessCode(event.target.value))}
                placeholder="ABC123XYZ"
                autoComplete="off"
                spellCheck={false}
                aria-label="Codigo de acesso do ministerio"
              />
            </div>
          </div>

          <div className="enter-code-actions">
            <button type="submit" className="lauda-btn lauda-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Vinculando..." : "Vincular e Entrar"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="lauda-btn lauda-btn-secondary" onClick={logout}>
              <LogOut size={16} aria-hidden="true" /> Sair
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
