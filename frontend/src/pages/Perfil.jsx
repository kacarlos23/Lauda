import { useEffect, useState } from "react";
import { CheckCircle, Lock, Mail, Phone, Shield, User } from "lucide-react";
import MultiSelectField from "../components/MultiSelectField";
import { useAuth } from "../context/AuthContext";
import { USER_FUNCTION_OPTIONS } from "../lib/constants";
import { authFetch } from "../lib/api";
import { profileSchema } from "../lib/schemas";
import "./Perfil.css";

export default function Perfil() {
  const { token, updateUser, logout } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telefone: "",
    username: "",
    funcao_principal: "",
    funcoes: [],
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(() => Boolean(token));
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    authFetch("/api/usuarios/me/", token)
      .then((dados) => {
        if (!isMounted) {
          return;
        }

        setFormData({
          first_name: dados.first_name || "",
          last_name: dados.last_name || "",
          email: dados.email || "",
          telefone: dados.telefone || "",
          username: dados.username || "",
          funcao_principal: dados.funcao_principal || "",
          funcoes: dados.funcoes || [],
        });
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
          return;
        }

        console.error(error);
        setErro("Nao foi possivel carregar os dados.");
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [logout, token]);

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

    const validation = profileSchema.safeParse(formData);
    if (!validation.success) {
      setErro(validation.error.issues[0]?.message || "Dados invalidos.");
      return;
    }

    const dadosEnvio = { ...validation.data };

    if (passwordData.password) {
      if (passwordData.password !== passwordData.confirm_password) {
        setErro("As senhas nao coincidem!");
        return;
      }

      dadosEnvio.password = passwordData.password;
    }

    authFetch("/api/usuarios/me/", token, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEnvio),
    })
      .then((dadosAtualizados) => {
        updateUser(dadosAtualizados);
        setMensagemSucesso("Perfil atualizado com sucesso!");
        setPasswordData({ password: "", confirm_password: "" });
        setTimeout(() => setMensagemSucesso(""), 4000);
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
          return;
        }

        setErro(error.message || "Erro ao salvar alteracoes");
      });
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
            Gerencie suas informacoes pessoais e senha de acesso
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
              <Shield size={18} /> Informacoes da Conta
            </h3>

            <div className="perfil-account-meta">
              <div>
                <strong>Usuario:</strong> @{formData.username}
              </div>
              <div>
                <strong>Funcao Principal:</strong> {formData.funcao_principal}
              </div>
            </div>

            <p className="text-muted perfil-help">
              Seu usuario e somente leitura. As funcoes ministeriais agora podem ser atualizadas neste painel.
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

            <MultiSelectField
              id="perfil-funcoes"
              label="Funcoes ministeriais"
              value={formData.funcoes}
              options={USER_FUNCTION_OPTIONS}
              onChange={(nextFuncoes) =>
                setFormData((current) => ({
                  ...current,
                  funcoes: nextFuncoes,
                  funcao_principal: nextFuncoes[0] || "",
                }))
              }
              description="Selecione uma ou mais funcoes. A primeira sera usada como funcao principal."
            />
          </div>

          <div>
            <h3 className="perfil-section-title">
              <Lock size={18} /> Seguranca
            </h3>
            <p className="text-muted">
              Deixe em branco se nao quiser alterar sua senha.
            </p>

            <div className="form-row">
              <div className="form-col form-col-md">
                <label className="input-label">Nova Senha</label>
                <input
                  type="password"
                  name="password"
                  className="input-field"
                  value={passwordData.password}
                  onChange={handlePasswordChange}
                  placeholder="********"
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
                  placeholder="********"
                />
              </div>
            </div>
          </div>

          <div className="perfil-actions">
            <button type="submit" className="lauda-btn lauda-btn-primary">
              Salvar Alteracoes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
