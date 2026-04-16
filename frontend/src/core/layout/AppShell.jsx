import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { authFetch } from "../../lib/api";
import { canAccessReactAdmin, resolveMemberDestination } from "../auth/access";
import {
  buildAdminNavigation,
  buildMemberNavigation,
} from "../navigation/appNavigation";
import "./AppShell.css";

export function AppShell({ variant }) {
  const { user, token, logout, impersonateMinistry, hasModule, activeModules } =
    useAuth();
  const permissions = usePermissions(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [scopeNotice, setScopeNotice] = useState("");
  const [globalMinistries, setGlobalMinistries] = useState([]);
  const [isSwitchingScope, setIsSwitchingScope] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const settingsLinks = useMemo(
    () => ["Sugerir Melhorias", "Termos de Uso", "Politica de Privacidade"],
    [],
  );

  const isGlobalAdmin = variant === "admin";
  const isImpersonating = Boolean(user?.is_global_admin && user?.ministerio_id);
  const hasReactAdminAccess = canAccessReactAdmin(user);
  const churchName = user?.igreja_nome || "Igreja";
  const ministryName = user?.ministerio_nome || "Ministerio";
  const shellTitle = isGlobalAdmin ? "Painel Global" : churchName;
  const shellSubtitle = isGlobalAdmin
    ? isImpersonating
      ? `Atuando em ${ministryName}`
      : "Gestao multi-ministerio"
    : user?.ministerio_id
      ? `${ministryName} · ${activeModules.length || 0} modulo(s) ativo(s)`
      : "Area institucional";
  const HeaderTitleIcon = isGlobalAdmin ? Shield : Home;
  const headerTitleText = isGlobalAdmin
    ? "Painel Administrativo"
    : "Plataforma Lauda";
  const navSections = isGlobalAdmin
    ? buildAdminNavigation()
    : buildMemberNavigation({
        activeModules,
        permissions,
        hasModule,
        hasReactAdminAccess,
      });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (!user?.is_global_admin || !token) {
      setGlobalMinistries([]);
      setScopeNotice("");
      return;
    }

    let isMounted = true;
    setScopeNotice("");

    authFetch("/api/ministerios/", token)
      .then((data) => {
        if (isMounted) {
          setGlobalMinistries(data);
        }
      })
      .catch((error) => {
        if (error.status === 401) {
          logout();
          return;
        }

        if (isMounted) {
          setScopeNotice(
            error.message || "Nao foi possivel carregar os ministerios.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [logout, token, user?.is_global_admin]);

  const toggleMenu = () => {
    if (window.innerWidth <= 768) {
      setIsMenuOpen((value) => !value);
      return;
    }
    setIsSidebarCollapsed((value) => !value);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleSettingsLinkClick = (label) => {
    setSettingsNotice(`${label} ainda nao esta disponivel nesta versao.`);
  };

  const handleScopeChange = async (event) => {
    const nextMinistryId = event.target.value || null;
    setScopeNotice("");
    setIsSwitchingScope(true);

    try {
      const nextSession = await impersonateMinistry(nextMinistryId);
      closeMenu();
      navigate(resolveMemberDestination(nextSession), { replace: true });
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }

      setScopeNotice(error.message || "Nao foi possivel trocar o escopo.");
    } finally {
      setIsSwitchingScope(false);
    }
  };

  return (
    <div className="lauda-shell">
      {isMenuOpen ? (
        <button
          type="button"
          className="lauda-shell__overlay"
          onClick={closeMenu}
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <aside
        className={[
          "lauda-shell__sidebar",
          isMenuOpen ? "is-open" : "",
          isSidebarCollapsed ? "is-collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Navegacao principal"
      >
        <div className="lauda-shell__brand">
          <div className="lauda-shell__brand-mark">
            {isGlobalAdmin ? <Shield size={18} /> : <Building2 size={18} />}
          </div>
          {!isSidebarCollapsed ? (
            <div className="lauda-shell__brand-copy">
              <span className="lauda-shell__eyebrow">
                {isGlobalAdmin ? "Painel central" : "Ministerio"}
              </span>
              <strong>{shellTitle}</strong>
              <span>{shellSubtitle}</span>
            </div>
          ) : null}
        </div>

        <div className="lauda-shell__nav">
          {navSections.map((section) => (
            <section key={section.id} className="lauda-shell__nav-section">
              {!isSidebarCollapsed ? (
                <h4 className="lauda-shell__nav-title">{section.title}</h4>
              ) : null}
              <div className="lauda-shell__nav-items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        "lauda-shell__nav-link",
                        isActive ? "is-active" : "",
                        isSidebarCollapsed ? "is-icon-only" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                    onClick={() => {
                      if (window.innerWidth <= 768) {
                        closeMenu();
                      }
                    }}
                  >
                    {createElement(item.icon, {
                      className: "lauda-shell__nav-icon",
                    })}
                    {!isSidebarCollapsed ? (
                      <span className="lauda-shell__nav-label">{item.label}</span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="lauda-shell__sidebar-footer">
          <button
            type="button"
            className={[
              "lauda-shell__utility-button",
              isSidebarCollapsed ? "is-icon-only" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setSettingsNotice("");
              setIsSettingsOpen(true);
              closeMenu();
            }}
          >
            <Settings className="lauda-shell__nav-icon" />
            {!isSidebarCollapsed ? <span>Configuracoes</span> : null}
          </button>

          <button
            type="button"
            className={[
              "lauda-shell__utility-button",
              "is-danger",
              isSidebarCollapsed ? "is-icon-only" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={logout}
          >
            <LogOut className="lauda-shell__nav-icon" />
            {!isSidebarCollapsed ? <span>Sair</span> : null}
          </button>
        </div>
      </aside>

      <main className="lauda-shell__main">
        <header className="lauda-shell__topbar">
          <div className="lauda-shell__topbar-left">
            <button
              type="button"
              className="lauda-shell__icon-button"
              onClick={toggleMenu}
              aria-label={
                window.innerWidth <= 768
                  ? "Abrir menu lateral"
                  : "Recolher menu lateral"
              }
            >
              {window.innerWidth <= 768 ? (
                <Menu size={18} />
              ) : isSidebarCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>

            <div className="lauda-shell__title-group">
              <span className="lauda-shell__eyebrow">Workspace</span>
              <div className="lauda-shell__title-row">
                <HeaderTitleIcon size={18} />
                <strong>{headerTitleText}</strong>
              </div>
              <span className="lauda-shell__subtitle">{shellSubtitle}</span>
            </div>
          </div>

          <div className="lauda-shell__topbar-right">
            <button
              type="button"
              onClick={() => setIsDarkMode((value) => !value)}
              className="lauda-shell__icon-button"
              aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="lauda-shell__profile">
              <span className="lauda-shell__profile-handle">
                @{user?.username || "usuario"}
              </span>
              <span className="lauda-shell__profile-meta">{ministryName}</span>
            </div>
          </div>
        </header>

        <div
          className="lauda-shell__page"
          data-route={location.pathname}
        >
          {user?.is_global_admin ? (
            <section className="lauda-shell__scope-card">
              <div className="lauda-shell__scope-copy">
                <h3>
                  <Shield size={18} />
                  {isImpersonating ? "Impersonate ativo" : "Visao global ativa"}
                </h3>
                <p>
                  {isImpersonating
                    ? `Operando no contexto de ${ministryName}.`
                    : "Selecione um ministerio para abrir o painel operacional com escopo local."}
                </p>
              </div>

              <select
                className="lauda-shell__scope-select"
                value={user?.ministerio_id || ""}
                onChange={handleScopeChange}
                disabled={isSwitchingScope}
              >
                <option value="">Visao global</option>
                {globalMinistries.map((ministerio) => (
                  <option key={ministerio.id} value={ministerio.id}>
                    {ministerio.nome}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          {scopeNotice ? (
            <div className="status-alert status-alert--error">{scopeNotice}</div>
          ) : null}

          <Outlet />
        </div>
      </main>

      {isSettingsOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal modal-compact lauda-shell__settings-modal">
            <div className="modal-header">
              <h3 className="modal-title">
                <Settings size={18} />
                Configuracoes
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="modal-close"
                aria-label="Fechar configuracoes"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {settingsNotice ? (
                <div className="status-alert lauda-shell__settings-notice">
                  {settingsNotice}
                </div>
              ) : null}

              <div className="lauda-shell__settings-row">
                <div>
                  <strong>Modo de exibicao</strong>
                  <span>Alterna entre visual claro e escuro.</span>
                </div>
                <button
                  type="button"
                  className="lauda-btn lauda-btn-secondary"
                  onClick={() => setIsDarkMode((value) => !value)}
                >
                  {isDarkMode ? "Ativar claro" : "Ativar escuro"}
                </button>
              </div>

              <div className="lauda-shell__settings-links">
                {settingsLinks.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="lauda-shell__settings-link"
                    onClick={() => handleSettingsLinkClick(label)}
                  >
                    {label}
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
