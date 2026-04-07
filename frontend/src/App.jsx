import { createElement, useEffect, useMemo, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  Building2,
  Calendar,
  FolderKanban,
  Home,
  LogOut,
  Menu,
  Moon,
  Music,
  Music2,
  Settings,
  Shield,
  Sun,
  User,
  Users,
} from "lucide-react";
import "./App.css";
import MinistryNameLink from "./components/MinistryNameLink";
import { useAuth } from "./context/AuthContext";
import { usePermissions } from "./hooks/usePermissions";
import {
  buildInvitePath,
  buildLoginPath,
  getAccessCodeFromSearch,
} from "./lib/accessCode";
import { authFetch } from "./lib/api";
import AdminDashboard from "./pages/AdminDashboard";
import Auditoria from "./pages/Auditoria";
import ClassificacoesMusicais from "./pages/ClassificacoesMusicais";
import Cultos from "./pages/Cultos";
import Dashboard from "./pages/Dashboard";
import EnterCode from "./pages/EnterCode";
import Equipes from "./pages/Equipes";
import Invite from "./pages/Invite";
import Login from "./pages/Login";
import Membros from "./pages/Membros";
import MinisterioConfiguracoes from "./pages/MinisterioConfiguracoes";
import Musicas from "./pages/Musicas";
import Perfil from "./pages/Perfil";

function App() {
  const { session, logout, updateUser } = useAuth();

  useEffect(() => {
    if (!session?.access) {
      return;
    }

    authFetch("/api/usuarios/me/", session.access)
      .then((profile) => {
        updateUser(profile);
      })
      .catch((error) => {
        if (
          error.status === 401 ||
          error.message?.toLowerCase().includes("token")
        ) {
          logout();
        }
      });
  }, [logout, session?.access, updateUser]);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<MemberLoginRoute />} />
      <Route path="/admin/login" element={<AdminLoginRoute />} />
      <Route path="/invite" element={<Invite />} />
      <Route path="/invite/:code" element={<Invite />} />

      <Route element={<RequireUnboundMemberRoute />}>
        <Route path="/enter-code" element={<EnterCode />} />
      </Route>

      <Route element={<RequireMemberRoute />}>
        <Route element={<AppShell variant="member" />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/musicas" element={<Musicas />} />
          <Route path="/app/cultos" element={<Cultos />} />
          <Route path="/app/equipes" element={<Equipes />} />
          <Route
            path="/app/ministerio/configuracoes"
            element={<MinisterioConfiguracoes />}
          />
          <Route
            path="/app/ministerio/classificacoes"
            element={<ClassificacoesMusicais />}
          />
          <Route path="/app/membros" element={<Membros />} />
          <Route path="/app/perfil" element={<Perfil />} />
          <Route path="/app/auditoria" element={<Auditoria />} />
        </Route>
      </Route>

      <Route element={<RequireAdminRoute />}>
        <Route element={<AppShell variant="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/membros" element={<Membros />} />
          <Route path="/admin/auditoria" element={<Auditoria />} />
          <Route path="/admin/perfil" element={<Perfil />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function resolveMemberDestination(session, search = "") {
  if (!session) {
    return buildLoginPath(getAccessCodeFromSearch(search));
  }

  if (session.user?.is_global_admin) {
    return "/admin";
  }

  if (session.user?.ministerio_id) {
    return "/app";
  }

  const requestedCode = getAccessCodeFromSearch(search);
  return requestedCode ? buildInvitePath(requestedCode) : "/enter-code";
}

function RootRedirect() {
  const { session } = useAuth();
  const location = useLocation();

  return (
    <Navigate to={resolveMemberDestination(session, location.search)} replace />
  );
}

function MemberLoginRoute() {
  const { session } = useAuth();
  const location = useLocation();

  if (session) {
    return (
      <Navigate
        to={resolveMemberDestination(session, location.search)}
        replace
      />
    );
  }

  return <Login mode="member" />;
}

function AdminLoginRoute() {
  const { session } = useAuth();

  if (!session) {
    return <Login mode="admin" />;
  }

  if (session.user?.is_global_admin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Navigate
      to={session.user?.ministerio_id ? "/app" : "/enter-code"}
      replace
    />
  );
}

function RequireMemberRoute() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return (
      <Navigate
        to={buildLoginPath(getAccessCodeFromSearch(location.search))}
        replace
      />
    );
  }

  if (session.user?.is_global_admin) {
    return <Navigate to="/admin" replace />;
  }

  if (!session.user?.ministerio_id) {
    return <Navigate to="/enter-code" replace />;
  }

  return <Outlet />;
}

function RequireAdminRoute() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!session.user?.is_global_admin) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

function RequireUnboundMemberRoute() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user?.is_global_admin) {
    return <Navigate to="/admin" replace />;
  }

  if (session.user?.ministerio_id) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

function AppShell({ variant }) {
  const { user, logout } = useAuth();
  const permissions = usePermissions(user);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const settingsLinks = useMemo(
    () => ["Sugerir Melhorias", "Termos de Uso", "Política de Privacidade"],
    [],
  );

  const isGlobalAdmin = variant === "admin";
  const ministryName = user?.ministerio_nome || "Ministerio";
  const shellTitle = isGlobalAdmin ? "Painel Global" : ministryName;
  const shellSubtitle = isGlobalAdmin
    ? "Gestao multi-ministerio"
    : "Aplicacao do ministerio";

  const navItems = isGlobalAdmin
    ? [
        { to: "/admin", label: "Dashboard", icon: Home, end: true },
        { to: "/admin/membros", label: "Usuarios", icon: Users },
        { to: "/admin/auditoria", label: "Auditoria", icon: Shield },
        { to: "/admin/perfil", label: "Meu Perfil", icon: User },
      ]
    : [
        { to: "/app", label: "Dashboard", icon: Home, end: true },
        { to: "/app/musicas", label: "Musicas", icon: Music2 },
        { to: "/app/cultos", label: "Cultos", icon: Calendar },
        { to: "/app/equipes", label: "Equipes", icon: FolderKanban },
        ...(permissions.isMinistryAdmin
          ? [
              { to: "/app/membros", label: "Membros", icon: Users },
              { to: "/app/auditoria", label: "Auditoria", icon: Shield },
            ]
          : []),
        { to: "/app/perfil", label: "Meu Perfil", icon: User },
      ];

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

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

          <nav className="lauda-nav">
            {navItems.map((item) => (
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
                <Music
                  size={22}
                  aria-hidden="true"
                  className="header-title-icon"
                />
                <span className="header-title-text">Ministerio de Louvor</span>
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
              <span>{isGlobalAdmin ? "Admin global" : ministryName}</span>
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

export default App;
