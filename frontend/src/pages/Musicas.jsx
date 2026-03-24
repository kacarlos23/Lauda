// frontend/src/pages/Musicas.jsx
import { useState, useEffect } from "react";
import "./Musicas.css";

export default function Musicas() {
  const [musicas, setMusicas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    titulo: "",
    artista: "",
    tom_original: "",
    bpm: "",
  });

  const buscarMusicas = () => {
    const token = localStorage.getItem("token");
    fetch("https://lauda-4de8.onrender.com/api/musicas/", {
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
    setEditingId(null); // Garante que não estamos editando
    setFormData({ titulo: "", artista: "", tom_original: "", bpm: "" }); // Limpa os campos
    setIsModalOpen(true);
  };

  const handleEditarClick = (musica) => {
    setEditingId(musica.id); // Avisa o sistema qual música estamos editando
    setFormData({
      titulo: musica.titulo,
      artista: musica.artista,
      tom_original: musica.tom_original,
      bpm: musica.bpm || "", // Se for null no banco, coloca vazio para o input não bugar
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    const confirmacao = window.confirm(
      "Tem certeza que deseja deletar esta música?",
    );
    if (!confirmacao) return;

    const token = localStorage.getItem("token");

    fetch(`https://lauda-4de8.onrender.com/api/musicas/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) buscarMusicas();
        else alert("Erro ao deletar a música.");
      })
      .catch((erro) => console.error("Erro ao deletar:", erro));
  };

  // ATUALIZADO: Salva tanto novas músicas quanto edições
  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    // Se tem editingId, usamos PUT na URL específica. Se não, usamos POST na URL geral.
    const url = editingId
      ? `https://lauda-4de8.onrender.com/api/musicas/${editingId}/`
      : "https://lauda-4de8.onrender.com/api/musicas/";

    const metodo = editingId ? "PUT" : "POST";

    fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (res.ok) {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ titulo: "", artista: "", tom_original: "", bpm: "" });
          buscarMusicas();
        } else {
          alert("Erro ao salvar a música.");
        }
      })
      .catch((erro) => console.error("Erro ao salvar:", erro));
  };

  return (
    <div>
      <div className="lauda-page-header">
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
            <div className="musica-meta text-muted">
              <span>
                <strong>Tom:</strong> {musica.tom_original}
              </span>
              {musica.bpm && (
                <span>
                  <strong>BPM:</strong> {musica.bpm}
                </span>
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

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="modal-overlay">
          {/* ALTERAÇÃO: removido style={{ display: 'block' }} */}
          <div className="modal">
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
              {/* ALTERAÇÃO: removido style inline, agora .modal-body já tem flex-direction e gap via CSS */}
              <div className="modal-body">
                <div className="input-group">
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

                <div className="input-group">
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

                {/* ALTERAÇÃO: trocado div+style inline por div.form-row (classe CSS) */}
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Tom Original *</label>
                    <input
                      type="text"
                      name="tom_original"
                      className="input-field"
                      placeholder="Ex: C, Dm, G#"
                      value={formData.tom_original}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="input-group">
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
