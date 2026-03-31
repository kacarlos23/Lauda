import { useCallback, useEffect, useState } from "react";
import { Edit2, FileText, Guitar, Headphones, Play, Trash2 } from "lucide-react";
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

  const carregarMusicas = useCallback(() => {
    const token = localStorage.getItem("token");

    fetch(`${urlLimpa}/api/musicas/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) throw new Error("Não autorizado");
        return res.json();
      })
      .then((dados) => {
        const musicasAtivas = dados.filter((musica) => musica.is_active !== false);
        setMusicas(musicasAtivas);
      })
      .catch((erro) => {
        console.error(erro);
        localStorage.removeItem("token");
        window.location.href = "/";
      });
  }, [urlLimpa]);

  useEffect(() => {
    carregarMusicas();
  }, [carregarMusicas]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
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
    if (!window.confirm("Tem certeza que deseja remover esta música do repertório?")) {
      return;
    }

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
        return;
      }

      alert("Não foi possível excluir a música. Verifique sua conexão.");
    });
  };

  const handleSalvarMusica = (event) => {
    event.preventDefault();
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
        return;
      }

      alert("Erro ao salvar música. Verifique título, artista e tom.");
    });
  };

  return (
    <div className="stack-lg">
      <div className="lauda-page-header">
        <div>
          <h2 className="text-primary">Repertório de Músicas</h2>
          <p className="text-muted">Gerencie canções, tons, links e cifras do ministério.</p>
        </div>
        <button type="button" className="lauda-btn lauda-btn-primary" onClick={handleNovaMusica}>
          + Nova Música
        </button>
      </div>

      <div className="musicas-grid">
        {musicas.map((musica) => (
          <article key={musica.id} className="lauda-card musica-card">
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
                  {musica.tags.split(",").map((tag) => (
                    <span key={`${musica.id}-${tag.trim()}`} className="musica-tag">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="musica-external-links">
                {musica.link_youtube && (
                  <a
                    href={musica.link_youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill musica-link-pill-danger"
                    title="Assistir no YouTube"
                  >
                    <Play size={14} aria-hidden="true" /> Vídeo
                  </a>
                )}
                {musica.link_audio && (
                  <a
                    href={musica.link_audio}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill musica-link-pill-success"
                    title="Ouvir áudio original"
                  >
                    <Headphones size={14} aria-hidden="true" /> Áudio
                  </a>
                )}
                {musica.link_letra && (
                  <a
                    href={musica.link_letra}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill musica-link-pill-warning"
                    title="Ver letra"
                  >
                    <FileText size={14} aria-hidden="true" /> Letra
                  </a>
                )}
                {musica.link_cifra && (
                  <a
                    href={musica.link_cifra}
                    target="_blank"
                    rel="noreferrer"
                    className="musica-link-pill musica-link-pill-primary"
                    title="Acessar cifra"
                  >
                    <Guitar size={14} aria-hidden="true" /> Cifra
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

            <div className="musica-actions">
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary musica-action-btn"
                onClick={() => handleEditarMusica(musica)}
              >
                <Edit2 size={16} aria-hidden="true" /> Editar
              </button>
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary musica-delete-btn"
                onClick={() => handleExcluirMusica(musica.id)}
                aria-label={`Excluir ${musica.titulo}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}

        {musicas.length === 0 && (
          <div className="empty-state musicas-empty-state">
            <h3>Seu repertório está vazio</h3>
            <p>Cadastre a primeira música para começar a montar escalas e setlists.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" role="presentation">
          <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="musica-modal-title">
            <div className="modal-header">
              <h3 id="musica-modal-title" className="modal-title">
                {editingId ? "Editar Música" : "Cadastrar Nova Música"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close"
                aria-label="Fechar cadastro de música"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSalvarMusica}>
              <div className="modal-body modal-form">
                <div className="form-row-wrap">
                  <div className="form-field-grow">
                    <label className="input-label" htmlFor="musica-titulo">
                      Título da Música *
                    </label>
                    <input
                      id="musica-titulo"
                      type="text"
                      name="titulo"
                      className="input-field"
                      value={formData.titulo}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      placeholder="Ex: Oceanos…"
                    />
                  </div>
                  <div className="form-field-grow">
                    <label className="input-label" htmlFor="musica-artista">
                      Artista / Banda *
                    </label>
                    <input
                      id="musica-artista"
                      type="text"
                      name="artista"
                      className="input-field"
                      value={formData.artista}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      placeholder="Ex: Hillsong…"
                    />
                  </div>
                </div>

                <div className="form-row-wrap">
                  <div className="form-field-small">
                    <label className="input-label" htmlFor="musica-tom">
                      Tom *
                    </label>
                    <input
                      id="musica-tom"
                      type="text"
                      name="tom_original"
                      className="input-field"
                      value={formData.tom_original}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Ex: C…"
                    />
                  </div>
                  <div className="form-field-small">
                    <label className="input-label" htmlFor="musica-bpm">
                      BPM
                    </label>
                    <input
                      id="musica-bpm"
                      type="number"
                      name="bpm"
                      className="input-field"
                      value={formData.bpm}
                      onChange={handleChange}
                      placeholder="Ex: 72…"
                    />
                  </div>
                  <div className="form-field-small">
                    <label className="input-label" htmlFor="musica-compasso">
                      Compasso
                    </label>
                    <input
                      id="musica-compasso"
                      type="text"
                      name="compasso"
                      className="input-field"
                      value={formData.compasso}
                      onChange={handleChange}
                      autoComplete="off"
                      placeholder="Ex: 4/4…"
                    />
                  </div>
                </div>

                <div className="musica-links-surface surface-subtle">
                  <h4 className="musica-links-title">Links</h4>

                  <div className="form-row-wrap">
                    <div className="form-field-grow">
                      <label className="input-label musica-link-label" htmlFor="musica-youtube">
                        <Play size={14} className="text-danger" aria-hidden="true" /> YouTube (Vídeo)
                      </label>
                      <input
                        id="musica-youtube"
                        type="url"
                        name="link_youtube"
                        className="input-field"
                        value={formData.link_youtube}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://youtube.com/…"
                      />
                    </div>
                    <div className="form-field-grow">
                      <label className="input-label musica-link-label" htmlFor="musica-audio">
                        <Headphones size={14} className="text-success" aria-hidden="true" /> Spotify/Deezer (Áudio)
                      </label>
                      <input
                        id="musica-audio"
                        type="url"
                        name="link_audio"
                        className="input-field"
                        value={formData.link_audio}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://open.spotify.com/…"
                      />
                    </div>
                  </div>

                  <div className="form-row-wrap">
                    <div className="form-field-grow">
                      <label className="input-label musica-link-label" htmlFor="musica-letra">
                        <FileText size={14} className="text-warning" aria-hidden="true" /> Letras.com
                      </label>
                      <input
                        id="musica-letra"
                        type="url"
                        name="link_letra"
                        className="input-field"
                        value={formData.link_letra}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://letras.mus.br/…"
                      />
                    </div>
                    <div className="form-field-grow">
                      <label className="input-label musica-link-label" htmlFor="musica-cifra">
                        <Guitar size={14} className="text-primary" aria-hidden="true" /> CifraClub
                      </label>
                      <input
                        id="musica-cifra"
                        type="url"
                        name="link_cifra"
                        className="input-field"
                        value={formData.link_cifra}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://cifraclub.com.br/…"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="input-label" htmlFor="musica-tags">
                    Tags (Separe por vírgula)
                  </label>
                  <input
                    id="musica-tags"
                    type="text"
                    name="tags"
                    className="input-field"
                    value={formData.tags}
                    onChange={handleChange}
                    autoComplete="off"
                    placeholder="Adoração, Ceia, Animada…"
                  />
                </div>

                <div>
                  <label className="input-label" htmlFor="musica-cifra-texto">
                    Cifra Customizada (Texto)
                  </label>
                  <textarea
                    id="musica-cifra-texto"
                    name="cifra_texto"
                    className="input-field musica-cifra-textarea"
                    rows="4"
                    value={formData.cifra_texto}
                    onChange={handleChange}
                    placeholder="[C] [G] [Am] [F]…"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="lauda-btn lauda-btn-secondary" onClick={() => setIsModalOpen(false)}>
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
