import { useCallback, useEffect, useState } from "react";
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
  Minus,
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

  const carregarDados = useCallback(() => {
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Correção: r.ok verifica se o status é 200 (Sucesso). Se for 403 (Bloqueado), ele devolve um array vazio [] para não quebrar a tela.
    Promise.all([
      fetch(`${urlLimpa}/api/cultos/`, { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(`${urlLimpa}/api/usuarios/`, { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(`${urlLimpa}/api/escalas/`, { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(`${urlLimpa}/api/musicas/`, { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(`${urlLimpa}/api/setlists/`, { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(
        ([cultosData, membrosData, escalasData, musicasData, setlistsData]) => {
          setCultos(cultosData);
          setMembros(membrosData);
          setEscalas(escalasData);
          setMusicasGlobais(musicasData);
          setItensSetlist(setlistsData);
        },
      )
      .catch((erro) => {
        console.error("Erro na busca:", erro);
      });
  }, [urlLimpa]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

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

  const adicionarMusicaNaSetlist = (musica) => {
    if (!cultoSelecionado) return;
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
        ordem: setlistAtual.length + 1,
        tom_execucao: musica.tom_original,
        observacoes: "Louvor",
      }),
    }).then((res) => {
      if (res.ok) carregarDados();
    });
  };

  const removerMusicaDaSetlist = (itemId) => {
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/setlists/${itemId}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.ok) carregarDados();
    });
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
    (m) =>
      m.is_active !== false &&
      !setlistAtual.some((item) => item.musica === m.id),
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
          <div key={culto.id} className="lauda-card culto-card">
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

            <div className="culto-actions-panel">
              <div className="culto-actions-row">
                <button
                  className="lauda-btn lauda-btn-secondary culto-action-btn"
                  onClick={() => abrirModalEscala(culto)}
                >
                  <Users size={16} /> Escala
                </button>
                <button
                  className="lauda-btn lauda-btn-primary culto-action-btn"
                  onClick={() => abrirModalSetlist(culto)}
                >
                  <Music size={16} /> Setlist
                </button>
              </div>

              <div className="culto-actions-row">
                <button
                  className="lauda-btn lauda-btn-secondary culto-action-btn culto-action-btn-ghost"
                  onClick={() => handleEditarCulto(culto)}
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  className="lauda-btn lauda-btn-secondary culto-action-btn culto-action-btn-ghost-danger"
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
        <div className="modal-overlay">
          <div className="modal modal-compact">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCultoId ? "Editar Culto" : "Agendar Novo Culto"}
              </h3>
              <button onClick={() => setIsCultoModalOpen(false)} className="modal-close">
                ×
              </button>
            </div>

            <form onSubmit={handleSalvarCulto}>
              <div className="modal-body modal-form">
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

                <div className="form-row culto-form-row">
                  <div className="form-col">
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
                  <div className="form-col">
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

                <div className="form-row culto-form-row">
                  <div className="form-col culto-form-col-wide">
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
                  <div className="form-col">
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
              </div>

              <div className="modal-footer">
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Escala: {cultoSelecionado.nome}</h3>
              <button onClick={fecharModalEscala} className="modal-close">
                ×
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleAdicionarEscala} className="escala-toolbar">
                <select
                  value={novoMembroId}
                  onChange={(e) => setNovoMembroId(e.target.value)}
                  required
                className="input-field escala-toolbar-select"
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

              <div className="lauda-table-container">
                <table className="lauda-table">
                <thead>
                  <tr>
                    <th>Membro</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {escalasDoCulto.map((escala) => {
                    const membro = membros.find((m) => m.id === escala.membro);
                    return (
                      <tr key={escala.id}>
                        <td data-label="Membro" className="table-cell-muted">
                          {membro
                            ? membro.first_name || membro.username
                            : "Carregando..."}
                        </td>
                        <td data-label="Função">
                          {membro ? membro.funcao_principal : "-"}
                        </td>
                        <td data-label="Status">
                          <span
                            className={`badge ${escala.status_confirmacao === "CONFIRMADO" ? "badge-primary" : "badge-gray"}`}
                          >
                            {escala.status_confirmacao}
                          </span>
                        </td>
                        <td data-label="Ação">
                          <button
                            onClick={() => handleRemoverEscala(escala.id)}
                            className="lauda-btn lauda-btn-secondary culto-remove-btn"
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
                        className="table-empty"
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
        </div>
      )}

      {/* =========================================
          MODAL DA SETLIST (DRAG AND DROP)
          ========================================= */}
      {isSetlistModalOpen && cultoSelecionado && (
        <div className="modal-overlay">
          <div className="modal culto-setlist-modal">
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
              <p className="text-muted culto-setlist-helper">
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
                  <h4 className="dnd-column-title">Repertório Disponível</h4>

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
                      <button
                        type="button"
                        className="lauda-btn lauda-btn-secondary dnd-touch-btn"
                        onClick={() => adicionarMusicaNaSetlist(musica)}
                      >
                        <Plus size={16} /> Adicionar
                      </button>
                    </div>
                  ))}
                  {repertorioDisponivel.length === 0 && (
                    <p className="text-muted">Nenhuma música disponível.</p>
                  )}
                </div>

                <div
                  className="dnd-column dnd-column-highlight"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropToSetlist}
                >
                  <h4 className="dnd-column-title dnd-column-title-primary">
                    <Music size={18} />
                    Músicas do Culto
                  </h4>

                  {setlistAtual.map((item, index) => {
                    const musica = musicasGlobais.find(
                      (m) => m.id === item.musica,
                    );
                    if (!musica) return null;

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, "setlist")}
                        className="dnd-item dnd-item-setlist"
                      >
                        <div className="setlist-item-top">
                          <div className="setlist-item-main">
                            <div className="dnd-item-title setlist-item-title">
                              <span>
                                {index + 1}. {musica.titulo}
                              </span>

                              {musica.is_active === false && (
                                <span className="setlist-item-warning">
                                  Excluída do Repertório
                                </span>
                              )}
                            </div>
                            <div className="dnd-item-subtitle">{musica.artista}</div>
                          </div>

                          <div className="setlist-item-fields">
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
                              className="setlist-input setlist-input-tone"
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
                              className="setlist-input setlist-input-note"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="lauda-btn lauda-btn-secondary dnd-touch-btn dnd-touch-btn-remove"
                          onClick={() => removerMusicaDaSetlist(item.id)}
                        >
                          <Minus size={16} /> Remover
                        </button>
                      </div>
                    );
                  })}
                  {setlistAtual.length === 0 && (
                    <div className="empty-state">
                      <h3>Setlist vazia</h3>
                      <p>Arraste as músicas para cá ou use o botão adicionar.</p>
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
