import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import "./Membros.css";

const ESTADO_INICIAL_FORM = {
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

  // NOVO: Estado para controlar se o usuário foi bloqueado
  const [acessoNegado, setAcessoNegado] = useState(false);

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
        // NOVO: Se o Django bloquear (403), ativamos a tela de erro
        if (res.status === 403) {
          setAcessoNegado(true);
          return [];
        }
        return res.json();
      })
      .then((dados) => {
        // Garantia de que sempre será um Array para não quebrar o .map()
        if (Array.isArray(dados)) setMembros(dados);
      })
      .catch((erro) => console.error("Erro na busca:", erro));
  };

  useEffect(() => {
    buscarMembros();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditClick = (membro) => {
    setEditingMember(membro);
    setFormData({
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
    if (!editingMember) return;

    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const url = `${baseUrl.replace(/\/$/, "")}/api/usuarios/${editingMember.id}/`;

    fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (res.ok) return res.json();
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
        alert(`Erro ao salvar. Detalhes: ${erro.message}`);
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

  // NOVO: Renderiza uma tela de bloqueio elegante se for nível 3
  if (acessoNegado) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2 className="text-danger">Acesso Restrito</h2>
        <p className="text-muted">
          Você não tem permissão para visualizar ou editar a equipe.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Equipe e Membros</h2>
          <p className="text-muted">
            Gerencie os voluntários, músicos e níveis de acesso
          </p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={() => alert("Em breve: Formulário de Convidar Membro!")}
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
              {membros.map((membro) => {
                const nomeCompleto =
                  `${membro.first_name || ""} ${membro.last_name || ""}`.trim();
                return (
                  <tr key={membro.id}>
                    <td className="membro-nome">
                      {nomeCompleto || membro.username}
                    </td>
                    <td className="membro-contato">
                      <div>{membro.email || "Sem email"}</div>
                      {membro.telefone && (
                        <div className="membro-telefone">
                          <Phone size={14} /> {membro.telefone}
                        </div>
                      )}
                    </td>
                    <td className="membro-funcao">
                      {membro.funcao_principal || "-"}
                    </td>
                    <td>{renderBadgeNivel(membro.nivel_acesso)}</td>
                    <td className="membro-actions">
                      <button
                        className="lauda-btn lauda-btn-secondary btn-editar-membro"
                        onClick={() => handleEditClick(membro)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
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

      {/* (Modal de Edição omitido da explicação para economizar espaço, mas ele fica aqui em baixo igual antes) */}
      {isModalOpen && (
        // ... Seu código de modal antigo permanece exatamente o mesmo aqui
        <div className="modal-overlay">...</div>
      )}
    </div>
  );
}
