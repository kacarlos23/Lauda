// frontend/src/pages/Login.jsx
import { useState } from "react";
import "./Login.css";

export default function Login({ setToken }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    try {
      const resposta = await fetch("https://lauda-rust.vercel.app/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (resposta.ok) {
        const dados = await resposta.json();
        localStorage.setItem("token", dados.access);
        setToken(dados.access);
      } else {
        setErro("Usuário ou senha incorretos.");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor.");
    }
  };

  return (
    // ALTERAÇÃO: trocado div+style inline por div+className
    <div className="login-container">
      <div className="lauda-card login-card">
        <div className="login-header">
          <h1 className="lauda-logo">
            <span>🎶</span> Lauda
          </h1>
          <p className="text-muted">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label className="input-label">Usuário</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Senha</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>

          {erro && <p className="error-message">{erro}</p>}

          <button type="submit" className="lauda-btn lauda-btn-primary">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
