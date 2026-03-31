import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
// NOVO: Importando os ícones do Lucide React
import {
  Music,
  Home,
  Music2,
  Calendar,
  Users,
  Menu,
  Sun,
  Moon,
  LogOut,
  Shield,
  Settings,
  User,
} from "lucide-react";
import "./App.css";

import Musicas from "./pages/Musicas";
import Cultos from "./pages/Cultos";
import Membros from "./pages/Membros";
import Login from "./pages/Login";
import Auditoria from "./pages/Auditoria";
import Perfil from "./pages/Perfil";

function DashboardResumo() {
  const [stats, setStats] = useState({
    musicas: 0,
    membros: 0,
    cultos: 0,
    minhasEscalas: 0,
  });
  const [proximosCultos, setProximosCultos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const urlLimpa = baseUrl.replace(/\/$/, "");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Dentro de DashboardResumo, substitua o Promise.all por isso:
    Promise.all([
      fetch(`${urlLimpa}/api/musicas/`, { headers }),
      fetch(`${urlLimpa}/api/usuarios/`, { headers }),
      fetch(`${urlLimpa}/api/cultos/`, { headers }),
    ])
      .then(async (responses) => {
        if (responses[0].status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/";
          throw new Error("Sessão expirada");
        }
        // Usamos o r.ok para garantir que rotas bloqueadas (403) retornem uma lista vazia e não quebrem o dashboard
        return Promise.all(responses.map((res) => (res.ok ? res.json() : [])));
      })
      .then(([musicas, membros, cultos]) => {
        setStats({
          musicas: musicas.length || 0,
          membros: membros.length || 0,
          cultos: cultos.length || 0,
          minhasEscalas: 0,
        });

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const futuros = cultos
          .filter((culto) => new Date(culto.data) >= hoje)
          .sort((a, b) => new Date(a.data) - new Date(b.data));
        setProximosCultos(futuros.slice(0, 5));
      })
      .catch((error) => console.error("Erro ao carregar dashboard:", error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Carregando painel...</div>;
  }

  return (
    <div>
      <div className="dashboard-grid">
        <div className="lauda-card stat-card">
          <h3>{stats.cultos}</h3>
          <p>Próximos Cultos</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.musicas}</h3>
          <p>Músicas</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.membros}</h3>
          <p>Membros Ativos</p>
        </div>
        <div className="lauda-card stat-card">
          <h3>{stats.minhasEscalas}</h3>
          <p>Minhas Escalas</p>
        </div>
      </div>

      <div className="agenda-section">
        <h2 className="text-primary dashboard-title">
          <Calendar size={24} /> Agenda de Cultos
        </h2>
        <div className="lauda-card">
          {proximosCultos.length > 0 ? (
            proximosCultos.map((culto) => (
              <div key={culto.id} className="agenda-item">
                <span>
                  {new Date(culto.data).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <strong>{culto.nome}</strong>
              </div>
            ))
          ) : (
            <p className="text-muted">Nenhum culto agendado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ---> NOVO: Estado para abrir/fechar as Configurações
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

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
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
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
        <div
          className={`sidebar-overlay ${isMenuOpen ? "open" : ""}`}
          onClick={closeMenu}
        ></div>

        <aside
          className={`lauda-sidebar ${isMenuOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}
        >
          {/* DIVISÃO 1: O TOPO DO MENU */}
          <div className="lauda-sidebar-top">
            <div className="lauda-logo">
              <span className="nav-icon">
                <Music size={28} />
              </span>
              <span className="logo-text">Lauda</span>
            </div>

            <nav className="lauda-nav">
              <NavLink
                to="/"
                className="lauda-nav-item"
                onClick={closeMenu}
                end
              >
                <span className="nav-icon">
                  <Home size={20} />
                </span>
                <span className="nav-text">Dashboard</span>
              </NavLink>
              <NavLink
                to="/musicas"
                className="lauda-nav-item"
                onClick={closeMenu}
              >
                <span className="nav-icon">
                  <Music2 size={20} />
                </span>
                <span className="nav-text">Músicas</span>
              </NavLink>
              <NavLink
                to="/cultos"
                className="lauda-nav-item"
                onClick={closeMenu}
              >
                <span className="nav-icon">
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
                    <span className="nav-icon">
                      <Users size={20} />
                    </span>
                    <span className="nav-text">Membros</span>
                  </NavLink>
                  <NavLink
                    to="/auditoria"
                    className="lauda-nav-item"
                    onClick={closeMenu}
                  >
                    <span className="nav-icon">
                      <Shield size={20} />
                    </span>
                    <span className="nav-text">Auditoria</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          {/* DIVISÃO 2: A BASE DO MENU (Perfil e Configurações) */}
          <div className="lauda-sidebar-bottom">
            <NavLink
              to="/perfil"
              className="lauda-nav-item"
              onClick={closeMenu}
            >
              <span className="nav-icon">
                <User size={20} />
              </span>
              <span className="nav-text">Meu Perfil</span>
            </NavLink>

            {/* O botão de Configurações não é um link, ele abre o Modal! */}
            <button
              className="lauda-nav-item"
              onClick={() => {
                setIsSettingsOpen(true);
                closeMenu();
              }}
            >
              <span className="nav-icon">
                <Settings size={20} />
              </span>
              <span className="nav-text">Configurações</span>
            </button>
          </div>
        </aside>

        <main className="lauda-main-zone">
          <header className="lauda-header">
            <div className="lauda-header-left">
              <button
                className="menu-toggle-btn"
                onClick={toggleMenu}
                title="Alternar Menu"
              >
                <Menu size={22} />
              </button>
              <h1>Ministério de Louvor</h1>
            </div>

            <div className="lauda-user-profile">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="theme-toggle-btn"
                title="Alternar Modo Escuro"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                onClick={handleLogout}
                className="lauda-btn lauda-btn-secondary logout-btn"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </header>

          <div className="lauda-content">
            <Routes>
              <Route path="/" element={<DashboardResumo />} />
              <Route path="/musicas" element={<Musicas />} />
              <Route path="/cultos" element={<Cultos />} />
              <Route path="/membros" element={<Membros />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/auditoria" element={<Auditoria />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* =========================================
          MODAL DE CONFIGURAÇÕES (GERAL)
          ========================================= */}

      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal modal-compact">
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Settings size={22} /> Configurações
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ gap: "1.25rem" }}>
              {/* Bloco 1: Preferências de Interface */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>
                    Modo Escuro (Dark Mode)
                  </span>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="lauda-btn lauda-btn-secondary"
                    style={{ padding: "0.4rem 0.8rem" }}
                  >
                    {isDarkMode ? "Desativar ☀️" : "Ativar 🌙"}
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>
                    Idioma do Sistema
                  </span>
                  <select
                    className="input-field"
                    style={{ width: "auto", padding: "0.3rem 0.5rem" }}
                  >
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>
                    Notificações de Escala
                  </span>
                  {/* Mockup de Checkbox (estilizado como switch no futuro) */}
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                </div>
              </div>

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--gray-200)",
                  margin: "0.5rem 0",
                }}
              />

              {/* Bloco 2: Links Úteis */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    color: "var(--primary-dark)",
                    borderColor: "var(--primary-lightest)",
                    backgroundColor: "var(--primary-lightest)",
                  }}
                  onClick={() => alert("Abrir caixa de sugestão!")}
                >
                  💡 Sugerir Melhorias
                </button>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    border: "none",
                    paddingLeft: "0",
                  }}
                  onClick={() => alert("Página de Termos de Uso")}
                >
                  📄 Termos de Uso
                </button>
                <button
                  className="lauda-btn lauda-btn-secondary"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    border: "none",
                    paddingLeft: "0",
                  }}
                  onClick={() => alert("Página de Política de Privacidade")}
                >
                  🔒 Política de Privacidade
                </button>
              </div>

              {/* Bloco 3: Área de Perigo */}
              <div style={{ marginTop: "0.5rem" }}>
                <button
                  onClick={handleLogout}
                  className="lauda-btn lauda-btn-danger"
                  style={{ width: "100%" }}
                >
                  <LogOut size={16} /> Sair do Sistema
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
