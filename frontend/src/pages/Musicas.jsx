import { useState, useEffect } from "react";
import "./Musicas.css";

// Criamos uma constante com todos os campos limpos para facilitar o "reset" do formulário
const ESTADO_INICIAL_FORM = {
  titulo: "",
  artista: "",
  tom_original: "",
  bpm: "",
  compasso: "",
  link_referencia: "",
  cifra_texto: "",
  observacoes: "",
  tags: "",
};

export default function Musicas() {
  const [musicas, setMusicas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL_FORM);

  const buscarMusicas = () => {
    const token = localStorage.getItem("token");
    fetch("http://127.0.0.1:8000/api/musicas/", {
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
      .then((dados) => setMusicas(dados))
      .catch((erro) => console.error("Erro na busca:", erro));
  };

  useEffect(() => {
    buscarMusicas();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNovoClick = () => {
    setEditingId(null);
    setFormData(ESTADO_INICIAL_FORM);
    setIsModalOpen(true);
  };

  const handleEditarClick = (musica) => {
    setEditingId(musica.id);
    // Populando TODOS os campos com os dados que vêm do banco.
    // Usamos || '' para evitar que o React reclame se o valor for null no banco.
    setFormData({
      titulo: musica.titulo || "",
      artista: musica.artista || "",
      tom_original: musica.tom_original || "",
      bpm: musica.bpm || "",
      compasso: musica.compasso || "",
      link_referencia: musica.link_referencia || "",
      cifra_texto: musica.cifra_texto || "",
      observacoes: musica.observacoes || "",
      tags: musica.tags || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    const confirmacao = window.confirm(
      "Tem certeza que deseja deletar esta música?",
    );
    if (!confirmacao) return;

    const token = localStorage.getItem("token");
    fetch(`http://127.0.0.1:8000/api/musicas/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) buscarMusicas();
        else alert("Erro ao deletar a música.");
      })
      .catch((erro) => console.error("Erro ao deletar:", erro));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const url = editingId
      ? `http://127.0.0.1:8000/api/musicas/${editingId}/`
      : "http://127.0.0.1:8000/api/musicas/";
    const metodo = editingId ? "PUT" : "POST";

    // Se o BPM estiver vazio, transformamos em null para não quebrar o banco do Django (que espera um número)
    const dadosParaEnviar = { ...formData };
    if (dadosParaEnviar.bpm === "") dadosParaEnviar.bpm = null;

    fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosParaEnviar),
    })
      .then((res) => {
        if (res.ok) {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData(ESTADO_INICIAL_FORM);
          buscarMusicas();
        } else {
          alert("Erro ao salvar a música. Verifique se o link é válido.");
        }
      })
      .catch((erro) => console.error("Erro ao salvar:", erro));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="text-primary">Banco de Músicas</h2>
          <p className="text-muted">
            Gerencie o repertório global do ministério
          </p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={handleNovoClick}
        >
          + Nova Música
        </button>
      </div>

      <div className="musicas-grid">
        {musicas.map((musica) => (
          <div key={musica.id} className="lauda-card">
            <div className="musica-info">
              <h3>{musica.titulo}</h3>
              <p className="text-muted">{musica.artista}</p>
            </div>

            <div
              className="musica-meta text-muted"
              style={{ flexDirection: "column", gap: "5px" }}
            >
              <div style={{ display: "flex", gap: "15px" }}>
                <span>
                  <strong>Tom:</strong> {musica.tom_original}
                </span>
                {musica.bpm && (
                  <span>
                    <strong>BPM:</strong> {musica.bpm}
                  </span>
                )}
                {musica.compasso && (
                  <span>
                    <strong>Compasso:</strong> {musica.compasso}
                  </span>
                )}
              </div>

              {/* Mostra as Tags e Link se existirem */}
              {musica.tags && (
                <div style={{ marginTop: "5px" }}>
                  {musica.tags.split(",").map((tag) => (
                    <span
                      key={tag}
                      className="badge badge-gray"
                      style={{ marginRight: "5px" }}
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
              {musica.link_referencia && (
                <a
                  href={musica.link_referencia}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "0.85rem",
                    marginTop: "5px",
                    display: "inline-block",
                  }}
                >
                  🔗 Ouvir Referência
                </a>
              )}
            </div>

            <div
              style={{
                marginTop: "15px",
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                borderTop: "1px solid var(--gray-200)",
                paddingTop: "15px",
              }}
            >
              <button
                className="lauda-btn lauda-btn-secondary"
                style={{ padding: "5px 10px", fontSize: "0.85rem" }}
                onClick={() => handleEditarClick(musica)}
              >
                Editar
              </button>
              <button
                className="lauda-btn lauda-btn-danger"
                style={{
                  padding: "5px 10px",
                  fontSize: "0.85rem",
                  backgroundColor: "var(--error-dark)",
                  color: "white",
                  border: "none",
                }}
                onClick={() => handleDelete(musica.id)}
              >
                Deletar
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{ display: "block", maxWidth: "600px" }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? "Editar Música" : "Cadastrar Nova Música"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className="modal-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {/* Linha 1: Título e Artista */}
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label className="input-label">Título da Música *</label>
                    <input
                      type="text"
                      name="titulo"
                      className="input-field"
                      value={formData.titulo}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label className="input-label">
                      Artista/Banda Original *
                    </label>
                    <input
                      type="text"
                      name="artista"
                      className="input-field"
                      value={formData.artista}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Linha 2: Tom, BPM e Compasso */}
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "100px" }}>
                    <label className="input-label">Tom Original *</label>
                    <input
                      type="text"
                      name="tom_original"
                      className="input-field"
                      placeholder="Ex: C, Dm"
                      value={formData.tom_original}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "100px" }}>
                    <label className="input-label">BPM</label>
                    <input
                      type="number"
                      name="bpm"
                      className="input-field"
                      placeholder="Ex: 120"
                      value={formData.bpm}
                      onChange={handleChange}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "100px" }}>
                    <label className="input-label">Compasso</label>
                    <input
                      type="text"
                      name="compasso"
                      className="input-field"
                      placeholder="Ex: 4/4, 6/8"
                      value={formData.compasso}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Linha 3: Link e Tags */}
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label className="input-label">
                      Link de Referência (YouTube/Spotify)
                    </label>
                    <input
                      type="url"
                      name="link_referencia"
                      className="input-field"
                      placeholder="https://..."
                      value={formData.link_referencia}
                      onChange={handleChange}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label className="input-label">
                      Tags (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      className="input-field"
                      placeholder="Ex: Adoração, Ceia, Animada"
                      value={formData.tags}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Linha 4: Cifra e Observações */}
                <div>
                  <label className="input-label">Cifra (Texto)</label>
                  <textarea
                    name="cifra_texto"
                    className="input-field"
                    rows="4"
                    placeholder="Cole a cifra aqui..."
                    value={formData.cifra_texto}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="input-label">Observações Gerais</label>
                  <input
                    type="text"
                    name="observacoes"
                    className="input-field"
                    placeholder="Ex: Introdução apenas no violão"
                    value={formData.observacoes}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="lauda-btn lauda-btn-primary">
                  {editingId ? "Salvar Alterações" : "Salvar Música"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
