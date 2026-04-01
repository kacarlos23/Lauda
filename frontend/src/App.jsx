import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import {
  Calendar,
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

// Importando as páginas extraídas
import Dashboard from "./pages/Dashboard";
import Auditoria from "./pages/Auditoria";
import Cultos from "./pages/Cultos";
import Login from "./pages/Login";
import Membros from "./pages/Membros";
import Musicas from "./pages/Musicas";
import Perfil from "./pages/Perfil";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState("");
  const minSwipeDistance = 50;

  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const settingsLinks = useMemo(
    () => ["Sugerir Melhorias", "Termos de Uso", "Política de Privacidade"],
    [],
  );

  useEffect(() => {
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const urlLimpa = baseUrl.replace(/\/$/, "");

    fetch(`${urlLimpa}/api/usuarios/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setIsAdmin(res.ok))
      .catch(() => setIsAdmin(false));
  }, [token]);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const handleSettingsLinkClick = (label) => {
    setSettingsNotice(`${label} ainda não está disponível nesta versão.`);
  };

  const onTouchStart = (event) => {
    setTouchEnd(null);
    setTouchStart(event.targetTouches[0].clientX);
  };

  const onTouchMove = (event) => {
    setTouchEnd(event.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || window.innerWidth > 768) return;

    const distance = touchStart - touchEnd;

    if (distance < -minSwipeDistance && touchStart < 50) setIsMenuOpen(true);
    if (distance > minSwipeDistance && isMenuOpen) setIsMenuOpen(false);
  };

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <BrowserRouter>
      <div
        className="lauda-wrapper"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className={`sidebar-overlay ${isMenuOpen ? "open" : ""}`}
          onClick={closeMenu}
          aria-label="Fechar menu lateral"
        />

        <aside
          className={`lauda-sidebar ${isMenuOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}
          aria-label="Navegação principal"
        >
          <div className="lauda-sidebar-top">
            <nav className="lauda-nav">
              <NavLink
                to="/"
                className="lauda-nav-item"
                onClick={closeMenu}
                end
              >
                <span className="nav-icon" aria-hidden="true">
                  <Home size={20} />
                </span>
                <span className="nav-text">Dashboard</span>
              </NavLink>

              <NavLink
                to="/musicas"
                className="lauda-nav-item"
                onClick={closeMenu}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Music2 size={20} />
                </span>
                <span className="nav-text">Músicas</span>
              </NavLink>

              <NavLink
                to="/cultos"
                className="lauda-nav-item"
                onClick={closeMenu}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Calendar size={20} />
                </span>
                <span className="nav-text">Cultos</span>
              </NavLink>

              {isAdmin && (
                <>
                  <NavLink
                    to="/membros"
                    className="lauda-nav-item"
                    onClick={closeMenu}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      <Users size={20} />
                    </span>
                    <span className="nav-text">Membros</span>
                  </NavLink>

                  <NavLink
                    to="/auditoria"
                    className="lauda-nav-item"
                    onClick={closeMenu}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      <Shield size={20} />
                    </span>
                    <span className="nav-text">Auditoria</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="lauda-sidebar-bottom">
            <NavLink
              to="/perfil"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              <span className="nav-icon" aria-hidden="true">
                <User size={20} />
              </span>
              <span className="nav-text">Meu Perfil</span>
            </NavLink>

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
              <span className="nav-text">Configurações</span>
            </button>

            <button
              type="button"
              className="lauda-nav-item sidebar-logout-item"
              onClick={handleLogout}
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
              <h1>
                <Music
                  size={22}
                  aria-hidden="true"
                  className="header-title-icon"
                />
                <span
                  className="header-title-text"
                  data-short="Lauda"
                  data-full="Lauda - Gerenciamento de Cultos e Músicas"
                >
                  Lauda - Gerenciamento de Cultos e Músicas
                </span>
              </h1>
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

              <button
                type="button"
                onClick={handleLogout}
                className="lauda-btn lauda-btn-secondary logout-btn header-logout-btn"
              >
                <LogOut size={16} aria-hidden="true" /> Sair
              </button>
            </div>
          </header>

          <div className="lauda-content">
            <Routes>
              {/* O componente Dashboard limpo sendo importado aqui */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/musicas" element={<Musicas />} />
              <Route path="/cultos" element={<Cultos />} />
              <Route path="/membros" element={<Membros />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/auditoria" element={<Auditoria />} />
            </Routes>
          </div>
        </main>
      </div>

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
                <Settings size={22} aria-hidden="true" /> Configurações
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="modal-close"
                aria-label="Fechar configurações"
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

                <div className="settings-row">
                  <label className="settings-label" htmlFor="settings-language">
                    Idioma do Sistema
                  </label>
                  <select
                    id="settings-language"
                    className="input-field settings-inline-select"
                    defaultValue="pt-BR"
                  >
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div className="settings-row">
                  <span className="settings-label">Notificações de Escala</span>
                  <label
                    className="checkbox-control"
                    htmlFor="settings-notifications"
                  >
                    <input
                      id="settings-notifications"
                      type="checkbox"
                      defaultChecked
                    />
                    <span>Ativas</span>
                  </label>
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

              <div className="settings-danger-zone">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="lauda-btn lauda-btn-danger"
                >
                  <LogOut size={16} aria-hidden="true" /> Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
