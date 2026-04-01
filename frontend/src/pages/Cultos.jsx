import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useLocation, useNavigate } from "react-router-dom";
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
  LayoutGrid,
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api";
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
  const location = useLocation();
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState("grid");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [mobileActionsCultoId, setMobileActionsCultoId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  const urlLimpa = getApiBaseUrl();

  const carregarDados = useCallback(() => {
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

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
      .catch((erro) => console.error("Erro na busca:", erro));
  }, [urlLimpa]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const focusCultoId = location.state?.focusCultoId;
    if (!focusCultoId || cultos.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-culto-id="${focusCultoId}"]`,
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("culto-card-highlight");
        window.setTimeout(
          () => target.classList.remove("culto-card-highlight"),
          2200,
        );
      }
    });

    navigate(location.pathname, { replace: true, state: null });
    return () => window.cancelAnimationFrame(frame);
  }, [cultos, location.pathname, location.state, navigate]);

  const formatarDataBR = (dataString) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const cultosFiltrados = cultos.filter(
    (culto) => filtroStatus === "TODOS" || culto.status === filtroStatus,
  );

  const transformarCultosParaCalendar = useCallback(
    () =>
      cultosFiltrados.map((culto) => ({
        id: String(culto.id),
        title: culto.nome,
        start: `${culto.data}T${(culto.horario_inicio || "00:00:00").slice(0, 8)}`,
        end: `${culto.data}T${(culto.horario_termino || "23:59:00").slice(0, 8)}`,
        backgroundColor:
          culto.status === "AGENDADO"
            ? "var(--interactive-primary)"
            : culto.status === "REALIZADO"
              ? "var(--text-secondary)"
              : "var(--error)",
        borderColor: "transparent",
        textColor: "#fff",
        extendedProps: {
          local: culto.local,
          status: culto.status,
          horario_inicio: culto.horario_inicio?.substring(0, 5) || "--:--",
          horario_termino: culto.horario_termino?.substring(0, 5) || "--:--",
        },
      })),
    [cultosFiltrados],
  );

  const handleChangeCulto = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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
        observacoes: "",
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

  const handleDragLeave = (e) => e.currentTarget.classList.remove("drag-over");

  const handleDropToSetlist = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (draggedItem && draggedItem.source === "repertorio") {
      adicionarMusicaNaSetlist(draggedItem.item);
    }
    setDraggedItem(null);
  };

  const handleDropToRepertorio = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (draggedItem && draggedItem.source === "setlist") {
      removerMusicaDaSetlist(draggedItem.item.id);
    }
    setDraggedItem(null);
  };

  const handleChangeItemSetlistLocal = (itemId, campo, valor) => {
    setItensSetlist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [campo]: valor } : item,
      ),
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
    ? escalas.filter((escala) => escala.culto === cultoSelecionado.id)
    : [];
  const membrosDisponiveis = membros.filter(
    (membro) => !escalasDoCulto.some((escala) => escala.membro === membro.id),
  );
  const setlistAtual = cultoSelecionado
    ? itensSetlist
        .filter((item) => item.culto === cultoSelecionado.id)
        .sort((a, b) => a.ordem - b.ordem)
    : [];
  const repertorioDisponivel = musicasGlobais.filter(
    (musica) =>
      musica.is_active !== false &&
      !setlistAtual.some((item) => item.musica === musica.id),
  );

  return (
    <div className="cultos-page">
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Agenda de Cultos</h2>
          <p className="text-muted">Gerencie eventos, escalas e setlists</p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary agenda-new-btn"
          onClick={handleNovoCulto}
        >
          <Plus size={18} /> Novo Culto
        </button>
      </div>

      <div className="view-controls">
        <div className="view-toggle" role="tablist">
          <button
            type="button"
            className={`lauda-btn agenda-view-btn ${viewMode === "grid" ? "lauda-btn-primary" : "lauda-btn-secondary"}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={18} /> Grid
          </button>
          <button
            type="button"
            className={`lauda-btn agenda-view-btn ${viewMode === "calendar" ? "lauda-btn-primary" : "lauda-btn-secondary"}`}
            onClick={() => setViewMode("calendar")}
          >
            <Calendar size={18} /> Calendário
          </button>
        </div>

        <div className="filtro-status">
          <label className="input-label" style={{ fontSize: "0.85rem" }}>
            Exibição de Status
          </label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-field agenda-status-filter"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="AGENDADO">Agendados</option>
            <option value="REALIZADO">Realizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="cultos-grid">
          {cultosFiltrados.map((culto) => (
            <div
              key={culto.id}
              className="lauda-card culto-card"
              data-culto-id={culto.id}
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

              <div className="culto-actions-panel">
                <div className="culto-actions-row">
                  <button
                    className="lauda-btn lauda-btn-primary culto-action-btn"
                    onClick={() => abrirModalSetlist(culto)}
                  >
                    <Music size={16} /> Setlist
                  </button>
                  {!isMobile && (
                    <button
                      className="lauda-btn lauda-btn-secondary culto-action-btn"
                      onClick={() => abrirModalEscala(culto)}
                    >
                      <Users size={16} /> Escala
                    </button>
                  )}
                </div>

                {isMobile ? (
                  <details
                    className="culto-actions-disclosure"
                    open={mobileActionsCultoId === culto.id}
                    onToggle={(e) =>
                      setMobileActionsCultoId(
                        e.currentTarget.open ? culto.id : null,
                      )
                    }
                  >
                    <summary className="culto-actions-summary">
                      Opções avançadas
                    </summary>
                    <div className="culto-actions-row culto-actions-row-secondary">
                      <button
                        className="lauda-btn lauda-btn-secondary culto-action-btn"
                        onClick={() => abrirModalEscala(culto)}
                      >
                        <Users size={16} /> Escala
                      </button>
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
                  </details>
                ) : (
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
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="calendar-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: isMobile ? "prev,next" : "prev,next today",
              center: "title",
              right: isMobile
                ? "dayGridMonth"
                : "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={transformarCultosParaCalendar()}
            eventClick={(info) => {
              const culto = cultos.find(
                (item) => String(item.id) === info.event.id,
              );
              if (culto) abrirModalSetlist(culto);
            }}
            eventContent={(eventInfo) => (
              <div className="fc-event-content">
                <span className="fc-event-title">{eventInfo.event.title}</span>
                <span className="fc-event-time">
                  {eventInfo.event.extendedProps.horario_inicio}
                </span>
              </div>
            )}
            locale={ptBrLocale}
            height="auto"
            editable={false}
            droppable={false}
            selectable={false}
            buttonText={{
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
            }}
          />
        </div>
      )}

      {/* MODAL DE NOVO/EDITAR CULTO */}
      {isCultoModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-compact">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCultoId ? "Editar Culto" : "Agendar Novo Culto"}
              </h3>
              <button
                onClick={() => setIsCultoModalOpen(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSalvarCulto}
              className="modal-body form-container"
            >
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-row">
                <div className="form-col form-col-sm">
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
                <div className="form-col form-col-sm">
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

              <div className="form-row">
                <div className="form-col form-col-lg">
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
                <div className="form-col form-col-sm">
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

              <div className="modal-footer" style={{ marginTop: "0.5rem" }}>
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

      {/* MODAL DE ESCALA */}
      {isEscalaModalOpen && cultoSelecionado && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Escala: {cultoSelecionado.nome}</h3>
              <button onClick={fecharModalEscala} className="modal-close">
                ×
              </button>
            </div>

            <div className="modal-body form-container">
              <form onSubmit={handleAdicionarEscala} className="escala-toolbar">
                <div className="form-group escala-toolbar-select">
                  <label className="input-label">
                    Adicionar Membro na Equipe
                  </label>
                  <select
                    value={novoMembroId}
                    onChange={(e) => setNovoMembroId(e.target.value)}
                    required
                    className="input-field"
                  >
                    <option value="">
                      Selecione um membro para escalar...
                    </option>
                    {membrosDisponiveis.map((membro) => (
                      <option key={membro.id} value={membro.id}>
                        {membro.first_name || membro.username} -{" "}
                        {membro.funcao_principal}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="lauda-btn lauda-btn-primary"
                  style={{ height: "42px" }}
                >
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
                      const membro = membros.find(
                        (item) => item.id === escala.membro,
                      );
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
                        <td colSpan="4" className="table-empty">
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

      {/* MODAL DE SETLIST */}
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
                culto (direita).
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
                        {musica.artista} • Tom original: {musica.tom_original}
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
                    <Music size={18} /> Músicas do Culto
                  </h4>
                  {setlistAtual.map((item, index) => {
                    const musica = musicasGlobais.find(
                      (song) => song.id === item.musica,
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
                            <div className="dnd-item-subtitle">
                              {musica.artista}
                            </div>
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
                              className="setlist-input setlist-input-tone input-field"
                              title="Tom de Execução"
                              placeholder="Tom"
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
                              placeholder="Obs: Ex: Acústico"
                              className="setlist-input setlist-input-note input-field"
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
                      <p>
                        Arraste as músicas para cá ou use o botão adicionar.
                      </p>
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
