import { ArrowRight, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildLoginPath, getAccessCodeFromSearch, normalizeAccessCode } from "../lib/accessCode";
import { authFetch } from "../lib/api";
import "./Invite.css";

export default function Invite() {
  const { code: routeCode = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, token, login } = useAuth();
  const [error, setError] = useState("");
  const [isBinding, setIsBinding] = useState(false);

  const accessCode = useMemo(() => {
    const queryCode = getAccessCodeFromSearch(location.search);
    return normalizeAccessCode(routeCode || queryCode);
  }, [location.search, routeCode]);

  useEffect(() => {
    if (!accessCode) {
      setError("Nenhum codigo de acesso foi informado.");
      return;
    }

    if (!session) {
      navigate(buildLoginPath(accessCode), { replace: true });
      return;
    }

    if (session.user?.is_global_admin) {
      setError("Admins globais nao utilizam vinculos por codigo de ministerio.");
      return;
    }

    if (session.user?.ministerio_id) {
      navigate("/app", { replace: true });
      return;
    }

    let isMounted = true;

    const bindCode = async () => {
      try {
        setIsBinding(true);
        setError("");
        const nextSession = await authFetch("/api/auth/access-code/bind/", token, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: accessCode }),
        });

        if (!isMounted) {
          return;
        }

        login(nextSession);
        navigate("/app", { replace: true });
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || "Nao foi possivel concluir a vinculacao.");
        }
      } finally {
        if (isMounted) {
          setIsBinding(false);
        }
      }
    };

    bindCode();

    return () => {
      isMounted = false;
    };
  }, [accessCode, login, navigate, session, token]);

  return (
    <main className="invite-page-wrapper">
      <div className="invite-panel lauda-card invite-binding-panel">
        <div className="invite-hero">
          <div className="invite-badge">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Link de convite</span>
          </div>
          <h1>Vinculando sua conta</h1>
          <p>
            O codigo <strong>{accessCode || "--"}</strong> sera aplicado a sua conta assim que a
            autenticacao for confirmada.
          </p>
        </div>

        <section className="invite-summary invite-binding-summary">
          <div className="invite-ministry-card">
            <KeyRound size={24} aria-hidden="true" />
            <div>
              <strong>{isBinding ? "Validando codigo de acesso" : "Fluxo de vinculacao"}</strong>
              <span>
                {isBinding
                  ? "Aguarde enquanto conectamos sua conta ao ministerio."
                  : "Entre com sua conta para concluir a entrada por codigo."}
              </span>
            </div>
          </div>

          {error ? (
            <div className="status-alert status-alert--error">{error}</div>
          ) : (
            <div className="invite-loading">Validando permissao e codigo informado...</div>
          )}

          <div className="invite-binding-actions">
            {!session && (
              <Link to={buildLoginPath(accessCode)} className="lauda-btn lauda-btn-primary invite-link-action">
                <LogIn size={16} aria-hidden="true" /> Entrar para continuar
              </Link>
            )}
            {session && !session.user?.ministerio_id && (
              <button
                type="button"
                className="lauda-btn lauda-btn-secondary invite-link-action"
                onClick={() => navigate(`/enter-code?code=${encodeURIComponent(accessCode)}`)}
              >
                Inserir codigo manualmente <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
