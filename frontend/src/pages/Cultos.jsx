import { useState, useEffect } from "react";
import "./Cultos.css";

export default function Cultos() {
  const [cultos, setCultos] = useState([]);

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const urlLimpa = baseUrl.replace(/\/$/, "");

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${urlLimpa}/api/cultos/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/";
          throw new Error("Sessao expirada");
        }
        return res.json();
      })
      .then((dados) => setCultos(dados))
      .catch((erro) => console.error("Erro na busca:", erro));
  }, []);

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Agenda de Cultos</h2>
          <p className="text-muted">Gerencie os eventos e escalas</p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={() => alert("Abriremos o formulario de Culto na proxima etapa!")}
        >
          + Novo Culto
        </button>
      </div>

      <div className="cultos-grid">
        {cultos.map((culto) => (
          <div key={culto.id} className="lauda-card">
            <div className="culto-info">
              <h3>{culto.nome}</h3>
              <p className="culto-data">
                Data: {culto.data} as {culto.horario_inicio}
              </p>
            </div>
            <div className="culto-meta text-muted">
              <span>
                <strong>Local:</strong> {culto.local}
              </span>
              <span>
                <strong>Status:</strong> {culto.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

