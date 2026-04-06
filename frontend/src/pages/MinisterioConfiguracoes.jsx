import { Copy, FolderKanban, Image as ImageIcon, Music2, Save, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { authFetch } from "../lib/api";
import { ministrySettingsSchema } from "../lib/schemas";
import "./MinisterioConfiguracoes.css";

export default function MinisterioConfiguracoes() {
  const { token, user, updateUser, logout } = useAuth();
  const permissions = usePermissions(user);
  const navigate = useNavigate();
  const [ministerio, setMinisterio] = useState(null);
  const [formData, setFormData] = useState({ nome: "" });
  const [loading, setLoading] = useState(() => Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    authFetch("/api/ministerios/current/", token)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setMinisterio(data);
        setFormData({ nome: data.nome || "" });
      })
      .catch((requestError) => {
        if (requestError.status === 401) {
          logout();
          return;
        }

        if (isMounted) {
          setError(requestError.message || "Nao foi possivel carregar o ministerio.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [logout, token]);

  const logoInitials = useMemo(() => {
    if (!ministerio?.nome) {
      return "ML";
    }

    return ministerio.nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() || "")
      .join("");
  }, [ministerio?.nome]);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const validation = ministrySettingsSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Dados invalidos.");
      return;
    }

    if (!permissions.canEditMinistrySettings) {
      setError("Seu perfil possui acesso somente leitura.");
      return;
    }

    try {
      setSaving(true);
      const updated = await authFetch("/api/ministerios/current/", token, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });
      setMinisterio(updated);
      setFormData({ nome: updated.nome || "" });
      updateUser({ ministerio_nome: updated.nome });
      setNotice("Configuracoes do ministerio atualizadas.");
    } catch (requestError) {
      if (requestError.status === 401) {
        logout();
        return;
      }

      setError(requestError.message || "Nao foi possivel salvar as configuracoes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAccessCode = async () => {
    if (!ministerio?.access_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(ministerio.access_code);
      setNotice("Codigo de acesso copiado para a area de transferencia.");
      setError("");
    } catch {
      setError("Nao foi possivel copiar o codigo de acesso.");
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Carregando configuracoes do ministerio...</div>;
  }

  return (
    <div className="ministerio-config-page">
      <div className="lauda-page-header">
        <div className="page-title-group">
          <h2 className="text-primary">
            <Settings size={28} /> Configuracoes do Ministerio
          </h2>
          <p className="text-muted">
            Gerencie os dados principais do ministerio e os atalhos de operacao.
          </p>
        </div>
      </div>

      {notice && <div className="status-alert status-alert--success">{notice}</div>}
      {error && <div className="status-alert status-alert--error">{error}</div>}

      <div className="ministerio-config-grid">
        <section className="lauda-card ministerio-logo-card">
          <h3>Logo / imagem</h3>
          {ministerio?.logo_url ? (
            <img
              src={ministerio.logo_url}
              alt={`Logo do ministerio ${ministerio.nome}`}
              className="ministerio-logo-preview"
            />
          ) : (
            <div className="ministerio-logo-placeholder" aria-label="Placeholder da logo do ministerio">
              <ImageIcon size={28} aria-hidden="true" />
              <strong>{logoInitials}</strong>
            </div>
          )}
          <p className="text-muted">
            Upload fora do escopo atual. Esta area fica pronta para a integracao futura da logo oficial.
          </p>
        </section>

        <section className="lauda-card ministerio-details-card">
          <form className="stack-md" onSubmit={handleSave}>
            <div>
              <label className="input-label" htmlFor="ministerio-nome">
                Nome do ministerio
              </label>
              <input
                id="ministerio-nome"
                className="input-field"
                value={formData.nome}
                onChange={(event) => setFormData({ nome: event.target.value })}
                disabled={!permissions.canEditMinistrySettings}
                readOnly={!permissions.canEditMinistrySettings}
                aria-label="Nome do ministerio"
              />
              <p className="text-muted ministerio-config-help">
                {permissions.canEditMinistrySettings
                  ? "Administradores e lideres podem atualizar o nome exibido."
                  : "Seu perfil possui acesso somente leitura para este campo."}
              </p>
            </div>

            <div className="ministerio-access-grid">
              <div>
                <label className="input-label" htmlFor="ministerio-access-code">
                  Codigo de acesso
                </label>
                <div className="ministerio-copy-row">
                  <input
                    id="ministerio-access-code"
                    className="input-field"
                    value={ministerio?.access_code || ""}
                    readOnly
                    aria-label="Codigo de acesso do ministerio"
                  />
                  <button
                    type="button"
                    className="lauda-btn lauda-btn-secondary"
                    onClick={handleCopyAccessCode}
                    aria-label="Copiar codigo de acesso"
                  >
                    <Copy size={16} aria-hidden="true" /> Copiar
                  </button>
                </div>
              </div>

              <div>
                <span className="input-label">Status de acesso</span>
                <div className={`ministerio-access-status ${ministerio?.is_open ? "open" : "closed"}`}>
                  <strong>{ministerio?.is_open ? "Portas Abertas" : "Portas Fechadas"}</strong>
                  <span>
                    {ministerio?.is_open
                      ? "Qualquer pessoa com o codigo pode entrar."
                      : "Apenas usuarios autorizados pelo administrador."}
                  </span>
                </div>
              </div>
            </div>

            <div className="ministerio-shortcuts">
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary"
                onClick={() => navigate("/app/equipes")}
              >
                <FolderKanban size={16} aria-hidden="true" /> Equipes
              </button>
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary"
                onClick={() => navigate("/app/ministerio/classificacoes")}
              >
                <Music2 size={16} aria-hidden="true" /> Classificacao de Musicas
              </button>
            </div>

            {permissions.canEditMinistrySettings && (
              <div className="modal-footer">
                <button type="submit" className="lauda-btn lauda-btn-primary" disabled={saving}>
                  <Save size={16} aria-hidden="true" /> {saving ? "Salvando..." : "Salvar configuracoes"}
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
