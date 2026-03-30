import { useState, useEffect } from "react";
import {
  Headphones,
  Edit2,
  Trash2,
  Play,
  FileText,
  Guitar,
} from "lucide-react";
import "./Musicas.css";

const ESTADO_INICIAL_MUSICA = {
  titulo: "",
  artista: "",
  tom_original: "C",
  bpm: "",
  compasso: "",
  link_youtube: "",
  link_audio: "",
  link_letra: "",
  link_cifra: "",
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
      link_youtube: musica.link_youtube || "",
      link_audio: musica.link_audio || "",
      link_letra: musica.link_letra || "",
      link_cifra: musica.link_cifra || "",
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
      if (res.ok) carregarMusicas();
      else alert("Não foi possível excluir a música. Verifique sua conexão.");
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

              {/* MÁGICA VISUAL: As pílulas de Links Úteis */}
              <div className="musica-external-links">
                {musica.link_youtube && (
                  <a
                    href={musica.link_youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill pill-youtube"
                    title="Assistir no YouTube"
                  >
                    <Play size={14} /> Vídeo
                  </a>
                )}
                {musica.link_audio && (
                  <a
                    href={musica.link_audio}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill pill-audio"
                    title="Ouvir Áudio Original"
                  >
                    <Headphones size={14} /> Áudio
                  </a>
                )}
                {musica.link_letra && (
                  <a
                    href={musica.link_letra}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill pill-letra"
                    title="Ver Letra"
                  >
                    <FileText size={14} /> Letra
                  </a>
                )}
                {musica.link_cifra && (
                  <a
                    href={musica.link_cifra}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill pill-cifra"
                    title="Acessar Cifra"
                  >
                    <Guitar size={14} /> Cifra
                  </a>
                )}
              </div>

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

            {/* Ações Restantes (Editar / Excluir) */}
            <div className="musica-actions">
              <button
                className="lauda-btn lauda-btn-secondary musica-action-btn"
                onClick={() => handleEditarMusica(musica)}
                title="Editar"
              >
                <Edit2 size={16} /> Editar
              </button>
              <button
                className="lauda-btn lauda-btn-secondary"
                style={{ color: "var(--error-dark)", padding: "0.4rem 0.8rem" }}
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

      {/* MODAL DE MÚSICA */}
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

                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--gray-50)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--gray-200)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--gray-700)",
                      margin: 0,
                    }}
                  >
                    Links
                  </h4>

                  <div className="form-row-wrap">
                    <div className="form-field-grow">
                      <label
                        className="input-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Play size={14} color="#ef4444" /> YouTube (Vídeo)
                      </label>
                      <input
                        type="url"
                        name="link_youtube"
                        className="input-field"
                        value={formData.link_youtube}
                        onChange={handleChange}
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="form-field-grow">
                      <label
                        className="input-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Headphones size={14} color="#10b981" /> Spotify/Deezer
                        (Áudio)
                      </label>
                      <input
                        type="url"
                        name="link_audio"
                        className="input-field"
                        value={formData.link_audio}
                        onChange={handleChange}
                        placeholder="https://open.spotify.com/..."
                      />
                    </div>
                  </div>

                  <div className="form-row-wrap">
                    <div className="form-field-grow">
                      <label
                        className="input-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <FileText size={14} color="#f59e0b" /> Letras.com
                      </label>
                      <input
                        type="url"
                        name="link_letra"
                        className="input-field"
                        value={formData.link_letra}
                        onChange={handleChange}
                        placeholder="https://letras.mus.br/..."
                      />
                    </div>
                    <div className="form-field-grow">
                      <label
                        className="input-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Guitar size={14} color="#3b82f6" /> CifraClub
                      </label>
                      <input
                        type="url"
                        name="link_cifra"
                        className="input-field"
                        value={formData.link_cifra}
                        onChange={handleChange}
                        placeholder="https://cifraclub.com.br/..."
                      />
                    </div>
                  </div>
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
                    Cifra Customizada (Texto)
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
