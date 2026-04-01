import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutList,
  ShieldCheck,
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api";
import "./Auditoria.css";

export default function Auditoria() {
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

  const urlLimpa = getApiBaseUrl();

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
  }, [urlLimpa]);

  const carregarTrilha = useCallback(() => {
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
        setLogs(dados.results || []);
        setTotalPaginas(Math.ceil((dados.count || 0) / 10));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filtros.acao, filtros.usuario, paginaAtual, urlLimpa]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregarTrilha();
  }, [carregarTrilha]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
    setPaginaAtual(1);
  };

  const formatarData = (iso) =>
    new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderBadgeAcao = (acao) => {
    if (acao === "CREATE") {
      return <span className="badge badge-create">CREATE</span>;
    }

    if (acao === "UPDATE") {
      return <span className="badge badge-update">UPDATE</span>;
    }

    if (acao === "DELETE") {
      return <span className="badge badge-delete">DELETE</span>;
    }

    return <span className="badge badge-gray">{acao}</span>;
  };

  return (
    <div className="auditoria-page">
      <div className="lauda-page-header">
        <div className="page-title-group">
          <h2 className="text-primary auditoria-page-title">
            <Activity size={28} /> Auditoria do Sistema
          </h2>
          <p className="text-muted">
            Rastreabilidade completa de todas as alterações
          </p>
        </div>
      </div>

      <section>
        <h3 className="section-title">
          <LayoutList size={18} /> Relatório Geral de Auditoria
        </h3>
        <div className="dashboard-grid auditoria-grid-compact">
          <div className="lauda-card stat-card">
            <h3>{resumo.total_eventos}</h3>
            <p>Total de Eventos</p>
          </div>
          <div className="lauda-card stat-card">
            <h3 className="auditoria-stat-highlight">{resumo.eventos_hoje}</h3>
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

      <section className="lauda-card auditoria-filters-card">
        <h3 className="section-title">
          <Filter size={18} /> Filtros de Auditoria
        </h3>

        <div className="auditoria-filters-row">
          <div className="auditoria-filter-item">
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

          <div className="auditoria-filter-item">
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

      <section className="lauda-card">
        <h3 className="section-title">
          <ShieldCheck size={18} /> Trilha Detalhada
        </h3>

        {loading ? (
          <div className="auditoria-loading">Buscando registros...</div>
        ) : (
          <>
            <div className="lauda-table-container">
              <table className="lauda-table">
                <thead>
                  <tr>
                    <th className="auditoria-date-col">Data e Hora</th>
                    <th>Ação</th>
                    <th>Descrição do Evento</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td data-label="Data e Hora" className="auditoria-date-cell">
                        {formatarData(log.data_hora)}
                      </td>
                      <td data-label="Ação">{renderBadgeAcao(log.acao)}</td>
                      <td
                        data-label="Descrição"
                        className="auditoria-description-cell"
                      >
                        {log.descricao}
                        <span className="text-muted auditoria-log-meta">
                          por {log.usuario_nome || "Sistema"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="3" className="table-empty">
                        Nenhum registro encontrado para estes filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="auditoria-pagination">
                <button
                  className="lauda-btn lauda-btn-secondary auditoria-pagination-btn"
                  disabled={paginaAtual === 1}
                  onClick={() => setPaginaAtual((p) => p - 1)}
                >
                  <ChevronLeft size={18} /> Anterior
                </button>

                <span className="auditoria-pagination-text">
                  Página {paginaAtual} de {totalPaginas}
                </span>

                <button
                  className="lauda-btn lauda-btn-secondary auditoria-pagination-btn"
                  disabled={paginaAtual === totalPaginas}
                  onClick={() => setPaginaAtual((p) => p + 1)}
                >
                  Próxima <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
