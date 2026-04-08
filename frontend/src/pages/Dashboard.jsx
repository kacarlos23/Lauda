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
    cultos: 0,
    minhasEscalas: 0,
  });
  const [proximosCultos, setProximosCultos] = useState([]);
  const [calendarTooltip, setCalendarTooltip] = useState(null);
  const [selectedCulto, setSelectedCulto] = useState(null);
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
        const [musicasResult, membrosResult, cultosResult] =
          await Promise.allSettled([
            authFetch("/api/musicas/", token),
            canReadMembers
              ? authFetch("/api/usuarios/", token)
              : Promise.resolve([]),
            authFetch("/api/cultos/", token),
          ]);

        const failedAuthRequest = [
          musicasResult,
          membrosResult,
          cultosResult,
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

        const failedRequests = [
          ["musicas", musicasResult],
          ["usuarios", membrosResult],
          ["cultos", cultosResult],
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
          cultos: cultos.length || 0,
          minhasEscalas: 0,
        });

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const futuros = cultos
          .filter((culto) => new Date(culto.data) >= hoje)
          .sort((a, b) => new Date(a.data) - new Date(b.data));

        setProximosCultos(futuros.slice(0, 5));
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

  const eventosCultos = proximosCultos.map((culto) => ({
    id: String(culto.id),
    title: culto.nome,
    start: culto.data,
    allDay: true,
    backgroundColor:
      culto.status === "AGENDADO"
        ? "var(--interactive-primary)"
        : culto.status === "REALIZADO"
          ? "var(--text-secondary)"
          : "var(--error)",
    borderColor: "transparent",
    textColor: "#fff",
    classNames:
      proximosCultos[0]?.id === culto.id ? ["dashboard-next-event"] : [],
    extendedProps: {
      status: culto.status,
      local: culto.local,
      data: culto.data,
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
          <h3>{stats.cultos}</h3>
          <p>Próximos Cultos</p>
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
          <Calendar size={24} aria-hidden="true" /> Agenda de Cultos
        </h2>
        <div className="lauda-card dashboard-calendar-card">
          {proximosCultos.length > 0 ? (
            <>
              <div className="dashboard-calendar-highlight">
                <span className="badge badge-primary">Próximo culto</span>
                <strong>{proximosCultos[0]?.nome}</strong>
                <span>
                  {new Date(proximosCultos[0]?.data).toLocaleDateString(
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
                events={eventosCultos}
                buttonText={{ today: "Hoje" }}
                eventClick={(info) => {
                  const culto = proximosCultos.find(
                    (item) => String(item.id) === info.event.id,
                  );
                  if (culto) {
                    setSelectedCulto(culto);
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
              <h3>Nenhum culto agendado</h3>
              <p>Cadastre um novo culto para começar a montar sua agenda.</p>
            </div>
          )}
        </div>
      </section>

      {selectedCulto && (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal modal-compact dashboard-culto-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-culto-modal-title"
          >
            <div className="modal-header">
              <h3 id="dashboard-culto-modal-title" className="modal-title">
                {selectedCulto.nome}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCulto(null)}
                className="modal-close"
                aria-label="Fechar detalhes do culto"
              >
                ×
              </button>
            </div>

            <div className="modal-body dashboard-culto-modal-body">
              <div className="dashboard-culto-modal-row">
                <span className="badge badge-primary">
                  {selectedCulto.status}
                </span>
                <span className="dashboard-culto-modal-date">
                  {dashboardDateFormatter.format(new Date(selectedCulto.data))}
                </span>
              </div>
              <div className="dashboard-culto-modal-grid">
                <div>
                  <strong>Local</strong>
                  <span>{selectedCulto.local || "Não informado"}</span>
                </div>
                <div>
                  <strong>Início</strong>
                  <span>
                    {selectedCulto.horario_inicio?.substring(0, 5) || "--:--"}
                  </span>
                </div>
                <div>
                  <strong>Término</strong>
                  <span>
                    {selectedCulto.horario_termino?.substring(0, 5) || "--:--"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary"
                onClick={() => setSelectedCulto(null)}
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
