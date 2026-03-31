import { useState, useEffect } from "react";
import {
  Activity,
  LayoutList,
  CalendarDays,
  Music,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function Auditoria() {
  // Estados das 4 seções
  const [resumo, setResumo] = useState({
    total_eventos: 0,
    eventos_hoje: 0,
    musicas_alteradas: 0,
    cultos_alterados: 0,
  });
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [filtros, setFiltros] = useState({ acao: "", usuario: "" });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const urlLimpa = baseUrl.replace(/\/$/, "");

  // Carrega Usuários e Resumo (Sessão 1) ao abrir a tela
  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${urlLimpa}/api/usuarios/`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((dados) => setUsuarios(dados));

    fetch(`${urlLimpa}/api/auditoria/resumo/`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((dados) => {
        if (dados) setResumo(dados);
      });
  }, []);

  // Carrega a Trilha Detalhada (Sessão 3 e 4) sempre que página ou filtros mudam
  useEffect(() => {
    carregarTrilha();
  }, [paginaAtual, filtros]);

  const carregarTrilha = () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const query = new URLSearchParams({
      page: paginaAtual,
      acao: filtros.acao,
      usuario: filtros.usuario,
    }).toString();

    fetch(`${urlLimpa}/api/auditoria/?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((dados) => {
        // O DRF manda { count, next, previous, results } por causa da paginação
        setLogs(dados.results || []);
        setTotalPaginas(Math.ceil((dados.count || 0) / 10)); // 10 registros por página
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
    setPaginaAtual(1); // Volta pra página 1 ao filtrar
  };

  const formatarData = (iso) => {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderBadgeAcao = (acao) => {
    if (acao === "CREATE")
      return (
        <span
          className="badge"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            color: "#10b981",
          }}
        >
          CREATE
        </span>
      );
    if (acao === "UPDATE")
      return (
        <span
          className="badge"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            color: "#3b82f6",
          }}
        >
          UPDATE
        </span>
      );
    if (acao === "DELETE")
      return (
        <span
          className="badge"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
          }}
        >
          DELETE
        </span>
      );
    return <span className="badge badge-gray">{acao}</span>;
  };

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2
            className="text-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Activity size={28} /> Auditoria do Sistema
          </h2>
          <p className="text-muted">
            Rastreabilidade completa de todas as alterações
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* =======================================
            SEÇÃO 1: Relatório Geral de Auditoria
            ======================================= */}
        <section>
          <h3
            style={{
              fontSize: "1.1rem",
              marginBottom: "1rem",
              color: "var(--gray-800)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <LayoutList size={18} /> Relatório Geral de Auditoria
          </h3>
          <div className="dashboard-grid" style={{ marginBottom: 0 }}>
            <div className="lauda-card stat-card">
              <h3>{resumo.total_eventos}</h3>
              <p>Total de Eventos</p>
            </div>
            <div className="lauda-card stat-card">
              <h3 style={{ color: "var(--success-dark)" }}>
                {resumo.eventos_hoje}
              </h3>
              <p>Eventos do Dia</p>
            </div>
            <div className="lauda-card stat-card">
              <h3>{resumo.musicas_alteradas}</h3>
              <p>Músicas Alteradas</p>
            </div>
            <div className="lauda-card stat-card">
              <h3>{resumo.cultos_alterados}</h3>
              <p>Cultos Alterados</p>
            </div>
          </div>
        </section>

        {/* =======================================
            SEÇÃO 2: Filtros de Auditoria
            ======================================= */}
        <section className="lauda-card" style={{ padding: "1rem 1.5rem" }}>
          <h3
            style={{
              fontSize: "1.1rem",
              marginBottom: "1rem",
              color: "var(--gray-800)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Filter size={18} /> Filtros de Auditoria
          </h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label className="input-label">Ação</label>
              <select
                name="acao"
                className="input-field"
                value={filtros.acao}
                onChange={handleFiltroChange}
              >
                <option value="">Todas as Ações</option>
                <option value="CREATE">CREATE (Criações)</option>
                <option value="UPDATE">UPDATE (Atualizações)</option>
                <option value="DELETE">DELETE (Exclusões)</option>
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="input-label">Perfil do Usuário</label>
              <select
                name="usuario"
                className="input-field"
                value={filtros.usuario}
                onChange={handleFiltroChange}
              >
                <option value="">Todos os Usuários</option>
                {usuarios.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* =======================================
            SEÇÃO 3 e 4: Trilha Detalhada e Paginação
            ======================================= */}
        <section className="lauda-card">
          <h3
            style={{
              fontSize: "1.1rem",
              marginBottom: "1rem",
              color: "var(--gray-800)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldCheck size={18} /> Trilha Detalhada
          </h3>

          {loading ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--gray-500)",
              }}
            >
              Buscando registros...
            </div>
          ) : (
            <>
              <div className="lauda-table-container">
                <table className="lauda-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: "150px" }}>Data e Hora</th>
                      <th>Ação</th>
                      <th>Descrição do Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td
                          data-label="Data e Hora"
                          style={{ color: "var(--gray-600)", fontWeight: 500 }}
                        >
                          {formatarData(log.data_hora)}
                        </td>
                        <td data-label="Ação">{renderBadgeAcao(log.acao)}</td>
                        <td data-label="Descrição" style={{ color: "var(--gray-800)" }}>
                          {log.descricao}{" "}
                          <span
                            className="text-muted"
                            style={{ fontSize: "0.8rem", marginLeft: "8px" }}
                          >
                            por {log.usuario_nome || "Sistema"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan="3"
                          className="table-empty"
                        >
                          Nenhum registro encontrado para estes filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* SEÇÃO 4: Paginação Navegável */}
              {totalPaginas > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "1rem",
                    marginTop: "1.5rem",
                    borderTop: "1px solid var(--gray-200)",
                    paddingTop: "1rem",
                  }}
                >
                  <button
                    className="lauda-btn lauda-btn-secondary"
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual((p) => p - 1)}
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    <ChevronLeft size={18} /> Anterior
                  </button>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--gray-600)",
                      fontWeight: 500,
                    }}
                  >
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <button
                    className="lauda-btn lauda-btn-secondary"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPaginaAtual((p) => p + 1)}
                    style={{ padding: "0.3rem 0.6rem" }}
                  >
                    Próxima <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
