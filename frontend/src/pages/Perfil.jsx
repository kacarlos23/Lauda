import { useEffect, useState } from "react";
import { CheckCircle, Lock, Mail, Phone, Shield, User } from "lucide-react";
import "./Perfil.css";

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
  }, [urlLimpa]);

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
        setPasswordData({ password: "", confirm_password: "" });
        setTimeout(() => setMensagemSucesso(""), 4000);
      })
      .catch((err) => setErro(err.message));
  };

  if (loading) {
    return <div className="perfil-loading">Carregando perfil...</div>;
  }

  return (
    <div>
      <div className="lauda-page-header">
        <div className="page-title-group">
          <h2 className="text-primary perfil-page-title">
            <User size={28} /> Meu Perfil
          </h2>
          <p className="text-muted">
            Gerencie suas informações pessoais e senha de acesso
          </p>
        </div>
      </div>

      <div className="perfil-wrapper">
        {mensagemSucesso && (
          <div className="status-alert status-alert--success perfil-success">
            <CheckCircle size={20} /> {mensagemSucesso}
          </div>
        )}

        {erro && <div className="error-message perfil-error">{erro}</div>}

        <form onSubmit={handleSalvarPerfil} className="lauda-card perfil-form">
          <div>
            <h3 className="perfil-section-title">
              <Shield size={18} /> Informações da Conta
            </h3>

            <div className="perfil-account-meta">
              <div>
                <strong>Usuário:</strong> @{formData.username}
              </div>
              <div>
                <strong>Função Principal:</strong> {formData.funcao_principal}
              </div>
            </div>

            <p className="text-muted perfil-help">
              Para alterar seu usuário ou função ministerial, contate o
              administrador.
            </p>
          </div>

          <div>
            <h3 className="perfil-section-title">
              <User size={18} /> Dados Pessoais
            </h3>

            <div className="form-row">
              <div className="form-col form-col-md">
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

              <div className="form-col form-col-md">
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

            <div className="form-row">
              <div className="form-col form-col-md">
                <label className="input-label">
                  <Mail size={14} /> E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  className="input-field"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-col form-col-md">
                <label className="input-label">
                  <Phone size={14} /> Telefone (WhatsApp)
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

          <div>
            <h3 className="perfil-section-title">
              <Lock size={18} /> Segurança
            </h3>
            <p className="text-muted">Deixe em branco se não quiser alterar sua senha.</p>

            <div className="form-row">
              <div className="form-col form-col-md">
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

              <div className="form-col form-col-md">
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

          <div className="perfil-actions">
            <button type="submit" className="lauda-btn lauda-btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
