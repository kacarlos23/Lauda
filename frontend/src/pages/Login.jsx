import { useState } from "react";
import {
  KeyRound,
  Music,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
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

      setErro(
        "Usuário ou senha incorretos. Revise os dados e tente novamente.",
      );
    } catch (error) {
      console.error("Erro no login:", error);
      setErro(
        "Não foi possível conectar ao servidor. Tente novamente em instantes.",
      );
    }
  };

  return (
    <main className="login-page-wrapper">
      {/* Efeitos de Fundo */}
      <div className="login-background-orb orb-left" aria-hidden="true" />
      <div className="login-background-orb orb-right" aria-hidden="true" />
      <div className="bottom-light-effect" aria-hidden="true" />

      {/* Container Principal (Vidro) */}
      <div className="login-glass-panel">
        {/* Painel Esquerdo: Branding e Informações */}
        <aside className="login-branding-panel">
          <div className="login-badge">
            <Sparkles size={16} aria-hidden="true" />
            <span>Lauda Platform</span>
          </div>

          <div className="login-logo">
            <Music size={52} aria-hidden="true" />
            <span>Lauda</span>
          </div>

          <h2>Sua plataforma de gerenciamento ministerial.</h2>
          <p>
            Organize repertórios, crie escalas, planeje cultos e integre sua
            equipe de louvor e voluntários em um só lugar.
          </p>

          <div className="login-features">
            <div className="feature-item">
              <ShieldCheck size={18} />
              <span>Acesso seguro para sua equipe</span>
            </div>
            <div className="feature-item">
              <Music size={18} />
              <span>Organização de repertórios e escalas</span>
            </div>
          </div>
        </aside>

        {/* Painel Direito: Formulário de Login */}
        <section className="login-form-panel">
          <div className="login-form-content">
            <header className="login-header">
              <div className="login-header-icon" aria-hidden="true">
                <KeyRound size={20} />
              </div>
              <h3 className="text-primary">Bem-vindo de volta</h3>
              <p className="text-muted">Acesse sua conta para continuar.</p>
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
                  <UserRound
                    size={18}
                    className="input-icon"
                    aria-hidden="true"
                  />
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
                    placeholder="seunome.sobrenome…"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label" htmlFor="password">
                  Sua Senha
                </label>
                <div className="input-wrapper">
                  <KeyRound
                    size={18}
                    className="input-icon"
                    aria-hidden="true"
                  />
                  <input
                    type="password"
                    name="password"
                    id="password"
                    className="login-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha…"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="lauda-btn lauda-btn-primary btn-submit"
              >
                Entrar no Sistema
              </button>

              <div className="login-footer">
                <button type="button" className="forgot-password-link">
                  Esqueceu a senha?
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <div className="panel-shadow-effect" aria-hidden="true" />
    </main>
  );
}
