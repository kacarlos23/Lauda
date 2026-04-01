import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarRange, Plus, Send, Shield, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../lib/api";
import "./AdminDashboard.css";

const INITIAL_MINISTRY_FORM = {
  nome: "",
  slug: "",
};

const INITIAL_INVITE_FORM = {
  ministerio_id: "",
  email: "",
  nome_convidado: "",
  nivel_acesso: 3,
  max_uses: 1,
  expires_at: "",
};

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [ministerios, setMinisterios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cultos, setCultos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [ministryForm, setMinistryForm] = useState(INITIAL_MINISTRY_FORM);
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ministeriosData, usuariosData, cultosData, convitesData] = await Promise.all([
        authFetch("/api/ministerios/", token),
        authFetch("/api/usuarios/", token),
        authFetch("/api/cultos/", token),
        authFetch("/api/convites/", token),
      ]);

      setMinisterios(ministeriosData);
      setUsuarios(usuariosData);
      setCultos(cultosData);
      setConvites(convitesData);
      setInviteForm((current) => ({
        ...current,
        ministerio_id: current.ministerio_id || String(ministeriosData[0]?.id || ""),
      }));
    } catch (err) {
      setError(err.message || "Nao foi possivel carregar o painel global.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(
    () => [
      { label: "Ministerios", value: ministerios.length, icon: Building2 },
      { label: "Usuarios", value: usuarios.length, icon: Users },
      { label: "Cultos", value: cultos.length, icon: CalendarRange },
      { label: "Convites ativos", value: convites.filter((invite) => invite.is_active).length, icon: Shield },
    ],
    [convites, cultos.length, ministerios.length, usuarios.length],
  );

  const handleCreateMinistry = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      ...ministryForm,
      slug: ministryForm.slug || slugify(ministryForm.nome),
    };

    try {
      await authFetch("/api/ministerios/", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setNotice("Ministerio criado com sucesso.");
      setMinistryForm(INITIAL_MINISTRY_FORM);
      loadDashboard();
    } catch (err) {
      setError(err.message || "Nao foi possivel criar o ministerio.");
    }
  };

  const handleCreateInvite = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await authFetch("/api/convites/", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inviteForm,
          ministerio_id: Number(inviteForm.ministerio_id),
          nivel_acesso: Number(inviteForm.nivel_acesso),
          max_uses: Number(inviteForm.max_uses),
          expires_at: inviteForm.expires_at || null,
        }),
      });
      setNotice("Convite gerado com sucesso.");
      setInviteForm((current) => ({ ...INITIAL_INVITE_FORM, ministerio_id: current.ministerio_id }));
      loadDashboard();
    } catch (err) {
      setError(err.message || "Nao foi possivel gerar o convite.");
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Carregando painel global...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="lauda-page-header admin-page-header">
        <div className="page-title-group">
          <h2 className="text-primary admin-page-title">
            <Shield size={28} /> Painel Global
          </h2>
          <p className="text-muted">
            Administracao central de ministerios, convites e metricas da plataforma.
          </p>
        </div>
        <div className="admin-user-summary">
          <strong>@{user?.username}</strong>
          <span>Administrador global</span>
        </div>
      </div>

      {notice && <div className="status-alert status-alert--success">{notice}</div>}
      {error && <div className="status-alert status-alert--error">{error}</div>}

      <div className="dashboard-grid admin-stats-grid">
        {stats.map((item) => (
          <div key={item.label} className="lauda-card stat-card admin-stat-card">
            <div className="admin-stat-icon">{createElement(item.icon, { size: 18 })}</div>
            <h3>{item.value}</h3>
            <p>{item.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-layout-grid">
        <section className="lauda-card admin-form-card">
          <div className="admin-section-header">
            <h3>
              <Plus size={18} /> Novo ministerio
            </h3>
          </div>
          <form className="stack-md" onSubmit={handleCreateMinistry}>
            <div className="form-col">
              <label className="input-label" htmlFor="admin-ministry-name">
                Nome do ministerio
              </label>
              <input
                id="admin-ministry-name"
                className="input-field"
                value={ministryForm.nome}
                onChange={(event) =>
                  setMinistryForm((current) => ({
                    ...current,
                    nome: event.target.value,
                    slug: current.slug || slugify(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="form-col">
              <label className="input-label" htmlFor="admin-ministry-slug">
                Slug
              </label>
              <input
                id="admin-ministry-slug"
                className="input-field"
                value={ministryForm.slug}
                onChange={(event) => setMinistryForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                required
              />
            </div>
            <button type="submit" className="lauda-btn lauda-btn-primary">
              Criar ministerio
            </button>
          </form>
        </section>

        <section className="lauda-card admin-form-card">
          <div className="admin-section-header">
            <h3>
              <Send size={18} /> Gerar convite
            </h3>
          </div>
          <form className="stack-md" onSubmit={handleCreateInvite}>
            <div className="form-col">
              <label className="input-label" htmlFor="invite-ministry">
                Ministerio
              </label>
              <select
                id="invite-ministry"
                className="input-field"
                value={inviteForm.ministerio_id}
                onChange={(event) => setInviteForm((current) => ({ ...current, ministerio_id: event.target.value }))}
                required
              >
                <option value="">Selecione</option>
                {ministerios.map((ministerio) => (
                  <option key={ministerio.id} value={ministerio.id}>
                    {ministerio.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-col form-col-md">
                <label className="input-label" htmlFor="invite-email">
                  E-mail
                </label>
                <input
                  id="invite-email"
                  className="input-field"
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="form-col form-col-md">
                <label className="input-label" htmlFor="invite-name">
                  Nome do convidado
                </label>
                <input
                  id="invite-name"
                  className="input-field"
                  value={inviteForm.nome_convidado}
                  onChange={(event) => setInviteForm((current) => ({ ...current, nome_convidado: event.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-col form-col-md">
                <label className="input-label" htmlFor="invite-access-level">
                  Nivel de acesso
                </label>
                <select
                  id="invite-access-level"
                  className="input-field"
                  value={inviteForm.nivel_acesso}
                  onChange={(event) => setInviteForm((current) => ({ ...current, nivel_acesso: event.target.value }))}
                >
                  <option value={1}>Administrador</option>
                  <option value={2}>Lider de Louvor</option>
                  <option value={3}>Membro</option>
                </select>
              </div>
              <div className="form-col form-col-md">
                <label className="input-label" htmlFor="invite-max-uses">
                  Maximo de usos
                </label>
                <input
                  id="invite-max-uses"
                  className="input-field"
                  type="number"
                  min="1"
                  value={inviteForm.max_uses}
                  onChange={(event) => setInviteForm((current) => ({ ...current, max_uses: event.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="lauda-btn lauda-btn-primary">
              Gerar convite
            </button>
          </form>
        </section>
      </div>

      <div className="admin-layout-grid admin-layout-grid--table">
        <section className="lauda-card admin-table-card">
          <div className="admin-section-header">
            <h3>
              <Building2 size={18} /> Ministerios cadastrados
            </h3>
          </div>
          <div className="lauda-table-container">
            <table className="lauda-table">
              <thead>
                <tr>
                  <th>Ministerio</th>
                  <th>Slug</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ministerios.map((ministerio) => (
                  <tr key={ministerio.id}>
                    <td data-label="Ministerio">{ministerio.nome}</td>
                    <td data-label="Slug">{ministerio.slug}</td>
                    <td data-label="Status">
                      <span className={`badge ${ministerio.is_active ? "badge-primary" : "badge-gray"}`}>
                        {ministerio.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lauda-card admin-table-card">
          <div className="admin-section-header">
            <h3>
              <Send size={18} /> Convites recentes
            </h3>
          </div>
          <div className="lauda-table-container">
            <table className="lauda-table">
              <thead>
                <tr>
                  <th>Ministerio</th>
                  <th>Codigo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {convites.slice(0, 8).map((invite) => (
                  <tr key={invite.id}>
                    <td data-label="Ministerio">{invite.ministerio.nome}</td>
                    <td data-label="Codigo">{invite.access_code}</td>
                    <td data-label="Status">{invite.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
