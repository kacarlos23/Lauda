// frontend/src/pages/Login.jsx
import { useState } from "react";
import "./Login.css";

export default function Login({ setToken }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [erro, setErro] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
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
      } else {
        setErro("Usuário ou senha incorretos.");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setErro("Houve um erro de conexão com o servidor. Tente novamente.");
    }
  };

  return (
    // NOVO: Container de Fundo (Escuro com Padding geral)
    <div className="login-page-container">
      {/* NOVO: O Cartão Flutuante (Com Sombra e Bordas) */}
      <div className="login-floating-box">
        {/* 1. ÁREA ESQUERDA - INFORMAÇÕES (Mantida classe) */}
        <div className="login-info-section">
          <div className="lauda-logo-large">
            <span>🎶</span>
            Lauda
          </div>
          <h2>Sua plataforma de gerenciamento ministerial.</h2>
          <p>
            Organize repertórios, crie escalas, planeje cultos e integre sua
            equipe de louvor e voluntários em um só lugar.
          </p>
        </div>

        {/* 2. ÁREA DIREITA - FORMULÁRIO (Mantida classe principal) */}
        <div className="login-form-section">
          {/* ATUALIZADO: Usamos login-form-content em vez de lauda-card,
              pois o cartão já é a caixa flutuante inteira */}
          <div className="login-form-content">
            <div className="login-header">
              <h3 className="text-primary">Bem-vindo de volta</h3>
              <p className="text-muted">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="form-column">
              {erro && (
                <div
                  className="badge badge-error"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginBottom: "10px",
                    padding: "10px",
                  }}
                >
                  ⚠️ {erro}
                </div>
              )}

              <div className="form-group">
                <label className="input-label" htmlFor="username">
                  Login (Nome de Usuário)
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  className="input-field"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="seunome.sobrenome"
                />
              </div>

              <div className="form-group">
                <label className="input-label" htmlFor="password">
                  Sua Senha
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  className="input-field"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="********"
                />
              </div>

              <button
                type="submit"
                className="lauda-btn lauda-btn-primary"
                style={{ width: "100%", marginTop: "10px" }}
              >
                Entrar no Sistema
              </button>
            </form>
          </div>
        </div>
      </div>{" "}
      {/* Fim da login-floating-box */}
    </div> /* Fim da login-page-container */
  );
}
