import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Shield, CheckCircle } from "lucide-react";

export default function Perfil() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telefone: "",
    username: "",
    funcao_principal: "",
  });

  const [passwordData, setPasswordData] = useState({
    password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const urlLimpa = baseUrl.replace(/\/$/, "");

  // Busca os dados do próprio usuário na rota /me/
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/usuarios/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar perfil");
        return res.json();
      })
      .then((dados) => {
        setFormData({
          first_name: dados.first_name || "",
          last_name: dados.last_name || "",
          email: dados.email || "",
          telefone: dados.telefone || "",
          username: dados.username || "",
          funcao_principal: dados.funcao_principal || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErro("Não foi possível carregar os dados.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSalvarPerfil = (e) => {
    e.preventDefault();
    setErro("");
    setMensagemSucesso("");
    const token = localStorage.getItem("token");

    const dadosEnvio = { ...formData };

    // Se ele digitou algo na senha, nós validamos e enviamos junto
    if (passwordData.password) {
      if (passwordData.password !== passwordData.confirm_password) {
        setErro("As senhas não coincidem!");
        return;
      }
      dadosEnvio.password = passwordData.password;
    }

    fetch(`${urlLimpa}/api/usuarios/me/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEnvio),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao salvar alterações");
        return res.json();
      })
      .then(() => {
        setMensagemSucesso("Perfil atualizado com sucesso!");
        setPasswordData({ password: "", confirm_password: "" }); // Limpa os campos de senha
        setTimeout(() => setMensagemSucesso(""), 4000); // Apaga a mensagem depois de 4s
      })
      .catch((err) => setErro(err.message));
  };

  if (loading)
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Carregando perfil...
      </div>
    );

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2
            className="text-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <User size={28} /> Meu Perfil
          </h2>
          <p className="text-muted">
            Gerencie suas informações pessoais e senha de acesso
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "100vw", margin: "0 auto" }}>
        {mensagemSucesso && (
          <div
            style={{
              backgroundColor: "var(--success-light)",
              color: "var(--success-dark)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle size={20} /> {mensagemSucesso}
          </div>
        )}

        {erro && (
          <div className="error-message" style={{ marginBottom: "1.5rem" }}>
            {erro}
          </div>
        )}

        <form
          onSubmit={handleSalvarPerfil}
          className="lauda-card"
          style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
        >
          {/* BLOCO 1: Informações de Leitura (Não editáveis aqui) */}
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                borderBottom: "1px solid var(--gray-200)",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
                color: "var(--gray-800)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Shield size={18} /> Informações da Conta
            </h3>
            <div
              style={{
                display: "flex",
                gap: "2rem",
                color: "var(--gray-600)",
                fontSize: "0.9rem",
              }}
            >
              <div>
                <strong>Usuário:</strong> @{formData.username}
              </div>
              <div>
                <strong>Função Principal:</strong> {formData.funcao_principal}
              </div>
            </div>
            <p
              className="text-muted"
              style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}
            >
              Para alterar seu usuário ou função ministerial, contate o
              administrador.
            </p>
          </div>

          {/* BLOCO 2: Dados Pessoais */}
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                borderBottom: "1px solid var(--gray-200)",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
                color: "var(--gray-800)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <User size={18} /> Dados Pessoais
            </h3>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <div style={{ flex: "1 1 200px" }}>
                <label className="input-label">Nome</label>
                <input
                  type="text"
                  name="first_name"
                  className="input-field"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label className="input-label">Sobrenome</label>
                <input
                  type="text"
                  name="last_name"
                  className="input-field"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label className="input-label">
                  <Mail
                    size={14}
                    style={{ display: "inline", marginBottom: "-2px" }}
                  />{" "}
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  className="input-field"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label className="input-label">
                  <Phone
                    size={14}
                    style={{ display: "inline", marginBottom: "-2px" }}
                  />{" "}
                  Telefone (WhatsApp)
                </label>
                <input
                  type="text"
                  name="telefone"
                  className="input-field"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 3: Alteração de Senha */}
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                borderBottom: "1px solid var(--gray-200)",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
                color: "var(--gray-800)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Lock size={18} /> Segurança
            </h3>
            <p className="text-muted" style={{ marginBottom: "1rem" }}>
              Deixe em branco se não quiser alterar sua senha.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label className="input-label">Nova Senha</label>
                <input
                  type="password"
                  name="password"
                  className="input-field"
                  value={passwordData.password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label className="input-label">Confirmar Nova Senha</label>
                <input
                  type="password"
                  name="confirm_password"
                  className="input-field"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "1rem",
            }}
          >
            <button type="submit" className="lauda-btn lauda-btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
