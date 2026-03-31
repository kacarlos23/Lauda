import { useState } from "react";
import { KeyRound, Music, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import "./Login.css";

export default function Login({ setToken }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [erro, setErro] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErro("");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const urlLimpa = baseUrl.replace(/\/$/, "");

    try {
      const resposta = await fetch(`${urlLimpa}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        localStorage.setItem("token", dados.access);
        setToken(dados.access);
        return;
      }

      setErro("Usuário ou senha incorretos. Revise os dados e tente novamente.");
    } catch (error) {
      console.error("Erro no login:", error);
      setErro("Não foi possível conectar ao servidor. Tente novamente em instantes.");
    }
  };

  return (
    <>
      <div className="bottom-light-effect" aria-hidden="true" />

      <div className="login-page-container">
        <div className="login-background-orb login-background-orb-left" aria-hidden="true" />
        <div className="login-background-orb login-background-orb-right" aria-hidden="true" />

        <div className="login-floating-box glass-panel">
          <section className="login-info-section" aria-label="Apresentação da plataforma">
            <div className="login-info-badge">
              <Sparkles size={16} aria-hidden="true" />
              <span>Lauda Platform</span>
            </div>

            <div className="lauda-logo-large">
              <Music size={60} aria-hidden="true" />
              <span>Lauda</span>
            </div>

            <h2>Sua plataforma de gerenciamento ministerial.</h2>
            <p>
              Organize repertórios, crie escalas, planeje cultos e integre sua equipe de
              louvor e voluntários em um só lugar.
            </p>

            <div className="login-feature-list" aria-hidden="true">
              <div className="login-feature-item">
                <ShieldCheck size={18} />
                <span>Acesso seguro para sua equipe</span>
              </div>
              <div className="login-feature-item">
                <Music size={18} />
                <span>Organização de repertórios e escalas</span>
              </div>
            </div>
          </section>

          <section className="login-form-section" aria-label="Acesso ao sistema">
            <div className="login-form-content">
              <div className="login-header">
                <div className="login-header-icon" aria-hidden="true">
                  <KeyRound size={18} />
                </div>
                <h3 className="text-primary">Bem-vindo de volta</h3>
                <p className="text-muted">Acesse sua conta para continuar.</p>
              </div>

              <form onSubmit={handleLogin} className="form-column">
                {erro && (
                  <div className="status-alert status-alert--error login-error-alert" role="alert" aria-live="polite">
                    {erro}
                  </div>
                )}

                <div className="form-group">
                  <label className="input-label" htmlFor="username">
                    Login (Nome de Usuário)
                  </label>
                  <div className="input-shell">
                    <UserRound size={18} className="input-icon" aria-hidden="true" />
                    <input
                      type="text"
                      name="username"
                      id="username"
                      className="input-field"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      autoComplete="username"
                      spellCheck={false}
                      placeholder="seunome.sobrenome…"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label" htmlFor="password">
                    Sua Senha
                  </label>
                  <div className="input-shell">
                    <KeyRound size={18} className="input-icon" aria-hidden="true" />
                    <input
                      type="password"
                      name="password"
                      id="password"
                      className="input-field"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      placeholder="Digite sua senha…"
                    />
                  </div>
                </div>

                <button type="submit" className="lauda-btn lauda-btn-primary login-submit-btn">
                  Entrar no Sistema
                </button>

                <div className="forgot-password">
                  <button type="button" className="forgot-password-link">
                    Esqueceu a senha?
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <div className="panel-shadow-effect" aria-hidden="true" />
      </div>
    </>
  );
}
