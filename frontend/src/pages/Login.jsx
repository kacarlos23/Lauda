import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Music, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildInvitePath, getAccessCodeFromSearch } from "../lib/accessCode";
import { apiFetch } from "../lib/api";
import { resolveMemberDestination } from "../core/auth/access";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import "./Login.css";

export default function Login({ mode = "member" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ credential: "", password: "" });
  const [erro, setErro] = useState("");
  const [helperNotice, setHelperNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdminMode = mode === "admin" || location.pathname.startsWith("/admin/");
  const pendingCode = getAccessCodeFromSearch(location.search);

  const config = useMemo(() => {
    if (isAdminMode) {
      return {
        endpoint: "/api/auth/admin/login/",
        badge: "Admin Console",
        title: "Acesso administrativo global",
        description: "Gerencie ministerios, convites e usuarios de toda a plataforma.",
        buttonLabel: "Entrar no Painel Global",
        nextPath: "/admin",
        fieldLabel: "Usuario admin",
        fieldPlaceholder: "admin.global",
        fieldName: "username",
        icon: UserRound,
      };
    }

    return {
      endpoint: "/api/auth/login/",
      badge: "Ministry Access",
      title: "Acesse o seu ministério",
      description: pendingCode
        ? "Entre com sua conta para aplicar automaticamente o codigo de convite recebido."
        : "Entre com a conta vinculada ao seu ministerio ou conclua a vinculacao pelo codigo de acesso.",
      buttonLabel: "Entrar no Ministério",
      nextPath: "/app",
      fieldLabel: "Login (Nome de Usuario)",
      fieldPlaceholder: "seunome.sobrenome",
      fieldName: "username",
      icon: UserRound,
    };
  }, [isAdminMode, pendingCode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErro("");
    setHelperNotice("");
    setIsSubmitting(true);

    try {
      const payload = {
        [config.fieldName]: formData.credential,
        password: formData.password,
      };

      const dados = await apiFetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      login(dados);

      if (dados.user?.ministerio_id) {
        const redirectTo = isAdminMode
          ? resolveMemberDestination(dados)
          : location.state?.from || resolveMemberDestination(dados);
        navigate(redirectTo, { replace: true });
        return;
      }

      if (dados.user?.is_superuser) {
        navigate(resolveMemberDestination(dados), { replace: true });
        return;
      }

      if (pendingCode) {
        navigate(buildInvitePath(pendingCode), { replace: true });
        return;
      }

      navigate("/enter-code", { replace: true });
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
              <span>Seguranca com autenticacao segmentada</span>
            </div>
            <div className="feature-item">
              <Music size={18} />
              <span>Escopo isolado por ministerio</span>
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
                {isAdminMode ? "Painel global" : "Bem-vindo de volta"}
              </h3>
              <p className="text-muted">{config.description}</p>
            </header>

            <form onSubmit={handleLogin} className="login-form">
              {erro && (
                <div className="status-alert status-alert--error" role="alert">
                  {erro}
                </div>
              )}
              {helperNotice && (
                <div className="status-alert status-alert--success" role="status">
                  {helperNotice}
                </div>
              )}

              <div className="form-group grid gap-2">
                <Label htmlFor="credential">
                  {config.fieldLabel}
                </Label>
                <div className="input-wrapper">
                  <config.icon size={18} className="input-wrapper__icon" aria-hidden="true" />
                  <Input
                    type="text"
                    name="credential"
                    id="credential"
                    className="login-input-field"
                    value={formData.credential}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    spellCheck={false}
                    placeholder={config.fieldPlaceholder}
                  />
                </div>
              </div>

              <div className="form-group grid gap-2">
                <Label htmlFor="password">
                  Sua Senha
                </Label>
                <div className="input-wrapper">
                  <KeyRound size={18} className="input-wrapper__icon" aria-hidden="true" />
                  <Input
                    type="password"
                    name="password"
                    id="password"
                    className="login-input-field"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                  />
                </div>
              </div>

              {!isAdminMode && (
                <button
                  type="button"
                  className="forgot-password-link login-inline-link"
                  onClick={() =>
                    setHelperNotice(
                      "Recuperacao de senha ainda nao esta disponivel nesta versao. Procure o administrador do ministerio.",
                    )
                  }
                >
                  Esqueci minha senha
                </button>
              )}

              <button
                type="submit"
                className="lauda-btn lauda-btn-primary btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : config.buttonLabel}
              </button>
            </form>

            <div className="login-footer login-footer-links">
              {!isAdminMode ? (
                <button
                  type="button"
                  className="login-admin-link"
                  onClick={() => navigate("/admin/login")}
                  aria-label="Ir para o login administrativo"
                >
                  Acesso admin
                </button>
              ) : (
                <button
                  type="button"
                  className="login-admin-link"
                  onClick={() => navigate("/login")}
                >
                  Voltar ao login comum
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="panel-shadow-effect" aria-hidden="true" />
    </main>
  );
}
