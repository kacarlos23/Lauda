import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  KeyRound,
  Music,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import "./Login.css";

export default function Login({ mode = "member" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [erro, setErro] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = useMemo(() => {
    if (mode === "admin") {
      return {
        endpoint: "/api/auth/admin/login/",
        badge: "Admin Console",
        title: "Acesso administrativo global",
        description: "Gerencie ministérios, convites e usuários de toda a plataforma.",
        buttonLabel: "Entrar no Painel Global",
        nextPath: "/admin",
      };
    }

    return {
      endpoint: "/api/auth/login/",
      badge: "Ministry Access",
      title: "Acesse o seu ministério",
      description: "Entre com a conta vinculada ao seu ministério ou use um convite para começar.",
      buttonLabel: "Entrar no Ministério",
      nextPath: "/app",
    };
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErro("");
    setIsSubmitting(true);

    try {
      const dados = await apiFetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      login(dados);
      const redirectTo = location.state?.from || config.nextPath;
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErro(error.message || "Nao foi possivel concluir o login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page-wrapper">
      <div className="login-background-orb orb-left" aria-hidden="true" />
      <div className="login-background-orb orb-right" aria-hidden="true" />
      <div className="bottom-light-effect" aria-hidden="true" />

      <div className="login-glass-panel">
        <aside className="login-branding-panel">
          <div className="login-badge">
            <Sparkles size={16} aria-hidden="true" />
            <span>{config.badge}</span>
          </div>

          <div className="login-logo">
            <Music size={52} aria-hidden="true" />
            <span>Lauda</span>
          </div>

          <h2>{config.title}</h2>
          <p>{config.description}</p>

          <div className="login-features">
            <div className="feature-item">
              <ShieldCheck size={18} />
              <span>Segurança com autenticação segmentada</span>
            </div>
            <div className="feature-item">
              <Music size={18} />
              <span>Escopo isolado por ministério</span>
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-content">
            <header className="login-header">
              <div className="login-header-icon" aria-hidden="true">
                <KeyRound size={20} />
              </div>
              <h3 className="text-primary">
                {mode === "admin" ? "Painel global" : "Bem-vindo de volta"}
              </h3>
              <p className="text-muted">{config.description}</p>
            </header>

            <form onSubmit={handleLogin} className="login-form">
              {erro && (
                <div className="status-alert status-alert--error" role="alert">
                  {erro}
                </div>
              )}

              <div className="form-group">
                <label className="input-label" htmlFor="username">
                  Login (Nome de Usuário)
                </label>
                <div className="input-wrapper">
                  <UserRound size={18} className="input-icon" aria-hidden="true" />
                  <input
                    type="text"
                    name="username"
                    id="username"
                    className="login-input"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    spellCheck={false}
                    placeholder="seunome.sobrenome"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label" htmlFor="password">
                  Sua Senha
                </label>
                <div className="input-wrapper">
                  <KeyRound size={18} className="input-icon" aria-hidden="true" />
                  <input
                    type="password"
                    name="password"
                    id="password"
                    className="login-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="lauda-btn lauda-btn-primary btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : config.buttonLabel}
              </button>

              <div className="login-footer login-footer-links">
                {mode !== "admin" && (
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => navigate("/admin/login")}
                  >
                    Sou admin global
                  </button>
                )}
                {mode === "admin" && (
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => navigate("/login")}
                  >
                    Voltar para login do ministério
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>

      <div className="panel-shadow-effect" aria-hidden="true" />
    </main>
  );
}

