import { useState, useEffect } from "react";
// Importando os ícones do Lucide React
import {
  Calendar,
  MapPin,
  Tag,
  Users,
  Music,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import "./Cultos.css";

const ESTADO_INICIAL_CULTO = {
  nome: "",
  data: "",
  horario_inicio: "",
  horario_termino: "",
  local: "",
  status: "AGENDADO",
};

export default function Cultos() {
  const [cultos, setCultos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [escalas, setEscalas] = useState([]);

  const [musicasGlobais, setMusicasGlobais] = useState([]);
  const [itensSetlist, setItensSetlist] = useState([]);
  const [isSetlistModalOpen, setIsSetlistModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [cultoSelecionado, setCultoSelecionado] = useState(null);
  const [novoMembroId, setNovoMembroId] = useState("");
  const [isCultoModalOpen, setIsCultoModalOpen] = useState(false);
  const [editingCultoId, setEditingCultoId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL_CULTO);

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const urlLimpa = baseUrl.replace(/\/$/, "");

  const carregarDados = () => {
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    Promise.all([
      fetch(`${urlLimpa}/api/cultos/`, { headers }).then((r) => r.json()),
      fetch(`${urlLimpa}/api/usuarios/`, { headers }).then((r) => r.json()),
      fetch(`${urlLimpa}/api/escalas/`, { headers }).then((r) => r.json()),
      fetch(`${urlLimpa}/api/musicas/`, { headers }).then((r) => r.json()),
      fetch(`${urlLimpa}/api/setlists/`, { headers }).then((r) => r.json()),
    ])
      .then(
        ([cultosData, membrosData, escalasData, musicasData, setlistsData]) => {
          if (cultosData.detail) throw new Error("Não autorizado");
          setCultos(cultosData);
          setMembros(membrosData);
          setEscalas(escalasData);
          setMusicasGlobais(musicasData);
          setItensSetlist(setlistsData);
        },
      )
      .catch((erro) => {
        console.error("Erro na busca:", erro);
        localStorage.removeItem("token");
        window.location.href = "/";
      });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarDataBR = (dataString) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const handleChangeCulto = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNovoCulto = () => {
    setFormData(ESTADO_INICIAL_CULTO);
    setEditingCultoId(null);
    setIsCultoModalOpen(true);
  };

  const handleEditarCulto = (culto) => {
    setFormData({
      nome: culto.nome || "",
      data: culto.data || "",
      horario_inicio: culto.horario_inicio
        ? culto.horario_inicio.substring(0, 5)
        : "",
      horario_termino: culto.horario_termino
        ? culto.horario_termino.substring(0, 5)
        : "",
      local: culto.local || "",
      status: culto.status || "AGENDADO",
    });
    setEditingCultoId(culto.id);
    setIsCultoModalOpen(true);
  };

  const handleSalvarCulto = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const url = editingCultoId
      ? `${urlLimpa}/api/cultos/${editingCultoId}/`
      : `${urlLimpa}/api/cultos/`;
    const method = editingCultoId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    }).then((res) => {
      if (res.ok) {
        setIsCultoModalOpen(false);
        carregarDados();
      } else {
        alert("Erro ao salvar o culto. Verifique os dados.");
      }
    });
  };

  const handleExcluirCulto = (id) => {
    if (
      !window.confirm(
        "Certeza que deseja excluir este culto? Escalas e setlists serão perdidas!",
      )
    )
      return;
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/cultos/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.ok) carregarDados();
    });
  };

  const abrirModalEscala = (culto) => {
    setCultoSelecionado(culto);
    setIsEscalaModalOpen(true);
  };
  const fecharModalEscala = () => {
    setIsEscalaModalOpen(false);
    setCultoSelecionado(null);
    setNovoMembroId("");
  };

  const handleAdicionarEscala = (e) => {
    e.preventDefault();
    if (!novoMembroId || !cultoSelecionado) return;
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/escalas/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        culto: cultoSelecionado.id,
        membro: novoMembroId,
        status_confirmacao: "PENDENTE",
      }),
    }).then((res) => {
      if (res.ok) {
        carregarDados();
        setNovoMembroId("");
      }
    });
  };

  const handleRemoverEscala = (escalaId) => {
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/escalas/${escalaId}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.ok) carregarDados();
    });
  };

  const abrirModalSetlist = (culto) => {
    setCultoSelecionado(culto);
    setIsSetlistModalOpen(true);
  };

  const handleDragStart = (e, item, source) => {
    setDraggedItem({ item, source });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDropToSetlist = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (draggedItem && draggedItem.source === "repertorio") {
      const musica = draggedItem.item;
      const token = localStorage.getItem("token");
      fetch(`${urlLimpa}/api/setlists/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          culto: cultoSelecionado.id,
          musica: musica.id,
          ordem:
            itensSetlist.filter((i) => i.culto === cultoSelecionado.id).length +
            1,
          tom_execucao: musica.tom_original,
          observacoes: "Louvor",
        }),
      }).then((res) => {
        if (res.ok) carregarDados();
      });
    }
    setDraggedItem(null);
  };

  const handleDropToRepertorio = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (draggedItem && draggedItem.source === "setlist") {
      const token = localStorage.getItem("token");
      fetch(`${urlLimpa}/api/setlists/${draggedItem.item.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (res.ok) carregarDados();
      });
    }
    setDraggedItem(null);
  };

  const handleChangeItemSetlistLocal = (itemId, campo, valor) => {
    setItensSetlist((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, [campo]: valor } : i)),
    );
  };

  const handleAtualizarItemSetlistBanco = (itemId, campo, valor) => {
    if (!itemId) return;
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/setlists/${itemId}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ [campo]: valor }),
    }).catch((err) => console.error("Erro ao atualizar setlist:", err));
  };

  const escalasDoCulto = cultoSelecionado
    ? escalas.filter((e) => e.culto === cultoSelecionado.id)
    : [];
  const membrosDisponiveis = membros.filter(
    (membro) => !escalasDoCulto.some((escala) => escala.membro === membro.id),
  );

  const setlistAtual = cultoSelecionado
    ? itensSetlist
        .filter((i) => i.culto === cultoSelecionado.id)
        .sort((a, b) => a.ordem - b.ordem)
    : [];
  const repertorioDisponivel = musicasGlobais.filter(
    (m) => !setlistAtual.some((item) => item.musica === m.id),
  );

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Agenda de Cultos</h2>
          <p className="text-muted">Gerencie eventos, escalas e setlists</p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={handleNovoCulto}
        >
          <Plus size={18} /> Novo Culto
        </button>
      </div>

      <div className="cultos-grid">
        {cultos.map((culto) => (
          <div
            key={culto.id}
            className="lauda-card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="culto-info">
                <h3>{culto.nome}</h3>
                <div className="culto-data">
                  <Calendar size={16} /> {formatarDataBR(culto.data)} das{" "}
                  {culto.horario_inicio?.substring(0, 5) || "--:--"}
                </div>
              </div>
              <div className="culto-meta text-muted">
                <div className="culto-meta-item">
                  <MapPin size={16} /> <strong>Local:</strong> {culto.local}
                </div>
                <div className="culto-meta-item">
                  <Tag size={16} /> <strong>Status:</strong>
                  <span
                    className={`badge ${culto.status === "AGENDADO" ? "badge-primary" : "badge-gray"}`}
                  >
                    {culto.status}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--gray-200)",
                paddingTop: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "15px",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{ flex: 1, padding: "5px", fontSize: "0.85rem" }}
                  onClick={() => abrirModalEscala(culto)}
                >
                  <Users size={16} /> Escala
                </button>
                <button
                  className="lauda-btn lauda-btn-primary"
                  style={{ flex: 1, padding: "5px", fontSize: "0.85rem" }}
                  onClick={() => abrirModalSetlist(culto)}
                >
                  <Music size={16} /> Setlist
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{
                    flex: 1,
                    padding: "5px",
                    fontSize: "0.85rem",
                    border: "none",
                    backgroundColor: "transparent",
                  }}
                  onClick={() => handleEditarCulto(culto)}
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{
                    flex: 1,
                    padding: "5px",
                    fontSize: "0.85rem",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "var(--error-dark)",
                  }}
                  onClick={() => handleExcluirCulto(culto.id)}
                >
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================
          MODAL DE CRIAR / EDITAR CULTO
          ========================================= */}
      {isCultoModalOpen && (
        <div
          className="modal-overlay"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="lauda-card"
            style={{ width: "100%", maxWidth: "500px", margin: "20px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 className="text-primary">
                {editingCultoId ? "Editar Culto" : "Agendar Novo Culto"}
              </h3>
              <button
                onClick={() => setIsCultoModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSalvarCulto}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label className="input-label">Nome do Culto / Evento *</label>
                <input
                  type="text"
                  name="nome"
                  className="input-field"
                  value={formData.nome}
                  onChange={handleChangeCulto}
                  required
                  placeholder="Ex: Culto de Domingo"
                />
              </div>

              <div>
                <label className="input-label">Data *</label>
                <input
                  type="date"
                  name="data"
                  className="input-field"
                  value={formData.data}
                  onChange={handleChangeCulto}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Início *</label>
                  <input
                    type="time"
                    name="horario_inicio"
                    className="input-field"
                    value={formData.horario_inicio}
                    onChange={handleChangeCulto}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Término *</label>
                  <input
                    type="time"
                    name="horario_termino"
                    className="input-field"
                    value={formData.horario_termino}
                    onChange={handleChangeCulto}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 2 }}>
                  <label className="input-label">Local *</label>
                  <input
                    type="text"
                    name="local"
                    className="input-field"
                    value={formData.local}
                    onChange={handleChangeCulto}
                    required
                    placeholder="Ex: Templo Principal"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Status</label>
                  <select
                    name="status"
                    className="input-field"
                    value={formData.status}
                    onChange={handleChangeCulto}
                    required
                  >
                    <option value="AGENDADO">Agendado</option>
                    <option value="REALIZADO">Realizado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary"
                  onClick={() => setIsCultoModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="lauda-btn lauda-btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DE ESCALAS DA EQUIPE
          ========================================= */}
      {isEscalaModalOpen && cultoSelecionado && (
        <div
          className="modal-overlay"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="lauda-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 className="text-primary">Escala: {cultoSelecionado.nome}</h3>
              <button
                onClick={fecharModalEscala}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleAdicionarEscala}
              style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
            >
              <select
                className="input-field"
                value={novoMembroId}
                onChange={(e) => setNovoMembroId(e.target.value)}
                required
                style={{ flex: 1 }}
              >
                <option value="">Selecione um membro para escalar...</option>
                {membrosDisponiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name || m.username} - {m.funcao_principal}
                  </option>
                ))}
              </select>
              <button type="submit" className="lauda-btn lauda-btn-primary">
                Adicionar
              </button>
            </form>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                    <th style={{ padding: "10px" }}>Membro</th>
                    <th style={{ padding: "10px" }}>Função</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {escalasDoCulto.map((escala) => {
                    const membro = membros.find((m) => m.id === escala.membro);
                    return (
                      <tr
                        key={escala.id}
                        style={{ borderBottom: "1px solid var(--gray-100)" }}
                      >
                        <td style={{ padding: "10px", fontWeight: "500" }}>
                          {membro
                            ? membro.first_name || membro.username
                            : "Carregando..."}
                        </td>
                        <td
                          style={{ padding: "10px", color: "var(--gray-600)" }}
                        >
                          {membro ? membro.funcao_principal : "-"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            className={`badge ${escala.status_confirmacao === "CONFIRMADO" ? "badge-primary" : "badge-gray"}`}
                          >
                            {escala.status_confirmacao}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button
                            onClick={() => handleRemoverEscala(escala.id)}
                            style={{
                              background: "none",
                              border: "1px solid var(--error-dark)",
                              color: "var(--error-dark)",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {escalasDoCulto.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          textAlign: "center",
                          padding: "30px",
                          color: "var(--gray-500)",
                        }}
                      >
                        Nenhum membro escalado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL DA SETLIST (DRAG AND DROP)
          ========================================= */}
      {isSetlistModalOpen && cultoSelecionado && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "1000px", width: "95%" }}>
            <div className="modal-header">
              <h3 className="modal-title">Setlist: {cultoSelecionado.nome}</h3>
              <button
                onClick={() => setIsSetlistModalOpen(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="text-muted" style={{ marginBottom: "10px" }}>
                Arraste as músicas do repertório (esquerda) para a setlist do
                culto (direita). Arraste de volta para remover.
              </p>

              <div className="dnd-container">
                <div
                  className="dnd-column"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropToRepertorio}
                >
                  <h4
                    style={{ marginBottom: "15px", color: "var(--gray-700)" }}
                  >
                    📚 Repertório Disponível
                  </h4>

                  {repertorioDisponivel.map((musica) => (
                    <div
                      key={musica.id}
                      className="dnd-item"
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, musica, "repertorio")
                      }
                    >
                      <div className="dnd-item-title">{musica.titulo}</div>
                      <div className="dnd-item-subtitle">
                        {musica.artista} • Tom: {musica.tom_original}
                      </div>
                    </div>
                  ))}
                  {repertorioDisponivel.length === 0 && (
                    <p className="text-muted">Nenhuma música disponível.</p>
                  )}
                </div>

                <div
                  className="dnd-column"
                  style={{
                    backgroundColor: "var(--primary-lightest)",
                    border: "1px solid var(--primary-light)",
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropToSetlist}
                >
                  <h4
                    style={{
                      marginBottom: "15px",
                      color: "var(--primary-dark)",
                    }}
                  >
                    🎵 Músicas do Culto
                  </h4>

                  {setlistAtual.map((item, index) => {
                    const musica = musicasGlobais.find(
                      (m) => m.id === item.musica,
                    );
                    if (!musica) return null;

                    return (
                      <div
                        key={item.id}
                        className="dnd-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, "setlist")}
                        style={{ borderLeft: "4px solid var(--primary)" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: "150px" }}>
                            <div className="dnd-item-title">
                              {index + 1}. {musica.titulo}
                            </div>
                            <div className="dnd-item-subtitle">
                              {musica.artista}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "5px",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="text"
                              value={item.tom_execucao || ""}
                              onChange={(e) =>
                                handleChangeItemSetlistLocal(
                                  item.id,
                                  "tom_execucao",
                                  e.target.value,
                                )
                              }
                              onBlur={(e) =>
                                handleAtualizarItemSetlistBanco(
                                  item.id,
                                  "tom_execucao",
                                  e.target.value,
                                )
                              }
                              style={{
                                width: "45px",
                                padding: "4px",
                                textAlign: "center",
                                border: "1px solid var(--gray-300)",
                                borderRadius: "4px",
                                fontWeight: "bold",
                              }}
                              title="Tom de Execução"
                            />
                            <input
                              type="text"
                              value={item.observacoes || ""}
                              onChange={(e) =>
                                handleChangeItemSetlistLocal(
                                  item.id,
                                  "observacoes",
                                  e.target.value,
                                )
                              }
                              onBlur={(e) =>
                                handleAtualizarItemSetlistBanco(
                                  item.id,
                                  "observacoes",
                                  e.target.value,
                                )
                              }
                              placeholder="Momento"
                              style={{
                                width: "120px",
                                padding: "4px",
                                border: "1px solid var(--gray-300)",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {setlistAtual.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        marginTop: "40px",
                        color: "var(--primary)",
                      }}
                    >
                      Arraste as músicas para cá! 👇
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
