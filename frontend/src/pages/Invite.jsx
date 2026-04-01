import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, KeyRound, Mail, Music, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import "./Invite.css";

const INITIAL_FORM = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  telefone: "",
  funcao_principal: "",
};

export default function Invite() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [invite, setInvite] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [manualCode, setManualCode] = useState(code);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    apiFetch(`/api/auth/invites/${code}/`)
      .then((data) => {
        setInvite(data);
        setFormData((current) => ({
          ...current,
          email: data.email || current.email,
        }));
      })
      .catch((err) => setError(err.message || "Nao foi possivel carregar o convite."))
      .finally(() => setLoading(false));
  }, [code]);

  const accessLabel = useMemo(() => {
    if (!invite) return "Convite";
    return invite.nome_convidado || invite.email || invite.access_code;
  }, [invite]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleAcceptInvite = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const session = await apiFetch("/api/auth/invites/accept/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, code: code || manualCode }),
      });

      login(session);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message || "Nao foi possivel aceitar o convite.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) {
      setError("Informe um codigo de acesso valido.");
      return;
    }

    navigate(`/invite/${manualCode.trim()}`);
  };

  return (
    <main className="invite-page-wrapper">
      <div className="invite-panel lauda-card">
        <div className="invite-hero">
          <div className="invite-badge">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Convite de ministério</span>
          </div>
          <h1>Entrada por convite</h1>
          <p>
            Use o link recebido ou informe o código manual para entrar em um ministério específico.
          </p>
        </div>

        <div className="invite-lookup">
          <label className="input-label" htmlFor="invite-code">
            Código de acesso
          </label>
          <div className="invite-lookup-row">
            <input
              id="invite-code"
              type="text"
              className="input-field"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.toUpperCase())}
              placeholder="ABC123XYZ"
            />
            <button type="button" className="lauda-btn lauda-btn-secondary" onClick={handleManualLookup}>
              Validar código
            </button>
          </div>
        </div>

        {loading && <div className="invite-loading">Carregando convite...</div>}

        {error && !loading && <div className="status-alert status-alert--error">{error}</div>}

        {invite && !loading && (
          <div className="invite-content-grid">
            <section className="invite-summary">
              <div className="invite-ministry-card">
                <Music size={24} aria-hidden="true" />
                <div>
                  <strong>{invite.ministerio.nome}</strong>
                  <span>{accessLabel}</span>
                </div>
              </div>

              <ul className="invite-meta-list">
                <li>
                  <span>Código manual</span>
                  <strong>{invite.access_code}</strong>
                </li>
                <li>
                  <span>Status</span>
                  <strong>{invite.status}</strong>
                </li>
                <li>
                  <span>Usos</span>
                  <strong>
                    {invite.uses_count}/{invite.max_uses}
                  </strong>
                </li>
              </ul>
            </section>

            <form onSubmit={handleAcceptInvite} className="invite-form">
              <div className="form-group">
                <label className="input-label" htmlFor="first_name">
                  Nome
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  className="input-field"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-col form-col-md">
                  <label className="input-label" htmlFor="last_name">
                    Sobrenome
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    className="input-field"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-col form-col-md">
                  <label className="input-label" htmlFor="funcao_principal">
                    Função principal
                  </label>
                  <input
                    id="funcao_principal"
                    name="funcao_principal"
                    className="input-field"
                    value={formData.funcao_principal}
                    onChange={handleChange}
                    placeholder="Vocal, guitarra, teclado..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-col form-col-md">
                  <label className="input-label" htmlFor="username">
                    Usuário
                  </label>
                  <div className="input-with-icon">
                    <UserRound size={16} aria-hidden="true" />
                    <input
                      id="username"
                      name="username"
                      className="input-field"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-col form-col-md">
                  <label className="input-label" htmlFor="password">
                    Senha
                  </label>
                  <div className="input-with-icon">
                    <KeyRound size={16} aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="input-field"
                      value={formData.password}
                      onChange={handleChange}
                      minLength={8}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-col form-col-md">
                  <label className="input-label" htmlFor="email">
                    E-mail
                  </label>
                  <div className="input-with-icon">
                    <Mail size={16} aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="input-field"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-col form-col-md">
                  <label className="input-label" htmlFor="telefone">
                    Telefone
                  </label>
                  <input
                    id="telefone"
                    name="telefone"
                    className="input-field"
                    value={formData.telefone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button type="submit" className="lauda-btn lauda-btn-primary invite-submit-btn" disabled={submitting}>
                {submitting ? "Entrando..." : "Aceitar convite"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

