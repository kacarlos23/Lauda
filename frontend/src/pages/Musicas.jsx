import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Guitar,
  Headphones,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api";
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

const ESTADO_INICIAL_FILTROS = {
  nome: "",
  artista: "",
  tom: "",
  tag: "",
};

const normalizarTexto = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const extrairTags = (tags = "") =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const mapearMusicaParaFormulario = (musica = {}) => ({
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

const criarSnapshotEnriquecimento = (musica = {}) => ({
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

export default function Musicas() {
  const [musicas, setMusicas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [formData, setFormData] = useState(ESTADO_INICIAL_MUSICA);
  const [filtros, setFiltros] = useState(ESTADO_INICIAL_FILTROS);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentFeedback, setEnrichmentFeedback] = useState({
    text: "",
    type: "",
  });
  const [enrichmentSnapshot, setEnrichmentSnapshot] = useState(null);

  const urlLimpa = getApiBaseUrl();
  const isReadOnly = modalMode === "view";

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
        const musicasAtivas = dados
          .filter((musica) => musica.is_active !== false)
          .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
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

  const artistaOptions = useMemo(
    () =>
      [
        ...new Set(musicas.map((musica) => musica.artista).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [musicas],
  );

  const tomOptions = useMemo(
    () =>
      [
        ...new Set(
          musicas.map((musica) => musica.tom_original).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [musicas],
  );

  const tagOptions = useMemo(
    () =>
      [...new Set(musicas.flatMap((musica) => extrairTags(musica.tags)))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [musicas],
  );

  const musicasFiltradas = useMemo(() => {
    const nomeBusca = normalizarTexto(filtros.nome);
    const artistaBusca = normalizarTexto(filtros.artista);
    const tomBusca = normalizarTexto(filtros.tom);
    const tagBusca = normalizarTexto(filtros.tag);

    return musicas.filter((musica) => {
      const tagsMusica = extrairTags(musica.tags).map(normalizarTexto);

      return (
        (!nomeBusca || normalizarTexto(musica.titulo).includes(nomeBusca)) &&
        (!artistaBusca || normalizarTexto(musica.artista) === artistaBusca) &&
        (!tomBusca || normalizarTexto(musica.tom_original) === tomBusca) &&
        (!tagBusca || tagsMusica.includes(tagBusca))
      );
    });
  }, [musicas, filtros]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleFiltroChange = (event) => {
    const { name, value } = event.target;
    setFiltros((current) => ({ ...current, [name]: value }));
  };

  const handleNovaMusica = () => {
    setFormData(ESTADO_INICIAL_MUSICA);
    setEditingId(null);
    setModalMode("create");
    setEnrichmentFeedback({ text: "", type: "" });
    setEnrichmentSnapshot(null);
    setIsModalOpen(true);
  };

  const handleAbrirMusica = (musica, mode) => {
    setFormData(mapearMusicaParaFormulario(musica));
    setEditingId(musica.id);
    setModalMode(mode);
    setEnrichmentFeedback({ text: "", type: "" });
    setEnrichmentSnapshot(criarSnapshotEnriquecimento(musica));
    setIsModalOpen(true);
  };

  const handleEditarMusica = (musica) => {
    handleAbrirMusica(musica, "edit");
  };

  const handleVerMusica = (musica) => {
    handleAbrirMusica(musica, "view");
  };

  const handleExcluirMusica = (id) => {
    if (
      !window.confirm(
        "Tem certeza que deseja remover esta música do repertório?",
      )
    ) {
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
      spotify_popularidade:
        data.spotify_popularity || current.spotify_popularidade,
      genius_popularidade:
        data.genius_popularity || current.genius_popularidade,
      metadata_source: data.source || current.metadata_source,
      metadata_last_synced_at:
        data.synced_at || current.metadata_last_synced_at,
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
        .map(
          ([field, value]) =>
            `${field}: ${Array.isArray(value) ? value.join(", ") : value}`,
        )
        .join(" | ");
    } catch {
      return "Erro ao salvar música. Verifique os dados informados.";
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
        throw new Error(
          data.detail || "Não foi possível enriquecer os metadados.",
        );
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
          <p className="text-muted">
            Gerencie canções, tons, links e cifras do ministério.
          </p>
        </div>
        <button
          type="button"
          className="lauda-btn lauda-btn-primary"
          onClick={handleNovaMusica}
        >
          <Plus size={18} aria-hidden="true" /> Nova Música
        </button>
      </div>

      <section className="lauda-card musicas-filtros-card">
        <div className="musicas-filtros-header">
          <div>
            <h3>Consulta do repertório</h3>
            <p className="text-muted">
              Pesquise em tempo real por nome e refine por artista, tom e tag.
            </p>
          </div>
          <span className="badge badge-gray">
            {musicasFiltradas.length} resultado(s)
          </span>
        </div>

        <div className="musicas-filtros-grid">
          <label
            className="musicas-filtro-field musicas-filtro-field-search"
            htmlFor="filtro-nome"
          >
            <span className="input-label">Nome</span>
            <div className="musicas-search-shell">
              <Search size={16} aria-hidden="true" />
              <input
                id="filtro-nome"
                type="text"
                name="nome"
                value={filtros.nome}
                onChange={handleFiltroChange}
                className="input-field musicas-search-input"
                placeholder="Digite o nome da música"
                autoComplete="off"
              />
            </div>
          </label>

          <label className="musicas-filtro-field" htmlFor="filtro-artista">
            <span className="input-label">Artista</span>
            <select
              id="filtro-artista"
              name="artista"
              value={filtros.artista}
              onChange={handleFiltroChange}
              className="input-field"
            >
              <option value="">Todos</option>
              {artistaOptions.map((artista) => (
                <option key={artista} value={artista}>
                  {artista}
                </option>
              ))}
            </select>
          </label>

          <label className="musicas-filtro-field" htmlFor="filtro-tom">
            <span className="input-label">Tom</span>
            <select
              id="filtro-tom"
              name="tom"
              value={filtros.tom}
              onChange={handleFiltroChange}
              className="input-field"
            >
              <option value="">Todos</option>
              {tomOptions.map((tom) => (
                <option key={tom} value={tom}>
                  {tom}
                </option>
              ))}
            </select>
          </label>

          <label className="musicas-filtro-field" htmlFor="filtro-tag">
            <span className="input-label">Tag</span>
            <select
              id="filtro-tag"
              name="tag"
              value={filtros.tag}
              onChange={handleFiltroChange}
              className="input-field"
            >
              <option value="">Todas</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="lauda-table-container musicas-table-container">
        <table className="lauda-table musicas-table">
          <thead>
            <tr>
              <th>Música e Artista</th>
              <th>Links Oficiais</th>
              <th>Tom</th>
              <th>BPM</th>
              <th>Compasso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {musicasFiltradas.map((musica) => {
              const tags = extrairTags(musica.tags);

              return (
                <tr key={musica.id}>
                  {/* COLUNA 1: TÍTULO, ARTISTA E TAGS */}
                  <td data-label="Música e Artista">
                    <div className="musica-table-main">
                      <div className="musica-table-title">{musica.titulo}</div>
                      <div className="musica-table-artist">
                        {musica.artista || "Artista não informado"}
                      </div>

                      {tags.length > 0 && (
                        <div className="musica-table-tags">
                          {tags.map((tag) => (
                            <span
                              key={`${musica.id}-${tag}`}
                              className="musica-tag"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* COLUNA 2: GRID 2x2 DE LINKS */}
                  <td data-label="Links Oficiais">
                    <div className="musica-links-grid">
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
                          title="Ouvir áudio"
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
                  </td>

                  {/* COLUNAS RESTANTES */}
                  <td data-label="Tom">
                    <span className="musica-tom-badge musica-tom-badge-inline">
                      {musica.tom_original || "-"}
                    </span>
                  </td>
                  <td data-label="BPM">{musica.bpm || "-"}</td>
                  <td data-label="Compasso">{musica.compasso || "-"}</td>

                  {/* AÇÕES: VISUALIZAR, EDITAR E EXCLUIR */}
                  <td data-label="Ações">
                    <div className="musica-table-actions">
                      <button
                        type="button"
                        className="lauda-btn lauda-btn-secondary musica-table-btn musica-table-icon-btn"
                        onClick={() => handleVerMusica(musica)}
                        aria-label={`Visualizar ${musica.titulo}`}
                        title="Ver dados"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="lauda-btn lauda-btn-secondary musica-table-btn musica-table-icon-btn"
                        onClick={() => handleEditarMusica(musica)}
                        aria-label={`Editar ${musica.titulo}`}
                        title="Editar"
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="lauda-btn lauda-btn-secondary musica-table-btn musica-table-icon-btn musica-delete-btn"
                        onClick={() => handleExcluirMusica(musica.id)}
                        aria-label={`Excluir ${musica.titulo}`}
                        title="Excluir"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {musicasFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" className="table-empty musicas-table-empty">
                  Nenhuma música encontrada com os filtros informados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="musica-modal-title"
          >
            <div className="modal-header">
              <h3 id="musica-modal-title" className="modal-title">
                {isReadOnly
                  ? "Dados da Música"
                  : editingId
                    ? "Editar Música"
                    : "Cadastrar Nova Música"}
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
                {!isReadOnly && (
                  <div className="musica-enrichment-toolbar">
                    <div>
                      <h4 className="musica-links-title">
                        Integração Spotify + Genius
                      </h4>
                      <p className="text-muted musica-enrichment-copy">
                        Busca capa, preview de 30s e link oficial para a letra
                        sem depender de scraping.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="lauda-btn lauda-btn-secondary"
                      onClick={handleEnriquecerMusica}
                      disabled={isEnriching}
                    >
                      <Search size={16} aria-hidden="true" />{" "}
                      {isEnriching ? "Buscando..." : "Buscar metadados"}
                    </button>
                  </div>
                )}

                {enrichmentFeedback.text && (
                  <div
                    className={`status-alert ${
                      enrichmentFeedback.type === "error"
                        ? "status-alert--error"
                        : "status-alert--success"
                    }`}
                  >
                    {enrichmentFeedback.text}
                  </div>
                )}

                {enrichmentSnapshot && (
                  <div className="musica-enrichment-debug surface-subtle">
                    <div className="musica-enrichment-debug-header">
                      <h4 className="musica-links-title">
                        Retorno do enriquecimento
                      </h4>
                      <span className="badge badge-gray">
                        {enrichmentSnapshot.source || "manual"}
                      </span>
                    </div>

                    <div className="musica-enrichment-debug-grid">
                      <div className="musica-enrichment-debug-item">
                        <strong>Título</strong>
                        <span>{enrichmentSnapshot.title || "-"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Artista</strong>
                        <span>{enrichmentSnapshot.artist || "-"}</span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Spotify ID</strong>
                        <span>
                          {enrichmentSnapshot.spotify_id || "Não encontrado"}
                        </span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Genius ID</strong>
                        <span>
                          {enrichmentSnapshot.genius_id || "Não encontrado"}
                        </span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>ISRC</strong>
                        <span>
                          {enrichmentSnapshot.isrc || "Não encontrado"}
                        </span>
                      </div>
                      <div className="musica-enrichment-debug-item">
                        <strong>Recursos</strong>
                        <span>
                          {enrichmentSnapshot.hasCover ? "Capa" : "Sem capa"}
                          {" • "}
                          {enrichmentSnapshot.hasPreview
                            ? "Preview"
                            : "Sem preview"}
                          {" • "}
                          {enrichmentSnapshot.hasLyricsLink
                            ? "Letra oficial"
                            : "Sem letra oficial"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {(formData.cover_url ||
                  formData.preview_url ||
                  formData.link_letra ||
                  formData.isrc) && (
                  <div className="musica-preview-surface surface-subtle">
                    {formData.cover_url && (
                      <img
                        src={formData.cover_url}
                        alt={
                          formData.titulo
                            ? `Capa de ${formData.titulo}`
                            : "Capa da música"
                        }
                        className="musica-preview-cover"
                      />
                    )}
                    <div className="musica-preview-content">
                      <div className="musica-preview-meta">
                        <span className="badge badge-primary">
                          {formData.metadata_source || "manual"}
                        </span>
                        {formData.isrc && (
                          <span className="badge badge-gray">
                            ISRC {formData.isrc}
                          </span>
                        )}
                      </div>
                      {formData.preview_url && (
                        <audio
                          controls
                          className="musica-preview-audio"
                          src={formData.preview_url}
                        >
                          Seu navegador não suporta áudio embutido.
                        </audio>
                      )}
                      {formData.link_letra && (
                        <a
                          href={formData.link_letra}
                          target="_blank"
                          rel="noreferrer"
                          className="lauda-btn lauda-btn-secondary musica-lyrics-btn"
                        >
                          <ExternalLink size={16} aria-hidden="true" /> Ver
                          letra oficial
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
                      placeholder="Ex: Oceanos..."
                      disabled={isReadOnly}
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
                      placeholder="Ex: Hillsong..."
                      disabled={isReadOnly}
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
                      placeholder="Ex: C..."
                      disabled={isReadOnly}
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
                      placeholder="Ex: 72..."
                      disabled={isReadOnly}
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
                      placeholder="Ex: 4/4..."
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="musica-links-surface surface-subtle">
                  <h4 className="musica-links-title">Links</h4>

                  <div className="form-row-wrap">
                    <div className="form-field-grow">
                      <label
                        className="input-label musica-link-label"
                        htmlFor="musica-youtube"
                      >
                        <Play
                          size={14}
                          className="text-danger"
                          aria-hidden="true"
                        />{" "}
                        YouTube (Vídeo)
                      </label>
                      <input
                        id="musica-youtube"
                        type="url"
                        name="link_youtube"
                        className="input-field"
                        value={formData.link_youtube}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://youtube.com/..."
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="form-field-grow">
                      <label
                        className="input-label musica-link-label"
                        htmlFor="musica-audio"
                      >
                        <Headphones
                          size={14}
                          className="text-success"
                          aria-hidden="true"
                        />{" "}
                        Spotify/Deezer (Áudio)
                      </label>
                      <input
                        id="musica-audio"
                        type="url"
                        name="link_audio"
                        className="input-field"
                        value={formData.link_audio}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://open.spotify.com/..."
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>

                  <div className="form-row-wrap">
                    <div className="form-field-grow">
                      <label
                        className="input-label musica-link-label"
                        htmlFor="musica-letra"
                      >
                        <FileText
                          size={14}
                          className="text-warning"
                          aria-hidden="true"
                        />{" "}
                        Letra oficial (Genius)
                      </label>
                      <input
                        id="musica-letra"
                        type="url"
                        name="link_letra"
                        className="input-field"
                        value={formData.link_letra}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://genius.com/..."
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="form-field-grow">
                      <label
                        className="input-label musica-link-label"
                        htmlFor="musica-cifra"
                      >
                        <Guitar
                          size={14}
                          className="text-primary"
                          aria-hidden="true"
                        />{" "}
                        CifraClub
                      </label>
                      <input
                        id="musica-cifra"
                        type="url"
                        name="link_cifra"
                        className="input-field"
                        value={formData.link_cifra}
                        onChange={handleChange}
                        autoComplete="off"
                        placeholder="https://cifraclub.com.br/..."
                        disabled={isReadOnly}
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
                    placeholder="Adoração, Ceia, Animada..."
                    disabled={isReadOnly}
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
                    placeholder="[C] [G] [Am] [F]..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isReadOnly ? "Fechar" : "Cancelar"}
                </button>
                {!isReadOnly && (
                  <button type="submit" className="lauda-btn lauda-btn-primary">
                    Salvar Música
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
