import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Home,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
} from "lucide-react";

import MinistryNameLink from "../../components/MinistryNameLink";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { authFetch } from "../../lib/api";
import { canAccessReactAdmin, resolveMemberDestination } from "../auth/access";
import { buildAdminNavigation, buildMemberNavigation } from "../navigation/appNavigation";

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
    () => ["Sugerir Melhorias", "Termos de Uso", "Política de Privacidade"],
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
      navigate(
        resolveMemberDestination(nextSession),
        { replace: true },
      );
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
    <div className="lauda-wrapper">
      <button
        type="button"
        className={`sidebar-overlay ${isMenuOpen ? "open" : ""}`}
        onClick={closeMenu}
        aria-label="Fechar menu lateral"
      />

      <aside
        className={`lauda-sidebar ${isMenuOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}
        aria-label="Navegacao principal"
      >
        <div className="lauda-sidebar-top">
          <div className="sidebar-brand-block">
            <span className="sidebar-brand-kicker">
              {isGlobalAdmin ? "Admin" : "Ministerio"}
            </span>
            {permissions.canViewMinistrySettings ? (
              <MinistryNameLink
                to="/app/ministerio/configuracoes"
                className="ministry-route-link"
              >
                <strong>{shellTitle}</strong>
              </MinistryNameLink>
            ) : (
              <strong>{shellTitle}</strong>
            )}
          </div>

          {navSections.map((section) => (
            <div key={section.id} className="lauda-nav-section">
              <span className="sidebar-brand-kicker">{section.title}</span>
              <nav className="lauda-nav">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="lauda-nav-item"
                    onClick={closeMenu}
                    end={item.end}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {createElement(item.icon, { size: 20 })}
                    </span>
                    <span className="nav-text">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="lauda-sidebar-bottom">
          {!isGlobalAdmin &&
            (permissions.canViewMinistrySettings ? (
              <MinistryNameLink
                to="/app/ministerio/configuracoes"
                className="sidebar-ministry-chip ministry-route-link"
              >
                <Building2 size={16} aria-hidden="true" />
                <span>{ministryName}</span>
              </MinistryNameLink>
            ) : (
              <div className="sidebar-ministry-chip">
                <Building2 size={16} aria-hidden="true" />
                <span>{ministryName}</span>
              </div>
            ))}

          <button
            type="button"
            className="lauda-nav-item"
            onClick={() => {
              setSettingsNotice("");
              setIsSettingsOpen(true);
              closeMenu();
            }}
          >
            <span className="nav-icon" aria-hidden="true">
              <Settings size={20} />
            </span>
            <span className="nav-text">Configuracoes</span>
          </button>

          <button
            type="button"
            className="lauda-nav-item sidebar-logout-item"
            onClick={logout}
          >
            <span className="nav-icon" aria-hidden="true">
              <LogOut size={20} />
            </span>
            <span className="nav-text">Sair</span>
          </button>
        </div>
      </aside>

      <main className="lauda-main-zone">
        <header className="lauda-header">
          <div className="lauda-header-left">
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={toggleMenu}
              aria-label="Alternar menu lateral"
            >
              <Menu size={22} />
            </button>
            <div className="header-brand-stack">
              <h1>
                <HeaderTitleIcon
                  size={22}
                  aria-hidden="true"
                  className="header-title-icon"
                />
                <span className="header-title-text">{headerTitleText}</span>
              </h1>
              {permissions.canViewMinistrySettings ? (
                <MinistryNameLink
                  to="/app/ministerio/configuracoes"
                  className="header-context-line ministry-route-link"
                >
                  {shellTitle} · {shellSubtitle}
                </MinistryNameLink>
              ) : (
                <span className="header-context-line">
                  {shellTitle} · {shellSubtitle}
                </span>
              )}
            </div>
          </div>

          <div className="lauda-user-profile">
            <button
              type="button"
              onClick={() => setIsDarkMode((value) => !value)}
              className="theme-toggle-btn"
              aria-label={
                isDarkMode ? "Ativar tema claro" : "Ativar tema escuro"
              }
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="header-session-chip">
              <strong>@{user?.username}</strong>
              <span>
                {isGlobalAdmin
                  ? isImpersonating
                    ? `Admin global · ${ministryName}`
                    : "Admin global"
                  : ministryName}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="lauda-btn lauda-btn-secondary logout-btn header-logout-btn"
            >
              <LogOut size={16} aria-hidden="true" /> Sair
            </button>
          </div>
        </header>

        <div className="lauda-content" data-route={location.pathname}>
          {user?.is_global_admin && (
            <section className="lauda-card global-scope-card">
              <div className="global-scope-copy">
                <strong>
                  {isImpersonating ? "Impersonate ativo" : "Visao global ativa"}
                </strong>
                <span>
                  {isImpersonating
                    ? `Operando no contexto de ${ministryName}.`
                    : "Selecione um ministerio para abrir o painel operacional com escopo local."}
                </span>
              </div>

              <div className="global-scope-actions">
                <select
                  className="input-field global-scope-select"
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
              </div>
            </section>
          )}

          {scopeNotice && (
            <div className="status-alert status-alert--error">{scopeNotice}</div>
          )}

          <Outlet />
        </div>
      </main>

      {isSettingsOpen && (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal modal-compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="modal-header">
              <h3
                id="settings-title"
                className="modal-title settings-modal-title"
              >
                <Settings size={22} aria-hidden="true" /> Configuracoes
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

            <div className="modal-body settings-modal-body">
              {settingsNotice && (
                <div
                  className="status-alert status-alert--success settings-note"
                  aria-live="polite"
                >
                  {settingsNotice}
                </div>
              )}

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">Modo Escuro</span>
                  <button
                    type="button"
                    onClick={() => setIsDarkMode((value) => !value)}
                    className="lauda-btn lauda-btn-secondary settings-inline-btn"
                  >
                    {isDarkMode ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>

              <hr className="modal-divider" />

              <div className="settings-link-list">
                {settingsLinks.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`lauda-btn lauda-btn-secondary settings-link-btn ${index === 0 ? "settings-link-highlight" : "settings-link-plain"}`}
                    onClick={() => handleSettingsLinkClick(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
