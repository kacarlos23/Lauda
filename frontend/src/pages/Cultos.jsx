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
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../lib/api";
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
  const { token, user, logout } = useAuth();
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
  const [pageNotice, setPageNotice] = useState("");
  const canManageCultos =
    user?.is_global_admin || Number(user?.nivel_acesso) === 1;

  const carregarDados = useCallback(async () => {
    if (!token) {
      return;
    }

    setPageNotice("");

    const [
      cultosResult,
      membrosResult,
      escalasResult,
      musicasResult,
      setlistsResult,
    ] = await Promise.allSettled([
      authFetch("/api/cultos/", token),
      canManageCultos
        ? authFetch("/api/usuarios/", token)
        : Promise.resolve([]),
      authFetch("/api/escalas/", token),
      authFetch("/api/musicas/", token),
      authFetch("/api/setlists/", token),
    ]);

    const failedAuthRequest = [
      cultosResult,
      membrosResult,
      escalasResult,
      musicasResult,
      setlistsResult,
    ].find(
      (result) => result.status === "rejected" && result.reason?.status === 401,
    );
    if (failedAuthRequest) {
      logout();
      return;
    }

    const failedRequests = [
      ["cultos", cultosResult],
      ["usuarios", membrosResult],
      ["escalas", escalasResult],
      ["musicas", musicasResult],
      ["setlists", setlistsResult],
    ].filter(([, result]) => result.status === "rejected");

    failedRequests.forEach(([resource, result]) => {
      console.error(
        `Erro ao carregar ${resource} na agenda de cultos:`,
        result.reason,
      );
    });

    setCultos(cultosResult.status === "fulfilled" ? cultosResult.value : []);
    setMembros(membrosResult.status === "fulfilled" ? membrosResult.value : []);
    setEscalas(escalasResult.status === "fulfilled" ? escalasResult.value : []);
    setMusicasGlobais(
      musicasResult.status === "fulfilled" ? musicasResult.value : [],
    );
    setItensSetlist(
      setlistsResult.status === "fulfilled" ? setlistsResult.value : [],
    );

    if (failedRequests.length > 0) {
      setPageNotice(
        "Parte da agenda nao foi carregada. Verifique os endpoints com erro.",
      );
    }
  }, [canManageCultos, logout, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      carregarDados();
    }, 0);

    return () => window.clearTimeout(timer);
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
    if (!canManageCultos) {
      return;
    }

    setFormData(ESTADO_INICIAL_CULTO);
    setEditingCultoId(null);
    setIsCultoModalOpen(true);
  };

  const handleEditarCulto = (culto) => {
    if (!canManageCultos) {
      return;
    }

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

  const formatApiError = (error) => {
    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message;
    }

    const data = error?.data;
    if (data && typeof data === "object") {
      return Object.entries(data)
        .map(
          ([field, value]) =>
            `${field}: ${Array.isArray(value) ? value.join(", ") : value}`,
        )
        .join(" | ");
    }

    return "Erro ao salvar o culto. Verifique os dados.";
  };

  const sanitizeCultoPayload = (payload) => ({
    ...payload,
    horario_termino: payload.horario_termino || null,
    local: payload.local?.trim() || null,
  });

  const handleSalvarCulto = (e) => {
    e.preventDefault();
    if (!canManageCultos) {
      return;
    }

    const url = editingCultoId
      ? `/api/cultos/${editingCultoId}/`
      : "/api/cultos/";
    const method = editingCultoId ? "PUT" : "POST";
    const dadosEnvio = sanitizeCultoPayload(formData);

    authFetch(url, token, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEnvio),
    })
      .then(() => {
        setIsCultoModalOpen(false);
        carregarDados();
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
          return;
        }

        alert(formatApiError(error));
      });
  };

  const handleExcluirCulto = (id) => {
    if (!canManageCultos) {
      return;
    }

    if (
      !window.confirm(
        "Certeza que deseja excluir este culto? Escalas e setlists serão perdidas!",
      )
    )
      return;
    authFetch(`/api/cultos/${id}/`, token, {
      method: "DELETE",
    })
      .then(() => {
        carregarDados();
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
        }
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
    if (!canManageCultos) {
      return;
    }

    if (!novoMembroId || !cultoSelecionado) return;
    authFetch("/api/escalas/", token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        culto: cultoSelecionado.id,
        membro: novoMembroId,
        status_confirmacao: "PENDENTE",
      }),
    })
      .then(() => {
        carregarDados();
        setNovoMembroId("");
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
        }
      });
  };

  const handleRemoverEscala = (escalaId) => {
    if (!canManageCultos) {
      return;
    }

    authFetch(`/api/escalas/${escalaId}/`, token, {
      method: "DELETE",
    })
      .then(() => {
        carregarDados();
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
        }
      });
  };

  const abrirModalSetlist = (culto) => {
    setCultoSelecionado(culto);
    setIsSetlistModalOpen(true);
  };

  const adicionarMusicaNaSetlist = (musica) => {
    if (!canManageCultos) {
      return;
    }

    if (!cultoSelecionado) return;
    authFetch("/api/setlists/", token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        culto: cultoSelecionado.id,
        musica: musica.id,
        ordem: setlistAtual.length + 1,
        tom_execucao: musica.tom_original,
        observacoes: "",
      }),
    })
      .then(() => {
        carregarDados();
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
        }
      });
  };

  const removerMusicaDaSetlist = (itemId) => {
    if (!canManageCultos) {
      return;
    }

    authFetch(`/api/setlists/${itemId}/`, token, {
      method: "DELETE",
    })
      .then(() => {
        carregarDados();
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
        }
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
    if (!canManageCultos) {
      return;
    }

    e.currentTarget.classList.remove("drag-over");
    if (draggedItem && draggedItem.source === "repertorio") {
      adicionarMusicaNaSetlist(draggedItem.item);
    }
    setDraggedItem(null);
  };

  const handleDropToRepertorio = (e) => {
    e.preventDefault();
    if (!canManageCultos) {
      return;
    }

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
    if (!itemId || !canManageCultos) return;

    authFetch(`/api/setlists/${itemId}/`, token, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ [campo]: valor }),
    }).catch((err) => {
      if (err.status === 401) {
        logout();
        return;
      }

      console.error("Erro ao atualizar setlist:", err);
    });
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
      {pageNotice && (
        <div className="status-alert status-alert--error">{pageNotice}</div>
      )}

      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Agenda de Cultos</h2>
          <p className="text-muted">Gerencie eventos, escalas e setlists</p>
        </div>
        {canManageCultos && (
          <button
            className="lauda-btn lauda-btn-primary agenda-new-btn"
            onClick={handleNovoCulto}
          >
            <Plus size={18} /> Novo Culto
          </button>
        )}
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
                    <MapPin size={16} /> <strong>Local:</strong>{" "}
                    {culto.local || "Nao informado"}
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
                  {canManageCultos && !isMobile && (
                    <button
                      className="lauda-btn lauda-btn-secondary culto-action-btn"
                      onClick={() => abrirModalEscala(culto)}
                    >
                      <Users size={16} /> Escala
                    </button>
                  )}
                </div>

                {isMobile ? (
                  canManageCultos ? (
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
                        {canManageCultos && (
                          <>
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
                          </>
                        )}
                      </div>
                    </details>
                  ) : null
                ) : (
                  <div className="culto-actions-row">
                    {canManageCultos && (
                      <>
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
                      </>
                    )}
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
              left: "title",
              center: "",
              right: "prev,next today",
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
            contentHeight="auto"
            expandRows={true}
            fixedWeekCount={false}
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
                  <label className="input-label">Término</label>
                  <input
                    type="time"
                    name="horario_termino"
                    className="input-field"
                    value={formData.horario_termino}
                    onChange={handleChangeCulto}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-col form-col-lg">
                  <label className="input-label">Local</label>
                  <input
                    type="text"
                    name="local"
                    className="input-field"
                    value={formData.local}
                    onChange={handleChangeCulto}
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
                {canManageCultos && (
                  <button type="submit" className="lauda-btn lauda-btn-primary">
                    Salvar
                  </button>
                )}
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
              {canManageCultos && (
                <form
                  onSubmit={handleAdicionarEscala}
                  className="escala-toolbar"
                >
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
              )}

              <div className="lauda-table-container">
                <table className="lauda-table">
                  <thead>
                    <tr>
                      <th>Membro</th>
                      <th>Função</th>
                      <th>Status</th>
                      {canManageCultos && <th>Ação</th>}
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
                          {canManageCultos && (
                            <td data-label="Ação">
                              <button
                                onClick={() => handleRemoverEscala(escala.id)}
                                className="lauda-btn lauda-btn-secondary culto-remove-btn"
                              >
                                Remover
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {escalasDoCulto.length === 0 && (
                      <tr>
                        <td
                          colSpan={canManageCultos ? 4 : 3}
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
                {canManageCultos
                  ? "Arraste as músicas do repertório (esquerda) para a setlist do culto (direita)."
                  : "Visualização apenas leitura da setlist do culto."}
              </p>

              <div className="dnd-container">
                {canManageCultos && (
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
                )}

                <div
                  className="dnd-column dnd-column-highlight"
                  onDragOver={canManageCultos ? handleDragOver : undefined}
                  onDragLeave={canManageCultos ? handleDragLeave : undefined}
                  onDrop={canManageCultos ? handleDropToSetlist : undefined}
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
                        draggable={canManageCultos}
                        onDragStart={
                          canManageCultos
                            ? (e) => handleDragStart(e, item, "setlist")
                            : undefined
                        }
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
                              onBlur={
                                canManageCultos
                                  ? (e) =>
                                      handleAtualizarItemSetlistBanco(
                                        item.id,
                                        "tom_execucao",
                                        e.target.value,
                                      )
                                  : undefined
                              }
                              className="setlist-input setlist-input-tone input-field"
                              title="Tom de Execução"
                              placeholder="Tom"
                              disabled={!canManageCultos}
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
                              onBlur={
                                canManageCultos
                                  ? (e) =>
                                      handleAtualizarItemSetlistBanco(
                                        item.id,
                                        "observacoes",
                                        e.target.value,
                                      )
                                  : undefined
                              }
                              placeholder="Obs: Ex: Acústico"
                              className="setlist-input setlist-input-note input-field"
                              disabled={!canManageCultos}
                            />
                          </div>
                        </div>
                        {canManageCultos && (
                          <button
                            type="button"
                            className="lauda-btn lauda-btn-secondary dnd-touch-btn dnd-touch-btn-remove"
                            onClick={() => removerMusicaDaSetlist(item.id)}
                          >
                            <Minus size={16} /> Remover
                          </button>
                        )}
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
