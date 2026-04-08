import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../lib/api";
import "./Dashboard.css";

const dashboardDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const [stats, setStats] = useState({
    musicas: 0,
    membros: 0,
    eventos: 0,
    minhasEscalas: 0,
  });
  const [proximosEventos, setProximosEventos] = useState([]);
  const [calendarTooltip, setCalendarTooltip] = useState(null);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardNotice, setDashboardNotice] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setDashboardNotice("");
        const canReadMembers = Boolean(user?.is_global_admin);
        const [musicasResult, membrosResult, cultosResult, eventosResult] =
          await Promise.allSettled([
            authFetch("/api/musicas/", token),
            canReadMembers
              ? authFetch("/api/usuarios/", token)
              : Promise.resolve([]),
            authFetch("/api/cultos/", token),
            authFetch("/api/eventos/", token),
          ]);

        const failedAuthRequest = [
          musicasResult,
          membrosResult,
          cultosResult,
          eventosResult,
        ].find(
          (result) =>
            result.status === "rejected" && result.reason?.status === 401,
        );
        if (failedAuthRequest) {
          logout();
          return;
        }

        const musicas =
          musicasResult.status === "fulfilled" ? musicasResult.value : [];
        const membros =
          membrosResult.status === "fulfilled" ? membrosResult.value : [];
        const cultos =
          cultosResult.status === "fulfilled" ? cultosResult.value : [];
        const eventos =
          eventosResult.status === "fulfilled" ? eventosResult.value : [];

        const failedRequests = [
          ["musicas", musicasResult],
          ["usuarios", membrosResult],
          ["cultos", cultosResult],
          ["eventos", eventosResult],
        ].filter(([, result]) => result.status === "rejected");

        failedRequests.forEach(([resource, result]) => {
          console.error(
            `Erro ao carregar ${resource} do dashboard:`,
            result.reason,
          );
        });

        if (!isMounted) {
          return;
        }

        if (failedRequests.length > 0) {
          setDashboardNotice(
            "Parte do painel nao foi carregada. Atualize a pagina apos corrigir o backend.",
          );
        }

        setStats({
          musicas: musicas.length || 0,
          membros: membros.length || 0,
          eventos: eventos.length || 0,
          minhasEscalas: 0,
        });

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const futuros = eventos
          .filter((evento) => new Date(evento.data) >= hoje)
          .sort((a, b) => new Date(a.data) - new Date(b.data));

        setProximosEventos(futuros.slice(0, 5));
      } catch (error) {
        if (error.status === 401) {
          logout();
          return;
        }

        console.error("Erro ao carregar dashboard:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [logout, token, user?.is_global_admin]);

  if (loading) {
    return <div className="dashboard-loading">Carregando painel...</div>;
  }

  const eventosAgenda = proximosEventos.map((evento) => ({
    id: String(evento.id),
    title: evento.nome,
    start: evento.data,
    allDay: true,
    backgroundColor:
      evento.status === "AGENDADO"
        ? "var(--interactive-primary)"
        : evento.status === "REALIZADO"
          ? "var(--text-secondary)"
          : "var(--error)",
    borderColor: "transparent",
    textColor: "#fff",
    classNames:
      proximosEventos[0]?.id === evento.id ? ["dashboard-next-event"] : [],
    extendedProps: {
      status: evento.status,
      local: evento.local,
      data: evento.data,
      ministerioNome: evento.ministerio_nome,
      isMusicCulto: evento.is_music_culto,
    },
  }));

  return (
    <div className="stack-lg">
      {dashboardNotice && (
        <div className="status-alert status-alert--error">
          {dashboardNotice}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="lauda-card stat-card">
          <h3>{stats.eventos}</h3>
          <p>Eventos na Agenda</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.musicas}</h3>
          <p>Músicas</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.membros}</h3>
          <p>Membros Ativos</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.minhasEscalas}</h3>
          <p>Minhas Escalas</p>
        </div>
      </div>

      <section className="agenda-section">
        <h2 className="dashboard-title text-primary">
          <Calendar size={24} aria-hidden="true" /> Agenda Institucional
        </h2>
        <div className="lauda-card dashboard-calendar-card">
          {proximosEventos.length > 0 ? (
            <>
              <div className="dashboard-calendar-highlight">
                <span className="badge badge-primary">Próximo evento</span>
                <strong>{proximosEventos[0]?.nome}</strong>
                <span>
                  {new Date(proximosEventos[0]?.data).toLocaleDateString(
                    "pt-BR",
                    {
                      timeZone: "UTC",
                    },
                  )}
                </span>
              </div>

              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "title",
                  center: "",
                  right: "prev,next today",
                }}
                locale={ptBrLocale}
                height="auto"
                contentHeight="auto"
                expandRows={true}
                fixedWeekCount={false}
                dayMaxEventRows={2}
                events={eventosAgenda}
                buttonText={{ today: "Hoje" }}
                eventClick={(info) => {
                  const evento = proximosEventos.find(
                    (item) => String(item.id) === info.event.id,
                  );
                  if (evento) {
                    setSelectedEvento(evento);
                  }
                }}
                eventDidMount={(info) => {
                  info.el.setAttribute(
                    "title",
                    `${info.event.title} • ${info.event.extendedProps.status}`,
                  );
                }}
                eventMouseEnter={(info) => {
                  setCalendarTooltip({
                    title: info.event.title,
                    status: info.event.extendedProps.status,
                    local: info.event.extendedProps.local,
                    x: info.jsEvent.clientX + 14,
                    y: info.jsEvent.clientY + 14,
                  });
                }}
                eventMouseLeave={() => setCalendarTooltip(null)}
              />

              {calendarTooltip && (
                <div
                  className="dashboard-calendar-tooltip"
                  style={{
                    left: `${calendarTooltip.x}px`,
                    top: `${calendarTooltip.y}px`,
                  }}
                >
                  <strong>{calendarTooltip.title}</strong>
                  <span>{calendarTooltip.status}</span>
                  <span>{calendarTooltip.local || "Local não informado"}</span>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h3>Nenhum evento agendado</h3>
              <p>Cadastre um novo evento ou culto para começar a montar sua agenda.</p>
            </div>
          )}
        </div>
      </section>

      {selectedEvento && (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal modal-compact dashboard-culto-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-culto-modal-title"
          >
            <div className="modal-header">
              <h3 id="dashboard-culto-modal-title" className="modal-title">
                {selectedEvento.nome}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEvento(null)}
                className="modal-close"
                aria-label="Fechar detalhes do evento"
              >
                ×
              </button>
            </div>

            <div className="modal-body dashboard-culto-modal-body">
              <div className="dashboard-culto-modal-row">
                <span className="badge badge-primary">
                  {selectedEvento.is_music_culto ? "Culto Musical" : "Evento Base"}
                </span>
                <span className="badge badge-gray">
                  {selectedEvento.status}
                </span>
                <span className="dashboard-culto-modal-date">
                  {dashboardDateFormatter.format(new Date(selectedEvento.data))}
                </span>
              </div>
              <div className="dashboard-culto-modal-grid">
                <div>
                  <strong>Local</strong>
                  <span>{selectedEvento.local || "Não informado"}</span>
                </div>
                <div>
                  <strong>Ministério</strong>
                  <span>{selectedEvento.ministerio_nome || "Agenda da igreja"}</span>
                </div>
                <div>
                  <strong>Início</strong>
                  <span>
                    {selectedEvento.horario_inicio?.substring(0, 5) || "--:--"}
                  </span>
                </div>
                <div>
                  <strong>Término</strong>
                  <span>
                    {selectedEvento.horario_termino?.substring(0, 5) || "--:--"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary"
                onClick={() => setSelectedEvento(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
