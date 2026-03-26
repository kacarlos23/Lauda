import { useState, useEffect } from "react";
import "./Membros.css";
import { Phone } from "lucide-react";

// Adicionamos username e password, exigidos pelo AbstractUser do Django
const ESTADO_INICIAL_FORM = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  telefone: "",
  funcao_principal: "",
  nivel_acesso: 3,
};

export default function Membros() {
  const [membros, setMembros] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL_FORM);

  const buscarMembros = () => {
    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const urlLimpa = baseUrl.replace(/\/$/, "");

    fetch(`${urlLimpa}/api/usuarios/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/";
          throw new Error("Sessao expirada");
        }
        return res.json();
      })
      .then((dados) => setMembros(dados))
      .catch((erro) => console.error("Erro na busca:", erro));
  };

  useEffect(() => {
    buscarMembros();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // NOVO: Função para abrir modal de Criação
  const handleNovoClick = () => {
    setEditingMember(null);
    setFormData(ESTADO_INICIAL_FORM);
    setIsModalOpen(true);
  };

  const handleEditClick = (membro) => {
    setEditingMember(membro);
    setFormData({
      username: membro.username || "",
      password: "", // Deixamos a senha vazia na edição, para o admin alterar só se quiser
      first_name: membro.first_name || "",
      last_name: membro.last_name || "",
      email: membro.email || "",
      telefone: membro.telefone || "",
      funcao_principal: membro.funcao_principal || "",
      nivel_acesso: membro.nivel_acesso || 3,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setFormData(ESTADO_INICIAL_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

    // Define a URL e o Método dependendo se é Edição (PUT) ou Criação (POST)
    const url = editingMember
      ? `${baseUrl.replace(/\/$/, "")}/api/usuarios/${editingMember.id}/`
      : `${baseUrl.replace(/\/$/, "")}/api/usuarios/`;

    const metodo = editingMember ? "PUT" : "POST";

    // Copiamos os dados. Se for edição e a senha estiver vazia, não enviamos a senha
    // para não sobrescrever com nada no banco.
    const dadosEnvio = { ...formData };
    if (editingMember && !dadosEnvio.password) {
      delete dadosEnvio.password;
    }

    fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEnvio),
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return res.text().then((text) => {
          throw new Error(text);
        });
      })
      .then(() => {
        handleCloseModal();
        buscarMembros();
      })
      .catch((erro) => {
        console.error("Erro ao salvar membro:", erro);
        alert(
          `Erro ao salvar membro. Verifique os dados. Detalhes: ${erro.message}`,
        );
      });
  };

  const renderBadgeNivel = (nivel) => {
    if (nivel == 1)
      return (
        <span className="badge badge-primary membro-badge-admin">
          Administrador
        </span>
      );
    if (nivel == 2)
      return <span className="badge badge-secondary">Líder de Louvor</span>;
    return <span className="badge badge-gray">Membro</span>;
  };

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Equipe e Membros</h2>
          <p className="text-muted">
            Gerencie os voluntários, músicos e níveis de acesso
          </p>
        </div>
        {/* ATUALIZADO: Chama a função que abre o formulário vazio */}
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={handleNovoClick}
        >
          + Novo Membro
        </button>
      </div>

      <div className="lauda-card membros-table-card">
        <div className="lauda-table-container">
          <table className="lauda-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email / Contato</th>
                <th>Função Principal</th>
                <th>Nível de Acesso</th>
                <th className="membro-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((membro) => (
                <tr key={membro.id}>
                  <td className="membro-nome">
                    {/* Renderização mais segura do nome sugerida no doc */}
                    {membro.first_name
                      ? `${membro.first_name} ${membro.last_name || ""}`.trim()
                      : membro.username}
                  </td>
                  <td className="membro-contato">
                    <div>{membro.email || "Sem email"}</div>
                    {membro.telefone && (
                      <div className="membro-telefone">
                        {/* NOVO ÍCONE DO LUCIDE AQUI */}
                        <Phone size={14} /> {membro.telefone}
                      </div>
                    )}
                  </td>
                  <td className="membro-funcao">
                    {membro.funcao_principal || "-"}
                  </td>
                  <td>{renderBadgeNivel(membro.nivel_acesso)}</td>
                  <td className="membro-acoes">
                    <button
                      className="lauda-btn lauda-btn-secondary btn-editar-membro"
                      onClick={() => handleEditClick(membro)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}

              {membros.length === 0 && (
                <tr>
                  <td colSpan="5" className="tabela-vazia">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingMember ? "Editar Membro" : "Cadastrar Novo Membro"}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body modal-form">
                {/* NOVO: Linha do Login (Usuário e Senha) */}
                <div className="form-row-wrap">
                  <div className="form-field-grow">
                    <label className="input-label">
                      Nome de Usuário (Login) *
                    </label>
                    <input
                      type="text"
                      name="username"
                      className="input-field"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="Ex: joao.silva"
                    />
                  </div>
                  <div className="form-field-grow">
                    <label className="input-label">
                      {editingMember
                        ? "Nova Senha (deixe em branco para não alterar)"
                        : "Senha Temporária *"}
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="input-field"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingMember} // Só é obrigatório se estiver CRIANDO
                    />
                  </div>
                </div>

                {/* Linha 1: Nome e Sobrenome */}
                <div className="form-row-wrap">
                  <div className="form-field-grow">
                    <label className="input-label">Nome *</label>
                    <input
                      type="text"
                      name="first_name"
                      className="input-field"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field-grow">
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

                {/* Linha 2: Email e Telefone */}
                <div className="form-row-wrap">
                  <div className="form-field-grow">
                    <label className="input-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      className="input-field"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field-grow">
                    <label className="input-label">Telefone</label>
                    <input
                      type="tel"
                      name="telefone"
                      className="input-field"
                      value={formData.telefone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Linha 3: Função e Nível de Acesso */}
                <div className="form-row-wrap">
                  <div className="form-field-grow">
                    <label className="input-label">Função Principal *</label>
                    <input
                      type="text"
                      name="funcao_principal"
                      className="input-field"
                      value={formData.funcao_principal}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Bateria, Vocal"
                    />
                  </div>
                  <div className="form-field-grow">
                    <label className="input-label">Nível de Acesso *</label>
                    <select
                      name="nivel_acesso"
                      className="input-field"
                      value={formData.nivel_acesso}
                      onChange={handleChange}
                      required
                    >
                      <option value={3}>Membro</option>
                      <option value={2}>Líder de Louvor</option>
                      <option value={1}>Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="lauda-btn lauda-btn-primary">
                  {editingMember ? "Salvar Alterações" : "Cadastrar Membro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
