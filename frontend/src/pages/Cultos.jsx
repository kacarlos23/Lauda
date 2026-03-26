import { useState, useEffect } from "react";
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
  const [cultos, setCultos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [escalas, setEscalas] = useState([]);

  // === CONTROLES DO MODAL DE ESCALAS ===
  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [cultoSelecionado, setCultoSelecionado] = useState(null);
  const [novoMembroId, setNovoMembroId] = useState("");

  // === CONTROLES DO MODAL DE CRIAR/EDITAR CULTO ===
  const [isCultoModalOpen, setIsCultoModalOpen] = useState(false);
  const [editingCultoId, setEditingCultoId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL_CULTO);

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const urlLimpa = baseUrl.replace(/\/$/, "");

  const carregarDados = () => {
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    Promise.all([
      fetch(`${urlLimpa}/api/cultos/`, { headers }).then((res) => res.json()),
      fetch(`${urlLimpa}/api/usuarios/`, { headers }).then((res) => res.json()),
      fetch(`${urlLimpa}/api/escalas/`, { headers }).then((res) => res.json()),
    ])
      .then(([cultosData, membrosData, escalasData]) => {
        if (cultosData.detail) throw new Error("Não autorizado");
        setCultos(cultosData);
        setMembros(membrosData);
        setEscalas(escalasData);
      })
      .catch((erro) => {
        console.error("Erro na busca:", erro);
        localStorage.removeItem("token");
        window.location.href = "/";
      });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // ==========================================
  // LÓGICA DE GESTÃO DE CULTOS (NOVO!)
  // ==========================================
  const handleChangeCulto = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNovoCulto = () => {
    setFormData(ESTADO_INICIAL_CULTO);
    setEditingCultoId(null);
    setIsCultoModalOpen(true);
  };

  const handleEditarCulto = (culto) => {
    setFormData({
      nome: culto.nome || "",
      data: culto.data || "",
      // O Django manda horas assim "19:00:00", o React precisa de "19:00"
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
        carregarDados(); // Recarrega os cultos na tela
      } else {
        alert("Erro ao salvar o culto. Verifique os dados.");
      }
    });
  };

  const handleExcluirCulto = (id) => {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir este culto? Todas as escalas serão apagadas!",
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

  // ==========================================
  // LÓGICA DA ESCALA DA EQUIPE
  // ==========================================
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

  // Filtros
  const formatarDataBR = (dataString) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const escalasDoCulto = cultoSelecionado
    ? escalas.filter((e) => e.culto === cultoSelecionado.id)
    : [];
  const membrosDisponiveis = membros.filter(
    (membro) => !escalasDoCulto.some((escala) => escala.membro === membro.id),
  );

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Agenda de Cultos</h2>
          <p className="text-muted">Gerencie os eventos e escalas</p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={handleNovoCulto}
        >
          + Novo Culto
        </button>
      </div>

      <div className="cultos-grid">
        {cultos.map((culto) => (
          <div
            key={culto.id}
            className="lauda-card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="culto-info">
                <h3>{culto.nome}</h3>
                <p className="culto-data">
                  📅 {formatarDataBR(culto.data)} das{" "}
                  {culto.horario_inicio.substring(0, 5)} às{" "}
                  {culto.horario_termino.substring(0, 5)}
                </p>
              </div>
              <div
                className="culto-meta text-muted"
                style={{ marginBottom: "15px" }}
              >
                <span>
                  📍 <strong>Local:</strong> {culto.local}
                </span>
                <span>
                  🏷️ <strong>Status:</strong>{" "}
                  <span
                    className={`badge ${culto.status === "AGENDADO" ? "badge-primary" : "badge-gray"}`}
                  >
                    {culto.status}
                  </span>
                </span>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--gray-200)",
                paddingTop: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <button
                className="lauda-btn lauda-btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => abrirModalEscala(culto)}
              >
                👥 Gerenciar Escala
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{ flex: 1, padding: "5px", fontSize: "0.85rem" }}
                  onClick={() => handleEditarCulto(culto)}
                >
                  Editar
                </button>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{
                    flex: 1,
                    padding: "5px",
                    fontSize: "0.85rem",
                    color: "var(--error-dark)",
                  }}
                  onClick={() => handleExcluirCulto(culto.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
        {cultos.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "40px",
              color: "var(--gray-500)",
            }}
          >
            Nenhum evento agendado. Clique em "+ Novo Culto" para começar.
          </div>
        )}
      </div>

      {/* =========================================
          MODAL DE CRIAR / EDITAR CULTO
          ========================================= */}
      {isCultoModalOpen && (
        <div
          className="modal-overlay"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="lauda-card"
            style={{ width: "100%", maxWidth: "500px", margin: "20px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 className="text-primary">
                {editingCultoId ? "Editar Culto" : "Agendar Novo Culto"}
              </h3>
              <button
                onClick={() => setIsCultoModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSalvarCulto}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
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

              <div>
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

              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 1 }}>
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
                <div style={{ flex: 1 }}>
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

              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 2 }}>
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
                <div style={{ flex: 1 }}>
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

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
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

      {/* =========================================
          MODAL DE ESCALAS
          ========================================= */}
      {isEscalaModalOpen && cultoSelecionado && (
        <div
          className="modal-overlay"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="lauda-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 className="text-primary">Escala: {cultoSelecionado.nome}</h3>
              <button
                onClick={fecharModalEscala}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleAdicionarEscala}
              style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
            >
              <select
                className="input-field"
                value={novoMembroId}
                onChange={(e) => setNovoMembroId(e.target.value)}
                required
                style={{ flex: 1 }}
              >
                <option value="">Selecione um membro para escalar...</option>
                {membrosDisponiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name || m.username} - {m.funcao_principal}
                  </option>
                ))}
              </select>
              <button type="submit" className="lauda-btn lauda-btn-primary">
                Adicionar
              </button>
            </form>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                    <th style={{ padding: "10px" }}>Membro</th>
                    <th style={{ padding: "10px" }}>Função</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {escalasDoCulto.map((escala) => {
                    const membro = membros.find((m) => m.id === escala.membro);
                    return (
                      <tr
                        key={escala.id}
                        style={{ borderBottom: "1px solid var(--gray-100)" }}
                      >
                        <td style={{ padding: "10px", fontWeight: "500" }}>
                          {membro
                            ? membro.first_name || membro.username
                            : "Carregando..."}
                        </td>
                        <td
                          style={{ padding: "10px", color: "var(--gray-600)" }}
                        >
                          {membro ? membro.funcao_principal : "-"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            className={`badge ${escala.status_confirmacao === "CONFIRMADO" ? "badge-primary" : "badge-gray"}`}
                          >
                            {escala.status_confirmacao}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button
                            onClick={() => handleRemoverEscala(escala.id)}
                            style={{
                              background: "none",
                              border: "1px solid var(--error-dark)",
                              color: "var(--error-dark)",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {escalasDoCulto.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          textAlign: "center",
                          padding: "30px",
                          color: "var(--gray-500)",
                        }}
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
      )}
    </div>
  );
}
