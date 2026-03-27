import { useState, useEffect } from "react";
import { Shield, Clock, Monitor } from "lucide-react";

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const urlLimpa = baseUrl.replace(/\/$/, "");

    fetch(`${urlLimpa}/api/auditoria/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Acesso negado ou erro na busca");
        return res.json();
      })
      .then((dados) => {
        setLogs(dados);
        setLoading(false);
      })
      .catch((erro) => {
        console.error("Erro ao buscar auditoria:", erro);
        setLoading(false);
      });
  }, []);

  const formatarDataHora = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2
            className="text-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Shield size={28} /> Trilha de Auditoria
          </h2>
          <p className="text-muted">Registro de acessos e logins no sistema</p>
        </div>
      </div>

      <div className="lauda-card">
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--gray-500)",
            }}
          >
            Carregando registros...
          </div>
        ) : (
          <div className="lauda-table-container">
            <table className="lauda-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>IP de Origem</th>
                  <th>Data e Hora do Acesso</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: "500", color: "var(--gray-900)" }}>
                      {log.first_name
                        ? `${log.first_name} (${log.usuario_nome})`
                        : log.usuario_nome}
                    </td>
                    <td style={{ color: "var(--gray-600)" }}>
                      <Monitor
                        size={14}
                        style={{ marginRight: "4px", verticalAlign: "middle" }}
                      />
                      {log.ip_address || "Desconhecido"}
                    </td>
                    <td style={{ color: "var(--gray-600)" }}>
                      <Clock
                        size={14}
                        style={{ marginRight: "4px", verticalAlign: "middle" }}
                      />
                      {formatarDataHora(log.data_hora)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--gray-500)",
                      }}
                    >
                      Nenhum registro de login encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
