﻿import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { useRef } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
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
import { usePermissions } from "../hooks/usePermissions";
import { authFetch } from "../lib/api";
import EscalaModal from "../components/EscalaModal";
import "./Cultos.css";

const ESTADO_INICIAL_CULTO = {
  nome: "",
  data: "",
  horario_inicio: "",
  horario_termino: "",
  local: "",
  status: "AGENDADO",
};

const CALENDAR_WEEKDAY_LABELS = [
  "dom.",
  "seg.",
  "ter.",
  "qua.",
  "qui.",
  "sex.",
  "sab.",
];

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const selectedDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthLabel = (date) => {
  const baseLabel = monthLabelFormatter.format(date);
  return baseLabel.charAt(0).toUpperCase() + baseLabel.slice(1);
};

const formatSelectedDateLabel = (dateKey) => {
  if (!dateKey) {
    return "";
  }

  const label = selectedDateFormatter.format(new Date(`${dateKey}T00:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getRelativeDateLabel = (dateKey) => {
  if (!dateKey) {
    return "";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateKey}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  const diffInDays = Math.round((target - today) / 86400000);

  if (diffInDays === 0) {
    return "Hoje";
  }

  if (diffInDays === 1) {
    return "Amanha";
  }

  if (diffInDays === -1) {
    return "Ontem";
  }

  return diffInDays > 1 ? `Em ${diffInDays} dias` : `${Math.abs(diffInDays)} dias atras`;
};

export default function Cultos() {
  const { token, user, logout } = useAuth();
  const permissions = usePermissions(user);
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
  const [isCultoModalOpen, setIsCultoModalOpen] = useState(false);
  const [editingCultoId, setEditingCultoId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL_CULTO);
  const [viewMode, setViewMode] = useState("grid");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [mobileActionsCultoId, setMobileActionsCultoId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [pageNotice, setPageNotice] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const calendarRef = useRef(null);

  const canManageCultos = permissions.canManageCultos;
  const canManageEscalas = permissions.canManageEscalas;
  const canManageSetlists = permissions.canManageSetlists;
  const canManageAnyMusicOperation =
    canManageCultos || canManageEscalas || canManageSetlists;

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
      canManageEscalas
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
  }, [canManageEscalas, logout, token]);

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

  const cultosFiltradosOrdenados = [...cultosFiltrados].sort((a, b) => {
    const dateA = `${a.data || ""}T${a.horario_inicio || "00:00:00"}`;
    const dateB = `${b.data || ""}T${b.horario_inicio || "00:00:00"}`;
    return new Date(dateA) - new Date(dateB);
  });

  const cultosPorData = cultosFiltradosOrdenados.reduce((acc, culto) => {
    if (!culto.data) {
      return acc;
    }

    if (!acc[culto.data]) {
      acc[culto.data] = [];
    }

    acc[culto.data].push(culto);
    return acc;
  }, {});

  const cultosSelecionados = selectedDateKey
    ? cultosPorData[selectedDateKey] || []
    : [];
  const hasSelectedDate = Boolean(selectedDateKey);

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

        setPageNotice(formatApiError(error));
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
          return;
        }

        setPageNotice("Nao foi possivel excluir o culto selecionado.");
      });
  };

  const abrirModalEscala = (culto) => {
    setCultoSelecionado(culto);
    setIsEscalaModalOpen(true);
  };

  const fecharModalEscala = () => {
    setIsEscalaModalOpen(false);
    setCultoSelecionado(null);
  };

  const handleAdicionarEscala = (membroId) => {
    if (!canManageEscalas || !membroId || !cultoSelecionado) return;

    authFetch("/api/escalas/", token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        culto: cultoSelecionado.id,
        membro: membroId,
        status_confirmacao: "PENDENTE",
      }),
    })
      .then(() => {
        carregarDados();
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
          return;
        }

        setPageNotice("Nao foi possivel adicionar o membro na escala.");
      });
  };

  const handleRemoverEscala = (escalaId) => {
    if (!canManageEscalas) {
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
          return;
        }

        setPageNotice("Nao foi possivel remover o membro da escala.");
      });
  };

  const abrirModalSetlist = (culto) => {
    setCultoSelecionado(culto);
    setIsSetlistModalOpen(true);
  };

  const adicionarMusicaNaSetlist = (musica) => {
    if (!canManageSetlists) {
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
          return;
        }

        setPageNotice("Nao foi possivel adicionar a musica na setlist.");
      });
  };

  const removerMusicaDaSetlist = (itemId) => {
    if (!canManageSetlists) {
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
          return;
        }

        setPageNotice("Nao foi possivel remover a musica da setlist.");
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
    if (!canManageSetlists) {
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
    if (!canManageSetlists) {
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
    if (!itemId || !canManageSetlists) return;

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
      setPageNotice("Nao foi possivel atualizar o item da setlist.");
    });
  };

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

  const handleCalendarNavigate = (direction) => {
    const api = calendarRef.current?.getApi();
    if (!api) {
      return;
    }

    if (direction === "prev") {
      api.prev();
      return;
    }

    if (direction === "next") {
      api.next();
      return;
    }

    api.today();
  };

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
                  {canManageEscalas && !isMobile && (
                    <button
                      className="lauda-btn lauda-btn-secondary culto-action-btn"
                      onClick={() => abrirModalEscala(culto)}
                    >
                      <Users size={16} /> Escala
                    </button>
                  )}
                </div>

                {isMobile ? (
                  canManageAnyMusicOperation ? (
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
                        {canManageAnyMusicOperation && (
                          <>
                            {canManageEscalas && (
                              <button
                                className="lauda-btn lauda-btn-secondary culto-action-btn"
                                onClick={() => abrirModalEscala(culto)}
                              >
                                <Users size={16} /> Escala
                              </button>
                            )}
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
          <div className="calendar-shell">
            <div className="calendar-shell__header">
              <div className="calendar-shell__heading">
                <span className="calendar-shell__eyebrow">Agenda de cultos</span>
                <strong>{calendarTitle || formatMonthLabel(new Date())}</strong>
              </div>

              <button
                type="button"
                className="lauda-btn lauda-btn-secondary calendar-shell__today-btn"
                onClick={() => handleCalendarNavigate("today")}
              >
                Hoje
              </button>

              <div className="calendar-shell__actions">
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary calendar-shell__nav-btn"
                  onClick={() => handleCalendarNavigate("prev")}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft
                    className="calendar-shell__nav-icon"
                    size={18}
                    strokeWidth={2.35}
                    absoluteStrokeWidth
                    aria-hidden="true"
                    focusable="false"
                  />
                </button>
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary calendar-shell__nav-btn"
                  onClick={() => handleCalendarNavigate("next")}
                  aria-label="Proximo mes"
                >
                  <ChevronRight
                    className="calendar-shell__nav-icon"
                    size={18}
                    strokeWidth={2.35}
                    absoluteStrokeWidth
                    aria-hidden="true"
                    focusable="false"
                  />
                </button>
              </div>
            </div>

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              events={transformarCultosParaCalendar()}
              eventClick={(info) => {
                const culto = cultos.find(
                  (item) => String(item.id) === info.event.id,
                );
                if (culto) abrirModalSetlist(culto);
              }}
              eventContent={() => <span className="cultos-calendar-dot" aria-hidden="true" />}
              eventClassNames={(arg) => [
                "cultos-calendar-event",
                `cultos-calendar-event--${String(
                  arg.event.extendedProps.status || "AGENDADO",
                ).toLowerCase()}`,
              ]}
              dayHeaderContent={(arg) => CALENDAR_WEEKDAY_LABELS[arg.date.getDay()]}
              dayCellClassNames={(arg) => {
                const dateKey = getDateKey(arg.date);
                return [
                  "cultos-calendar-day",
                  selectedDateKey === dateKey ? "cultos-calendar-day--selected" : "",
                  arg.isToday ? "cultos-calendar-day--today" : "",
                ];
              }}
              dateClick={(info) => setSelectedDateKey(info.dateStr)}
              datesSet={(info) => setCalendarTitle(formatMonthLabel(info.view.currentStart))}
              locale={ptBrLocale}
              height="auto"
              contentHeight="auto"
              expandRows={true}
              fixedWeekCount={false}
              editable={false}
              droppable={false}
              selectable={false}
              dayMaxEventRows={4}
              eventOrder="start"
            />
          </div>

          {hasSelectedDate ? (
            <div className="calendar-agenda">
              <div className="calendar-agenda__header">
                <h3>{formatSelectedDateLabel(selectedDateKey)}</h3>
                <span>{getRelativeDateLabel(selectedDateKey)}</span>
              </div>

              {cultosSelecionados.length > 0 ? (
                <div className="calendar-agenda__list">
                  {cultosSelecionados.map((culto) => (
                    <article key={culto.id} className="calendar-agenda__item">
                      <div className="calendar-agenda__item-main">
                        <strong>{culto.nome}</strong>
                        <span>
                          <Clock3 size={15} aria-hidden="true" />
                          {culto.horario_inicio?.substring(0, 5) || "--:--"}
                          {culto.horario_termino
                            ? ` - ${culto.horario_termino.substring(0, 5)}`
                            : ""}
                        </span>
                        <span>
                          <MapPin size={15} aria-hidden="true" />
                          {culto.local || "Local a confirmar"}
                        </span>
                      </div>

                      <div className="calendar-agenda__item-meta">
                        <span
                          className={`badge ${
                            culto.status === "AGENDADO" ? "badge-primary" : "badge-gray"
                          }`}
                        >
                          {culto.status}
                        </span>

                        <div className="calendar-agenda__item-actions">
                          <button
                            type="button"
                            className="lauda-btn lauda-btn-primary culto-action-btn"
                            onClick={() => abrirModalSetlist(culto)}
                          >
                            <Music size={16} /> Setlist
                          </button>
                          {canManageEscalas ? (
                            <button
                              type="button"
                              className="lauda-btn lauda-btn-secondary culto-action-btn"
                              onClick={() => abrirModalEscala(culto)}
                            >
                              <Users size={16} /> Escala
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="calendar-agenda__empty-notice" role="status">
                  <div className="calendar-agenda__empty-illustration" aria-hidden="true" />
                  <strong>Lista vazia.</strong>
                  <p>Nenhum culto cadastrado para o dia selecionado.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="calendar-agenda calendar-agenda--idle" aria-hidden="true" />
          )}
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
        <EscalaModal
          culto={cultoSelecionado}
          membros={membros}
          escalas={escalas}
          canManageEscalas={canManageEscalas}
          onClose={fecharModalEscala}
          onAddEscala={handleAdicionarEscala}
          onRemoveEscala={handleRemoverEscala}
        />
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
                {canManageSetlists
                  ? "Arraste as músicas do repertório (esquerda) para a setlist do culto (direita)."
                  : "Visualização apenas leitura da setlist do culto."}
              </p>

              <div className="dnd-container">
                {canManageSetlists && (
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
                  onDragOver={canManageSetlists ? handleDragOver : undefined}
                  onDragLeave={canManageSetlists ? handleDragLeave : undefined}
                  onDrop={canManageSetlists ? handleDropToSetlist : undefined}
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
                        draggable={canManageSetlists}
                        onDragStart={
                          canManageSetlists
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
                                canManageSetlists
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
                              disabled={!canManageSetlists}
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
                                canManageSetlists
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
                              disabled={!canManageSetlists}
                            />
                          </div>
                        </div>
                        {canManageSetlists && (
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
