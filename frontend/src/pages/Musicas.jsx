import { useCallback, useEffect, useState } from "react";
import {
  Edit2,
  ExternalLink,
  FileText,
  Guitar,
  Headphones,
  Play,
  Search,
  Trash2,
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
  spotify_id: "",
  genius_id: "",
  isrc: "",
  cover_url: "",
  preview_url: "",
  spotify_popularidade: "",
  genius_popularidade: "",
  metadata_source: "",
  metadata_last_synced_at: "",
};

export default function Musicas() {
  const [musicas, setMusicas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL_MUSICA);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentFeedback, setEnrichmentFeedback] = useState({ text: "", type: "" });
  const [enrichmentSnapshot, setEnrichmentSnapshot] = useState(null);

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
    setEnrichmentFeedback({ text: "", type: "" });
    setEnrichmentSnapshot(null);
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
      spotify_id: musica.spotify_id || "",
      genius_id: musica.genius_id || "",
      isrc: musica.isrc || "",
      cover_url: musica.cover_url || "",
      preview_url: musica.preview_url || "",
      spotify_popularidade: musica.spotify_popularidade || "",
      genius_popularidade: musica.genius_popularidade || "",
      metadata_source: musica.metadata_source || "",
      metadata_last_synced_at: musica.metadata_last_synced_at || "",
    });
    setEditingId(musica.id);
    setEnrichmentFeedback({ text: "", type: "" });
    setEnrichmentSnapshot({
      title: musica.titulo || "",
      artist: musica.artista || "",
      source: musica.metadata_source || "manual",
      spotify_id: musica.spotify_id || "",
      genius_id: musica.genius_id || "",
      isrc: musica.isrc || "",
      hasCover: Boolean(musica.cover_url),
      hasPreview: Boolean(musica.preview_url),
      hasLyricsLink: Boolean(musica.link_letra),
    });
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

  const applyEnrichment = (data) => {
    setEnrichmentSnapshot({
      title: data.title || formData.titulo || "",
      artist: data.artist || formData.artista || "",
      source: data.source || "manual",
      spotify_id: data.spotify_id || "",
      genius_id: data.genius_id || "",
      isrc: data.isrc || "",
      hasCover: Boolean(data.cover),
      hasPreview: Boolean(data.preview),
      hasLyricsLink: Boolean(data.lyrics_link),
    });

    setFormData((current) => ({
      ...current,
      titulo: data.title || current.titulo,
      artista: data.artist || current.artista,
      link_audio: data.spotify_url || current.link_audio,
      link_letra: data.lyrics_link || current.link_letra,
      spotify_id: data.spotify_id || current.spotify_id,
      genius_id: data.genius_id || current.genius_id,
      isrc: data.isrc || current.isrc,
      cover_url: data.cover || current.cover_url,
      preview_url: data.preview || current.preview_url,
      spotify_popularidade: data.spotify_popularity || current.spotify_popularidade,
      genius_popularidade: data.genius_popularity || current.genius_popularidade,
      metadata_source: data.source || current.metadata_source,
      metadata_last_synced_at: data.synced_at || current.metadata_last_synced_at,
    }));
  };

  const sanitizeMusicPayload = (payload) => {
    const sanitized = { ...payload };
    const nullableFields = [
      "bpm",
      "spotify_popularidade",
      "genius_popularidade",
      "metadata_last_synced_at",
      "cover_url",
      "preview_url",
      "link_youtube",
      "link_audio",
      "link_letra",
      "link_cifra",
    ];

    nullableFields.forEach((field) => {
      if (sanitized[field] === "") {
        sanitized[field] = null;
      }
    });

    return sanitized;
  };

  const formatApiError = async (response) => {
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") {
        return data.detail;
      }
      return Object.entries(data || {})
        .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join(" | ");
    } catch {
      return "Erro ao salvar m?sica. Verifique os dados informados.";
    }
  };

  const handleEnriquecerMusica = async () => {
    const token = localStorage.getItem("token");
    const payload = {
      title: formData.titulo,
      artist: formData.artista,
      query: `${formData.titulo} ${formData.artista}`.trim(),
    };

    if (!payload.query) {
      setEnrichmentFeedback({
        text: "Informe ao menos o título da música para buscar metadados externos.",
        type: "error",
      });
      return;
    }

    try {
      setIsEnriching(true);
      setEnrichmentFeedback({ text: "", type: "" });
      setEnrichmentSnapshot(null);

      const response = await fetch(`${urlLimpa}/api/musicas/enriquecer/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível enriquecer os metadados.");
      }

      applyEnrichment(data);
      setEnrichmentFeedback({
        text: "Metadados encontrados e aplicados ao formulário.",
        type: "success",
      });
    } catch (error) {
      setEnrichmentFeedback({
        text: error.message || "Falha ao consultar Spotify/Genius.",
        type: "error",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSalvarMusica = (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    const url = editingId
      ? `${urlLimpa}/api/musicas/${editingId}/`
      : `${urlLimpa}/api/musicas/`;
    const method = editingId ? "PATCH" : "POST";

    const dadosEnvio = sanitizeMusicPayload(formData);

    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEnvio),
    }).then(async (res) => {
      if (res.ok) {
        setEnrichmentFeedback({ text: "", type: "" });
        setIsModalOpen(false);
        carregarMusicas();
        return;
      }

      const message = await formatApiError(res);
      setEnrichmentFeedback({ text: message, type: "error" });
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
            {musica.cover_url && (
              <div className="musica-cover-shell">
                <img src={musica.cover_url} alt={`Capa de ${musica.titulo}`} className="musica-cover-image" />
              </div>
            )}

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
                    title="Ver letra oficial"
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
                  <div className="musica-meta-item">
                    <strong>Fonte</strong>
                    <span>{musica.metadata_source || "Manual"}</span>
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
                <div className="musica-enrichment-toolbar">
                  <div>
                    <h4 className="musica-links-title">Integração Spotify + Genius</h4>
                    <p className="text-muted musica-enrichment-copy">
                      Busca capa, preview de 30s e link oficial para a letra sem depender de scraping.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="lauda-btn lauda-btn-secondary"
                    onClick={handleEnriquecerMusica}
                    disabled={isEnriching}
                  >
                    <Search size={16} aria-hidden="true" /> {isEnriching ? "Buscando..." : "Buscar metadados"}
                  </button>
                </div>

                {enrichmentFeedback.text && (
                  <div className={`status-alert ${enrichmentFeedback.type === "error" ? "status-alert--error" : "status-alert--success"}`}>
                    {enrichmentFeedback.text}
                  </div>
                )}

                {enrichmentSnapshot && (
                  <div className="musica-enrichment-debug surface-subtle">
                    <div className="musica-enrichment-debug-header">
                      <h4 className="musica-links-title">Retorno do enriquecimento</h4>
                      <span className="badge badge-gray">{enrichmentSnapshot.source || "manual"}</span>
                    </div>

                    <div className="musica-enrichment-debug-grid">
                      <div className="musica-enrichment-debug-item">
                        <strong>T?tulo</strong>
                        <span>{enrichmentSnapshot.title || "-"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Artista</strong>
                        <span>{enrichmentSnapshot.artist || "-"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Spotify ID</strong>
                        <span>{enrichmentSnapshot.spotify_id || "N?o encontrado"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Genius ID</strong>
                        <span>{enrichmentSnapshot.genius_id || "N?o encontrado"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>ISRC</strong>
                        <span>{enrichmentSnapshot.isrc || "N?o encontrado"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Recursos</strong>
                        <span>
                          {enrichmentSnapshot.hasCover ? "Capa" : "Sem capa"}
                          {" ? "}
                          {enrichmentSnapshot.hasPreview ? "Preview" : "Sem preview"}
                          {" ? "}
                          {enrichmentSnapshot.hasLyricsLink ? "Letra oficial" : "Sem letra oficial"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {(formData.cover_url || formData.preview_url || formData.link_letra || formData.isrc) && (
                  <div className="musica-preview-surface surface-subtle">
                    {formData.cover_url && (
                      <img
                        src={formData.cover_url}
                        alt={formData.titulo ? `Capa de ${formData.titulo}` : "Capa da música"}
                        className="musica-preview-cover"
                      />
                    )}
                    <div className="musica-preview-content">
                      <div className="musica-preview-meta">
                        <span className="badge badge-primary">{formData.metadata_source || "manual"}</span>
                        {formData.isrc && <span className="badge badge-gray">ISRC {formData.isrc}</span>}
                      </div>
                      {formData.preview_url && (
                        <audio controls className="musica-preview-audio" src={formData.preview_url}>
                          Seu navegador não suporta áudio embutido.
                        </audio>
                      )}
                      {formData.link_letra && (
                        <a href={formData.link_letra} target="_blank" rel="noreferrer" className="lauda-btn lauda-btn-secondary musica-lyrics-btn">
                          <ExternalLink size={16} aria-hidden="true" /> Ver letra oficial
                        </a>
                      )}
                    </div>
                  </div>
                )}

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
                        <FileText size={14} className="text-warning" aria-hidden="true" /> Letra oficial (Genius)
                      </label>
                      <input
                        id="musica-letra"
                        type="url"
                        name="link_letra"
                        className="input-field"
                        value={formData.link_letra}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://genius.com/…"
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
                    Letra / cifra manual (ChordPro)
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
