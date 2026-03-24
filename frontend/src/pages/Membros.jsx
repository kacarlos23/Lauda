// frontend/src/pages/Membros.jsx
import { useState, useEffect } from "react";
import "./Membros.css";

export default function Membros() {
  const [membros, setMembros] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("https://lauda-4de8.onrender.com/api/membros/", {
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
          throw new Error("Sessão expirada");
        }
        return res.json();
      })
      .then((dados) => setMembros(dados))
      .catch((erro) => console.error("Erro na busca:", erro));
  }, []);

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Equipe</h2>
          <p className="text-muted">Gerencie os membros do ministério</p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={() =>
            alert("Abriremos o formulário de Convite na próxima etapa!")
          }
        >
          + Novo Membro
        </button>
      </div>

      <div className="musicas-grid">
        {membros.map((membro) => (
          <div key={membro.id} className="lauda-card">
            <div className="musica-info">
              <h3>{membro.first_name || membro.username}</h3>
              <p className="text-muted">{membro.funcao_principal}</p>
            </div>
            <div className="musica-meta text-muted">
              <span>
                <strong>Acesso:</strong> Nível {membro.nivel_acesso}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
