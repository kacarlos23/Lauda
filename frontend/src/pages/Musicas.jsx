import { useState, useEffect } from "react";
// Importando os ícones do Lucide React
import { Headphones, Edit2, Trash2 } from "lucide-react";
import "./Musicas.css";

const ESTADO_INICIAL_MUSICA = {
  titulo: "",
  artista: "",
  tom_original: "C",
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
  const [formData, setFormData] = useState(ESTADO_INICIAL_MUSICA);

  const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const urlLimpa = baseUrl.replace(/\/$/, "");

  const carregarMusicas = () => {
    const token = localStorage.getItem("token");
    fetch(`${urlLimpa}/api/musicas/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) throw new Error("Não autorizado");
        return res.json();
      })
      .then((dados) => {
        // ---> NOVO: Filtra para mostrar apenas as músicas ativas na tela!
        const musicasAtivas = dados.filter(
          (musica) => musica.is_active !== false,
        );
        setMusicas(musicasAtivas);
      })
      .catch((erro) => {
        console.error(erro);
        localStorage.removeItem("token");
        window.location.href = "/";
      });
  };

  useEffect(() => {
    carregarMusicas();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNovaMusica = () => {
    setFormData(ESTADO_INICIAL_MUSICA);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEditarMusica = (musica) => {
    setFormData({
      titulo: musica.titulo || "",
      artista: musica.artista || "",
      tom_original: musica.tom_original || "C",
      bpm: musica.bpm || "",
      compasso: musica.compasso || "",
      link_referencia: musica.link_referencia || "",
      cifra_texto: musica.cifra_texto || "",
      observacoes: musica.observacoes || "",
      tags: musica.tags || "",
    });
    setEditingId(musica.id);
    setIsModalOpen(true);
  };

  const handleExcluirMusica = (id) => {
    if (
      !window.confirm(
        "Tem certeza que deseja remover esta música do repertório?",
      )
    )
      return;
    const token = localStorage.getItem("token");

    fetch(`${urlLimpa}/api/musicas/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: false }),
    }).then((res) => {
      if (res.ok) {
        carregarMusicas();
      } else {
        alert("Não foi possível excluir a música. Verifique sua conexão.");
      }
    });
  };

  const handleSalvarMusica = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const url = editingId
      ? `${urlLimpa}/api/musicas/${editingId}/`
      : `${urlLimpa}/api/musicas/`;
    const method = editingId ? "PUT" : "POST";

    const dadosEnvio = { ...formData };
    if (dadosEnvio.bpm === "") dadosEnvio.bpm = null;

    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEnvio),
    }).then((res) => {
      if (res.ok) {
        setIsModalOpen(false);
        carregarMusicas();
      } else {
        alert(
          "Erro ao salvar música. Verifique se preencheu título, artista e tom.",
        );
      }
    });
  };

  return (
    <div>
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Repertório de Músicas</h2>
          <p className="text-muted">
            Gerencie as canções, tons e cifras do ministério
          </p>
        </div>
        <button
          className="lauda-btn lauda-btn-primary"
          onClick={handleNovaMusica}
        >
          + Nova Música
        </button>
      </div>

      <div className="musicas-grid">
        {musicas.map((musica) => (
          <div
            key={musica.id}
            className="lauda-card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <div>
              <div className="musica-card-header">
                <div>
                  <h3 className="musica-titulo">{musica.titulo}</h3>
                  <div className="musica-artista">{musica.artista}</div>
                </div>
                <div className="musica-tom-badge">{musica.tom_original}</div>
              </div>

              {musica.tags && (
                <div className="musica-tags">
                  {musica.tags.split(",").map((tag, index) => (
                    <span key={index} className="musica-tag">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="musica-meta-column">
                <div className="musica-meta-row">
                  <div className="musica-meta-item">
                    <strong>BPM</strong>
                    <span>{musica.bpm || "-"}</span>
                  </div>
                  <div className="musica-meta-item">
                    <strong>Compasso</strong>
                    <span>{musica.compasso || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações refatoradas usando as novas classes e os ícones Lucide */}
            <div className="musica-actions">
              {musica.link_referencia && (
                <a
                  href={musica.link_referencia}
                  target="_blank"
                  rel="noreferrer"
                  className="lauda-btn lauda-btn-secondary musica-action-btn"
                >
                  <Headphones size={16} /> Ouvir
                </a>
              )}
              <button
                className="lauda-btn lauda-btn-secondary musica-action-btn"
                onClick={() => handleEditarMusica(musica)}
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="lauda-btn lauda-btn-secondary musica-action-btn"
                style={{ color: "var(--error-dark)", maxWidth: "50px" }}
                onClick={() => handleExcluirMusica(musica.id)}
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {musicas.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "40px",
              color: "var(--gray-500)",
            }}
          >
            Seu repertório está vazio. Adicione a primeira música!
          </div>
        )}
      </div>

      {/* =========================================
          MODAL DE CRIAR / EDITAR MÚSICA REFATORADO
          ========================================= */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? "Editar Música" : "Cadastrar Nova Música"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSalvarMusica}>
              <div className="modal-body modal-form">
                {/* Usando o form-row-wrap para estruturar o formulário limpo */}
                <div className="form-row-wrap">
                  <div className="form-field-grow">
                    <label className="input-label">Título da Música *</label>
                    <input
                      type="text"
                      name="titulo"
                      className="input-field"
                      value={formData.titulo}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Oceanos"
                    />
                  </div>
                  <div className="form-field-grow">
                    <label className="input-label">Artista / Banda *</label>
                    <input
                      type="text"
                      name="artista"
                      className="input-field"
                      value={formData.artista}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Hillsong"
                    />
                  </div>
                </div>

                <div className="form-row-wrap">
                  <div className="form-field-small">
                    <label className="input-label">Tom *</label>
                    <input
                      type="text"
                      name="tom_original"
                      className="input-field"
                      value={formData.tom_original}
                      onChange={handleChange}
                      required
                      placeholder="Ex: C, G#"
                    />
                  </div>
                  <div className="form-field-small">
                    <label className="input-label">BPM</label>
                    <input
                      type="number"
                      name="bpm"
                      className="input-field"
                      value={formData.bpm}
                      onChange={handleChange}
                      placeholder="Ex: 72"
                    />
                  </div>
                  <div className="form-field-small">
                    <label className="input-label">Compasso</label>
                    <input
                      type="text"
                      name="compasso"
                      className="input-field"
                      value={formData.compasso}
                      onChange={handleChange}
                      placeholder="Ex: 4/4"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">
                    Link de Referência (YouTube/Spotify)
                  </label>
                  <input
                    type="url"
                    name="link_referencia"
                    className="input-field"
                    value={formData.link_referencia}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="input-label">
                    Tags (Separe por vírgula)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    className="input-field"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="Adoração, Ceia, Animada"
                  />
                </div>

                <div>
                  <label className="input-label">
                    Cifra (Cole o texto aqui)
                  </label>
                  <textarea
                    name="cifra_texto"
                    className="input-field"
                    rows="4"
                    value={formData.cifra_texto}
                    onChange={handleChange}
                    placeholder="[C]  [G]  [Am]  [F]..."
                    style={{ fontFamily: "monospace" }}
                  ></textarea>
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
                  Salvar Música
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
